"""
Servicio Anti-Sabotaje y Cooldown en Negocio (Addendum 19).
1. Protege a los conductores de usuarios o bots que crean viajes falsos y cancelan repetidamente.
   - Si un usuario cancela 2 viajes consecutivos tras recibir ofertas de choferes,
     se le aplica automáticamente un bloqueo temporal (cooldown) de 5 minutos en Redis.
2. Ofuscación de geolocalización: Redondea coordenadas a 2 decimales (~1.1 km de precisión)
   en el canal público de subasta para evitar scraping y rastreo de pasajeros.
"""
import logging
from typing import Tuple, Dict, Any
import redis.asyncio as aioredis
from config import settings

logger = logging.getLogger("security.anti_sabotage")

class AntiSabotageService:
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client

    async def check_passenger_cooldown(self, passenger_id: str) -> Tuple[bool, int]:
        """
        Verifica si el pasajero tiene un cooldown de sabotaje activo.
        Retorna (is_blocked: bool, seconds_remaining: int)
        """
        cooldown_key = f"sabotage:cooldown:{passenger_id}"
        ttl = await self.redis.ttl(cooldown_key)
        if ttl > 0:
            return True, ttl
        return False, 0

    async def record_trip_cancellation(self, passenger_id: str, had_active_offers: bool) -> Dict[str, Any]:
        """
        Registra la cancelación de un viaje en Redis.
        Si el viaje fue cancelado tras haber recibido ofertas (sabotaje al chofer),
        se incrementa el contador consecutivo con TTL de 20 minutos (1200s).
        Al llegar a 2 cancelaciones consecutivas, se activa el cooldown de 5 minutos (300s).
        """
        if not had_active_offers:
            # Cancelación antes de que choferes ofertaran (no se penaliza severamente)
            return {"cooldown_triggered": False, "cancellations_count": 0}

        cancel_key = f"sabotage:cancel_count:{passenger_id}"
        cooldown_key = f"sabotage:cooldown:{passenger_id}"

        # Incrementar contador de cancelaciones con TTL de 20 minutos
        pipe = self.redis.pipeline()
        pipe.incr(cancel_key)
        pipe.expire(cancel_key, 1200)
        results = await pipe.execute()
        consecutive_cancellations = results[0]

        logger.warning(
            f"⚠️ [ANTI-SABOTAJE] Pasajero {passenger_id} canceló viaje con ofertas activas. "
            f"Cancelaciones consecutivas: {consecutive_cancellations}/{settings.SABOTAGE_CONSECUTIVE_CANCELLATIONS}"
        )

        if consecutive_cancellations >= settings.SABOTAGE_CONSECUTIVE_CANCELLATIONS:
            # ACTIVAR COOLDOWN DE 5 MINUTOS (300 segundos)
            await self.redis.set(cooldown_key, "ACTIVE", ex=settings.SABOTAGE_COOLDOWN_SECONDS)
            # Resetear contador de cancelaciones para el siguiente ciclo
            await self.redis.delete(cancel_key)

            logger.error(f"🛑 [COOLDOWN ACTIVADO] Pasajero {passenger_id} bloqueado por {settings.SABOTAGE_COOLDOWN_SECONDS}s.")
            return {
                "cooldown_triggered": True,
                "cooldown_seconds": settings.SABOTAGE_COOLDOWN_SECONDS,
                "cancellations_count": consecutive_cancellations
            }

        return {
            "cooldown_triggered": False,
            "cancellations_count": consecutive_cancellations
        }

    async def reset_cancellation_counter_on_success(self, passenger_id: str):
        """
        Cuando un pasajero completa o acepta un viaje con éxito, se restablece
        su historial de cancelaciones en Redis a 0.
        """
        cancel_key = f"sabotage:cancel_count:{passenger_id}"
        await self.redis.delete(cancel_key)

    @staticmethod
    def obfuscate_coordinates(lat: float, lng: float) -> Tuple[float, float]:
        """
        Ofuscación perimetral de geolocalización:
        En el canal público de subasta por WebSockets para conductores cercanos,
        se redondean las coordenadas a 2 decimales (~1.1 km de precisión urbana).
        Esto impide que bots o actores maliciosos rastreen de forma métrica continua
        la ubicación exacta del pasajero antes de que el viaje sea asignado atómicamente.
        """
        return round(lat, 2), round(lng, 2)
