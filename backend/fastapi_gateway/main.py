"""
FastAPI Security Gateway - demiempresa.online
Blindaje y Defensa Perimetral en Render ($7/mes Always-On) conforme al Addendum 19.
Integra:
- Middleware de Rate Limiting en memoria (Redis Token Bucket / Sliding Window)
- Lógica Anti-Sabotaje y Cooldown de 5 minutos
- Ofuscación de geolocalización a 2 decimales en subasta pública
- Aislamiento CORS estricto y saneamiento de WebSockets ante inactividad (10s timeout)
- Soporte nativo para modalidad de viaje 'Ida y Vuelta'
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import redis.asyncio as aioredis

from config import settings
from middleware.rate_limiter import RedisRateLimitMiddleware
from routers import trips, websockets

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("security.gateway")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización del pool de Redis
    logger.info("🛡️ Iniciando Gateway de Seguridad y Blindaje Perimetral (Addendum 19)...")
    redis_conn = aioredis.from_url(
        settings.REDIS_URL,
        max_connections=settings.REDIS_MAX_CONNECTIONS,
        socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
        decode_responses=True
    )
    try:
        await redis_conn.ping()
        logger.info("✅ Conexión con Redis establecida exitosamente.")
    except Exception as e:
        logger.warning(f"⚠️ Redis no disponible al iniciar (se usará modo resiliente): {e}")
    finally:
        await redis_conn.close()

    yield

    logger.info("🛑 Gateway de Seguridad detenido.")


app = FastAPI(
    title="demiempresa.online Security Gateway",
    description="Perimeter defense and rate-limiting gateway for Render ($7/mo Always-On) - Addendum 19",
    version="1.0.0",
    lifespan=lifespan
)

# 1. POLÍTICAS DE RED: CORS ESTRICTO (Aislamiento de orígenes autorizados)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Window"]
)

# 2. CAPA DE RATE LIMITING EN MEMORIA (REDIS)
app.add_middleware(RedisRateLimitMiddleware)

# 3. MANEJADOR ESTRICTO DE ERRORES DE VALIDACIÓN (PYDANTIC V2)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Rechazo inmediato de campos no permitidos o sobredimensionados antes de procesar
    errors = exc.errors()
    clean_errors = [
        {"field": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
        for err in errors
    ]
    logger.warning(f"⛔ [VALIDATION REJECTED] IP: {request.client.host if request.client else 'unknown'} | Errores: {clean_errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "PAYLOAD_VALIDATION_FAILED",
            "detail": "Entrada no válida, campo inesperado o valor fuera de límites permitidos.",
            "violations": clean_errors
        }
    )

# 4. REGISTRO DE ROUTERS
app.include_router(trips.router)
app.include_router(websockets.router)

# 5. HEALTH CHECK INFORMATIVO
@app.get("/api/health", tags=["Monitoring"])
async def health_check():
    return {
        "status": "ONLINE",
        "service": "demiempresa.online Security Gateway (FastAPI + Redis)",
        "perimeter_defense": "Active (Addendum 19)",
        "environment": settings.ENVIRONMENT,
        "limits": {
            "trip_creation": f"{settings.TRIP_RATE_LIMIT_REQUESTS} req / {settings.TRIP_RATE_LIMIT_WINDOW_SECONDS}s",
            "ws_handshake": f"{settings.WS_HANDSHAKE_LIMIT_REQUESTS} req / {settings.WS_HANDSHAKE_WINDOW_SECONDS}s",
            "auth_verify": f"{settings.AUTH_RATE_LIMIT_REQUESTS} req / {settings.AUTH_RATE_LIMIT_WINDOW_SECONDS}s",
            "anti_sabotage_cooldown": f"{settings.SABOTAGE_COOLDOWN_SECONDS}s tras {settings.SABOTAGE_CONSECUTIVE_CANCELLATIONS} cancelaciones"
        },
        "features": {
            "geolocation_obfuscation": "2 decimals (~1.1 km) in public auction",
            "websocket_idle_timeout": f"{settings.WS_IDLE_TIMEOUT_SECONDS}s cleanup",
            "round_trip_support": True
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
