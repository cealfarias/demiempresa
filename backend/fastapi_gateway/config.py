"""
Configuración centralizada y variables de entorno para el blindaje de seguridad
demiempresa.online en Render ($7/mes Always-On).
"""
import os
from typing import List
from pydantic_settings import BaseSettings

class SecuritySettings(BaseSettings):
    # Entorno
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    PORT: int = int(os.getenv("PORT", "10000"))

    # Redis en Render / Externo
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_MAX_CONNECTIONS: int = int(os.getenv("REDIS_MAX_CONNECTIONS", "20"))
    REDIS_SOCKET_TIMEOUT: float = float(os.getenv("REDIS_SOCKET_TIMEOUT", "2.0"))

    # PostgreSQL (Solo consultado si pasa la defensa perimetral)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://demiempresa_user:demiempresa_pass@localhost:5432/demiempresa_db"
    )

    # 1. Parámetros de Rate Limiting en Redis (Addendum 19)
    # a) Creación de viajes: 3 req / 60 segundos por IP/dispositivo
    TRIP_RATE_LIMIT_REQUESTS: int = 3
    TRIP_RATE_LIMIT_WINDOW_SECONDS: int = 60

    # b) Handshake WebSockets: 1 intento / 5 segundos por IP
    WS_HANDSHAKE_LIMIT_REQUESTS: int = 1
    WS_HANDSHAKE_WINDOW_SECONDS: int = 5

    # c) Auth / Verificación: 2 intentos / 600 segundos (10 min)
    AUTH_RATE_LIMIT_REQUESTS: int = 2
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 600

    # 2. Lógica Anti-Sabotaje (Cooldown)
    SABOTAGE_CONSECUTIVE_CANCELLATIONS: int = 2
    SABOTAGE_COOLDOWN_SECONDS: int = 300  # 5 minutos

    # 3. Timeouts de WebSockets para proteger la memoria de Render (512MB RAM)
    WS_PING_INTERVAL_SECONDS: float = 4.0
    WS_PING_TIMEOUT_SECONDS: float = 4.0
    WS_IDLE_TIMEOUT_SECONDS: float = 10.0  # Cierre automático tras 10s de inactividad

    # 4. Políticas de Red y Aislamiento CORS Estricto
    CORS_ALLOWED_ORIGINS: List[str] = [
        "https://viajes.demiempresa.online",
        "https://demiempresa.online",
        "https://driver.demiempresa.online",
        "android-app://com.demiempresa.driver",
        "http://localhost:5173",
        "http://localhost:3000"
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = SecuritySettings()
