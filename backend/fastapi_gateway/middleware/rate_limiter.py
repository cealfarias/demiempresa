"""
Middleware Asíncrono de Rate Limiting respaldado en Redis (Addendum 19).
Protege la instancia de Render ($7/mes) de ataques HTTP Flood volumétricos y bots.
En caso de exceder el límite, retorna HTTP 429 Too Many Requests con cabecera 'Retry-After'
INMEDIATAMENTE, sin tocar PostgreSQL ni ejecutar lógica de negocio.
"""
import time
import logging
from typing import Tuple, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
import redis.asyncio as aioredis
from config import settings

logger = logging.getLogger("security.ratelimit")

class RedisRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_client: Optional[aioredis.Redis] = None):
        super().__init__(app)
        self.redis = redis_client or aioredis.from_url(
            settings.REDIS_URL,
            max_connections=settings.REDIS_MAX_CONNECTIONS,
            socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
            decode_responses=True
        )

    def get_client_identifier(self, request: Request) -> str:
        """
        Extrae la IP real del cliente detrás del proxy de Cloudflare o Render.
        1. CF-Connecting-IP (Cabecera inyectada y garantizada por Cloudflare)
        2. X-Forwarded-For (Primer valor de la cadena de proxies)
        3. Client Host directo
        """
        cf_ip = request.headers.get("CF-Connecting-IP")
        if cf_ip:
            return cf_ip.strip()

        xff = request.headers.get("X-Forwarded-For")
        if xff:
            return xff.split(",")[0].strip()

        return request.client.host if request.client else "127.0.0.1"

    def match_rate_rule(self, method: str, path: str) -> Optional[Tuple[str, int, int]]:
        """
        Determina la regla de rate limiting aplicable al endpoint:
        Retorna (prefijo_regla, max_requests, ventana_segundos) o None si no aplica límite estricto.
        """
        norm_path = path.rstrip("/")

        # a) Creación de viajes (POST /api/v1/trips): 3 peticiones por 60 segundos
        if method == "POST" and norm_path in ["/api/v1/trips", "/api/trips"]:
            return ("trip_create", settings.TRIP_RATE_LIMIT_REQUESTS, settings.TRIP_RATE_LIMIT_WINDOW_SECONDS)

        # b) Handshake de WebSockets (/ws): 1 intento cada 5 segundos
        if norm_path.startswith("/ws"):
            return ("ws_handshake", settings.WS_HANDSHAKE_LIMIT_REQUESTS, settings.WS_HANDSHAKE_WINDOW_SECONDS)

        # c) Autenticación y Verificación (/api/v1/auth/*): 2 intentos cada 10 minutos (600s)
        if norm_path.startswith("/api/v1/auth") or norm_path.startswith("/api/users/register"):
            return ("auth_verify", settings.AUTH_RATE_LIMIT_REQUESTS, settings.AUTH_RATE_LIMIT_WINDOW_SECONDS)

        return None

    async def check_rate_limit(self, client_id: str, rule_name: str, max_requests: int, window_seconds: int) -> Tuple[bool, int]:
        """
        Algoritmo atómico Fixed Window / Sliding Window en Redis:
        Usa INCR + EXPIRE para garantizar velocidad sub-milisegundo.
        Retorna: (is_allowed: bool, retry_after_seconds: int)
        """
        redis_key = f"ratelimit:{rule_name}:{client_id}"
        try:
            # Pipeline atómico para evitar race conditions
            pipe = self.redis.pipeline()
            pipe.incr(redis_key)
            pipe.ttl(redis_key)
            count, ttl = await pipe.execute()

            if count == 1 or ttl == -1:
                # Primera petición en la ventana: asignar TTL
                await self.redis.expire(redis_key, window_seconds)
                ttl = window_seconds

            if count > max_requests:
                # Límite superado
                retry_after = ttl if ttl > 0 else window_seconds
                return False, retry_after

            return True, 0

        except Exception as redis_err:
            # Resiliencia: si Redis falla temporalmente, loggear y permitir paso (Fail-Open suave)
            logger.warning(f"[RateLimiter] Error de conexión Redis: {redis_err}")
            return True, 0

    async def dispatch(self, request: Request, call_next):
        method = request.method
        path = request.url.path

        # Identificar si la ruta tiene restricción perimetral
        rule = self.match_rate_rule(method, path)
        if not rule:
            return await call_next(request)

        rule_name, max_requests, window_seconds = rule
        client_id = self.get_client_identifier(request)

        # Dispositivo / pasajero complementario en cabecera si existe
        device_fingerprint = request.headers.get("X-Device-Fingerprint")
        if device_fingerprint:
            client_id = f"{client_id}:{device_fingerprint[:32]}"

        is_allowed, retry_after = await self.check_rate_limit(client_id, rule_name, max_requests, window_seconds)

        if not is_allowed:
            logger.warning(f"🚨 [429 BLOCKED] IP: {client_id} excedió límite en {method} {path} ({rule_name}). Retry-After: {retry_after}s")
            # RESPUESTA INMEDIATA HTTP 429: CERO lógica de negocio, CERO consultas SQL
            response_payload = {
                "error": "Too Many Requests",
                "detail": f"Límite de tasa excedido para {rule_name}. Máximo {max_requests} peticiones por ventana.",
                "retry_after_seconds": retry_after,
                "timestamp": int(time.time())
            }
            return JSONResponse(
                status_code=429,
                content=response_payload,
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Window": f"{window_seconds}s"
                }
            )

        # Si está permitido, continuar en la cadena de ejecución
        return await call_next(request)
