"""
Rutas API REST para Creación, Cancelación y Gestión de Viajes (Addendum 19).
Integra verificación de cooldown anti-sabotaje, validación estricta y soporte para Ida y Vuelta.
"""
import time
import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
import redis.asyncio as aioredis
from config import settings
from schemas.trip import CreateTripRequest, TripCancelRequest, AuthVerificationRequest
from services.anti_sabotage import AntiSabotageService

logger = logging.getLogger("security.trips_api")

router = APIRouter(prefix="/api/v1", tags=["Trips & Auth"])

async def get_redis_client():
    client = aioredis.from_url(
        settings.REDIS_URL,
        max_connections=settings.REDIS_MAX_CONNECTIONS,
        decode_responses=True
    )
    try:
        yield client
    finally:
        await client.close()

# 1. CREACIÓN DE VIAJES (POST /api/v1/trips)
# Protegido por: Rate limit en middleware (3 req/min) + Cooldown Anti-Sabotaje (5 min)
@router.post("/trips", status_code=status.HTTP_201_CREATED)
async def create_trip(
    trip_data: CreateTripRequest,
    redis: aioredis.Redis = Depends(get_redis_client)
) -> Dict[str, Any]:
    anti_sabotage = AntiSabotageService(redis)

    # 1. VERIFICAR COOLDOWN ACTIVO EN REDIS (Anti-Sabotaje a conductores)
    is_blocked, seconds_remaining = await anti_sabotage.check_passenger_cooldown(trip_data.passenger_id)
    if is_blocked:
        logger.warning(
            f"🛑 [BLOQUEADO POR COOLDOWN] Pasajero {trip_data.passenger_id} intentó crear viaje. "
            f"Faltan {seconds_remaining}s de penalización por cancelaciones consecutivas."
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "SABOTAGE_COOLDOWN_ACTIVE",
                "message": "Has cancelado 2 solicitudes consecutivas tras recibir ofertas. Por seguridad de los choferes, tu cuenta tiene un bloqueo temporal.",
                "cooldown_seconds_remaining": seconds_remaining,
                "retry_after": seconds_remaining
            },
            headers={"Retry-After": str(seconds_remaining)}
        )

    # 2. PROCESAR CREACIÓN DEL VIAJE (Incluyendo Ida y Vuelta)
    generated_trip_id = f"trip-{int(time.time() * 1000)}"

    # Cálculo informativo de ida y vuelta
    round_trip_info = {
        "is_round_trip": trip_data.is_round_trip,
        "round_trip_wait_minutes": trip_data.round_trip_wait_minutes,
        "wait_surcharge_usd": round(trip_data.round_trip_wait_minutes * 0.05, 2) if trip_data.is_round_trip else 0.00
    }

    # Coordenadas ofuscadas para difusión inicial en subasta
    obf_origin_lat, obf_origin_lng = AntiSabotageService.obfuscate_coordinates(
        trip_data.origin_lat, trip_data.origin_lng
    )

    # Almacenar estado de viaje en Redis con TTL de subasta (60 segundos)
    trip_cache_key = f"trip:active:{generated_trip_id}"
    await redis.hset(trip_cache_key, mapping={
        "trip_id": generated_trip_id,
        "passenger_id": trip_data.passenger_id,
        "service_type": trip_data.service_type,
        "transport_type": trip_data.transport_type,
        "proposed_fare": str(trip_data.proposed_fare),
        "is_round_trip": "1" if trip_data.is_round_trip else "0",
        "round_trip_wait_minutes": str(trip_data.round_trip_wait_minutes),
        "status": "AUCTION_ACTIVE"
    })
    await redis.expire(trip_cache_key, 120)

    logger.info(
        f"✅ [VIAJE CREADO] ID: {generated_trip_id} | Pasajero: {trip_data.passenger_id} | "
        f"Transporte: {trip_data.transport_type} | Ida y Vuelta: {trip_data.is_round_trip} | Tarifa: ${trip_data.proposed_fare}"
    )

    return {
        "success": True,
        "trip_id": generated_trip_id,
        "status": "AUCTION_ACTIVE",
        "proposed_fare": str(trip_data.proposed_fare),
        "round_trip": round_trip_info,
        "auction_dispatch": {
            "origin_lat_obfuscated": obf_origin_lat,
            "origin_lng_obfuscated": obf_origin_lng,
            "destination_municipality": trip_data.destination_municipality,
            "offer_ttl_seconds": 10
        }
    }


# 2. CANCELACIÓN DE VIAJE (POST /api/v1/trips/cancel)
# Registra cancelaciones con ofertas para disparar el cooldown automático
@router.post("/trips/cancel")
async def cancel_trip(
    cancel_data: TripCancelRequest,
    redis: aioredis.Redis = Depends(get_redis_client)
) -> Dict[str, Any]:
    anti_sabotage = AntiSabotageService(redis)

    result = await anti_sabotage.record_trip_cancellation(
        passenger_id=cancel_data.passenger_id,
        had_active_offers=cancel_data.had_active_offers
    )

    return {
        "success": True,
        "trip_id": cancel_data.trip_id,
        "status": "CANCELLED",
        "anti_sabotage_status": result
    }


# 3. VERIFICACIÓN / REGISTRO DE USUARIO (POST /api/v1/auth/register)
# Protegido por rate limit en middleware (2 intentos cada 10 min)
@router.post("/auth/register")
async def register_passenger(
    auth_data: AuthVerificationRequest,
    redis: aioredis.Redis = Depends(get_redis_client)
) -> Dict[str, Any]:
    # Lógica de registro limpio con DUI verificado
    user_id = f"usr-{auth_data.dui.replace('-', '')}"
    return {
        "success": True,
        "user_id": user_id,
        "dui": auth_data.dui,
        "full_name": auth_data.full_name,
        "welcome_credit_usd": 1.00
    }
