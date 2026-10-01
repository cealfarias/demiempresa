"""
Router de WebSockets con Control de Saturación y Limpieza Agresiva (Addendum 19).
Optimizado para el pool de memoria de Render ($7/mes, 512MB RAM):
- Handshake rate limited (1 intento / 5 segundos por IP)
- Keepalive ping/pong agresivo con cierre automático ante inactividad > 10 segundos
- Ofuscación de geolocalización en canal de subasta público a choferes (2 decimales)
- Soporte de modalidad Ida y Vuelta (Round Trip)
"""
import asyncio
import time
import json
import logging
from typing import Dict, Set, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
import redis.asyncio as aioredis
from config import settings
from services.anti_sabotage import AntiSabotageService

logger = logging.getLogger("security.websockets")

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    """Gestor de sockets con contención de fugas de memoria y limpieza agresiva"""
    def __init__(self):
        # Mapeo: client_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # Mapeo: driver_id -> client_id
        self.driver_sockets: Dict[str, str] = {}
        # Mapeo: trip_id -> Set[client_id]
        self.trip_rooms: Dict[str, Set[str]] = {}
        # Registro de último heartbeat por socket: client_id -> timestamp
        self.last_activity: Dict[str, float] = {}

    async def connect(self, websocket: WebSocket, client_id: str, role: str = "PASSENGER", driver_profile_id: Optional[str] = None):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.last_activity[client_id] = time.time()

        if role == "DRIVER" and driver_profile_id:
            self.driver_sockets[driver_profile_id] = client_id

        logger.info(f"🔌 [WS CONNECT] Client {client_id} (Role: {role}). Total activos: {len(self.active_connections)}")

    def update_activity(self, client_id: str):
        self.last_activity[client_id] = time.time()

    def disconnect(self, client_id: str):
        # Limpieza atómica de memoria para no agotar el pool de Render
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.last_activity:
            del self.last_activity[client_id]

        for driver_id, c_id in list(self.driver_sockets.items()):
            if c_id == client_id:
                del self.driver_sockets[driver_id]

        for trip_id, members in list(self.trip_rooms.items()):
            members.discard(client_id)
            if not members:
                del self.trip_rooms[trip_id]

        logger.info(f"🔌 [WS DISCONNECT] Client {client_id} liberado. Restantes: {len(self.active_connections)}")

    async def broadcast_to_drivers_obfuscated(self, trip_data: dict, nearby_driver_ids: list):
        """
        Emite la solicitud de viaje a choferes cercanos en radio de 1 km
        con COORDENADAS OFUSCADAS a 2 decimales para evitar el rastreo de pasajeros.
        """
        raw_lat = trip_data.get("origin_lat", 13.70)
        raw_lng = trip_data.get("origin_lng", -89.22)
        obf_lat, obf_lng = AntiSabotageService.obfuscate_coordinates(raw_lat, raw_lng)

        dest_raw_lat = trip_data.get("destination_lat", 13.67)
        dest_raw_lng = trip_data.get("destination_lng", -89.28)
        dest_obf_lat, dest_obf_lng = AntiSabotageService.obfuscate_coordinates(dest_raw_lat, dest_raw_lng)

        auction_message = {
            "event": "trip:new_request",
            "payload": {
                "trip_id": trip_data["trip_id"],
                "service_type": trip_data.get("service_type", "PASSENGER"),
                "transport_type": trip_data.get("transport_type", "CAR"),
                # Modalidad Ida y Vuelta
                "is_round_trip": trip_data.get("is_round_trip", False),
                "round_trip_wait_minutes": trip_data.get("round_trip_wait_minutes", 0),
                "origin_address": trip_data.get("origin_address"),
                # Coordenadas ofuscadas para privacidad y anti-scraping
                "origin_lat_obfuscated": obf_lat,
                "origin_lng_obfuscated": obf_lng,
                "destination_address": trip_data.get("destination_address"),
                "destination_lat_obfuscated": dest_obf_lat,
                "destination_lng_obfuscated": dest_obf_lng,
                "destination_municipality": trip_data.get("destination_municipality", "SAN SALVADOR"),
                "proposed_fare": str(trip_data.get("proposed_fare", "2.50")),
                "passengers": trip_data.get("passengers", 1),
                "air_conditioning": trip_data.get("air_conditioning", True),
                "expires_in_seconds": 10
            }
        }

        for driver_id in nearby_driver_ids:
            client_socket_id = self.driver_sockets.get(driver_id)
            if client_socket_id and client_socket_id in self.active_connections:
                try:
                    ws = self.active_connections[client_socket_id]
                    await ws.send_json(auction_message)
                except Exception as err:
                    logger.warning(f"Error enviando subasta a chofer {driver_id}: {err}")

    async def send_private_assignment(self, driver_id: str, exact_trip_data: dict):
        """
        Envía las coordenadas EXACTAS únicamente al chofer ganador
        tras la aceptación atómica en Redis.
        """
        client_socket_id = self.driver_sockets.get(driver_id)
        if client_socket_id and client_socket_id in self.active_connections:
            ws = self.active_connections[client_socket_id]
            await ws.send_json({
                "event": "trip:assigned",
                "payload": exact_trip_data
            })

manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_gateway(
    websocket: WebSocket,
    client_id: str = Query(..., min_length=3, max_length=64),
    role: str = Query("PASSENGER", pattern="^(PASSENGER|DRIVER)$"),
    driver_profile_id: Optional[str] = Query(None, max_length=64)
):
    # 1. VERIFICACIÓN DE RATE LIMIT EN HANDSHAKE (1 conexión / 5s por IP)
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    client_ip = websocket.client.host if websocket.client else "127.0.0.1"
    headers = dict(websocket.headers)
    if "cf-connecting-ip" in headers:
        client_ip = headers["cf-connecting-ip"]

    handshake_key = f"ratelimit:ws_handshake:{client_ip}"
    try:
        count = await redis_client.incr(handshake_key)
        if count == 1:
            await redis_client.expire(handshake_key, settings.WS_HANDSHAKE_WINDOW_SECONDS)
        elif count > settings.WS_HANDSHAKE_LIMIT_REQUESTS:
            logger.warning(f"🚨 [WS 429 REJECTED] IP {client_ip} excedió handshake limit. Cerrando socket.")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Rate limit handshake exceeded")
            return
    except Exception as err:
        logger.warning(f"[WS RateLimit Handshake notice]: {err}")
    finally:
        await redis_client.close()

    # 2. CONECTAR Y REGISTRAR EN EL POOL
    await manager.connect(websocket, client_id, role, driver_profile_id)

    # 3. TAREA DE KEEPALIVE AGRESIVO (Liberación de recursos ante inactividad > 10s)
    async def idle_watchdog():
        try:
            while True:
                await asyncio.sleep(settings.WS_PING_INTERVAL_SECONDS)
                last = manager.last_activity.get(client_id, time.time())
                now = time.time()
                if now - last > settings.WS_IDLE_TIMEOUT_SECONDS:
                    logger.warning(f"⏰ [WS TIMEOUT] Client {client_id} inactivo por >10s. Forzando cierre para proteger RAM.")
                    await websocket.close(code=status.WS_1000_NORMAL_CLOSURE, reason="Idle timeout (10s)")
                    break
                # Emitir ping liviano
                try:
                    await websocket.send_json({"type": "ping", "ts": int(now)})
                except Exception:
                    break
        except asyncio.CancelledError:
            pass

    watchdog_task = asyncio.create_task(idle_watchdog())

    try:
        while True:
            # Esperar mensajes entrantes del cliente
            raw_data = await websocket.receive_text()
            manager.update_activity(client_id)

            try:
                msg = json.loads(raw_data)
                event = msg.get("event")
                payload = msg.get("payload", {})

                if msg.get("type") == "pong":
                    # Heartbeat confirmado
                    continue

                if event == "client:ping":
                    await websocket.send_json({"type": "pong", "ts": int(time.time())})
                    continue

            except json.JSONDecodeError:
                logger.warning(f"Formato no JSON recibido de {client_id}")

    except WebSocketDisconnect:
        logger.info(f"Cliente desconectado normalmente: {client_id}")
    except Exception as exc:
        logger.warning(f"Excepción en socket {client_id}: {exc}")
    finally:
        watchdog_task.cancel()
        manager.disconnect(client_id)
