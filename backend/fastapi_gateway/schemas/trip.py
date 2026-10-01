"""
Esquemas Pydantic v2 estrictos para blindaje de API (Addendum 19).
Rechaza automáticamente entradas sobredimensionadas o campos inesperados (extra='forbid').
Incluye soporte nativo para modalidad de viaje 'Ida y Vuelta' (Round Trip).
"""
from typing import Optional, Literal
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, field_validator

class CreateTripRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        populate_by_name=True
    )

    passenger_id: str = Field(
        ...,
        min_length=3,
        max_length=64,
        description="Identificador único del pasajero o fingerprint del dispositivo"
    )

    service_type: Literal["PASSENGER", "PACKAGE"] = Field(
        default="PASSENGER",
        description="Tipo de servicio: viaje de pasajero o envío de encomienda"
    )

    transport_type: Literal["CAR", "MOTO"] = Field(
        default="CAR",
        description="Modalidad de transporte: vehículo sedán/hatchback o motocicleta"
    )

    origin_address: str = Field(
        ...,
        min_length=3,
        max_length=255,
        description="Dirección o punto de recogida"
    )

    # Coordenadas geográficas estrictas delimitadas a la República de El Salvador
    origin_lat: float = Field(
        ...,
        ge=13.00,
        le=14.50,
        description="Latitud de origen dentro del territorio salvadoreño"
    )
    origin_lng: float = Field(
        ...,
        ge=-90.20,
        le=-87.60,
        description="Longitud de origen dentro del territorio salvadoreño"
    )

    destination_address: str = Field(
        ...,
        min_length=3,
        max_length=255,
        description="Dirección o punto de destino"
    )
    destination_lat: float = Field(
        ...,
        ge=13.00,
        le=14.50,
        description="Latitud de destino dentro de El Salvador"
    )
    destination_lng: float = Field(
        ...,
        ge=-90.20,
        le=-87.60,
        description="Longitud de destino dentro de El Salvador"
    )

    destination_municipality: str = Field(
        default="SAN SALVADOR",
        max_length=100,
        description="Municipio salvadoreño para subasta y feed B2B"
    )

    proposed_fare: Decimal = Field(
        ...,
        ge=Decimal("1.00"),
        le=Decimal("300.00"),
        decimal_places=2,
        description="Tarifa ofertada en dólares USD (100% efectivo)"
    )

    # NUEVO REQUERIMIENTO: Modalidad 'Ida y Vuelta'
    is_round_trip: bool = Field(
        default=False,
        description="Indica si el viaje es de modalidad Ida y Vuelta (Viaje Redondo)"
    )
    round_trip_wait_minutes: int = Field(
        default=0,
        ge=0,
        le=240,
        description="Minutos de espera solicitados en el punto de destino antes del retorno (0 a 4 horas)"
    )

    # Preferencias de viaje
    air_conditioning: bool = Field(
        default=True,
        description="Preferencia de aire acondicionado en cabina"
    )
    passengers: int = Field(
        default=1,
        ge=1,
        le=8,
        description="Cantidad de pasajeros (1 en moto, hasta 4 en auto, 5+ van)"
    )
    extra_luggage: bool = Field(
        default=False,
        description="Carga de equipaje voluminoso en baúl"
    )
    pet_friendly: bool = Field(
        default=False,
        description="Transporte de mascota en cabina"
    )

    package_details: Optional[str] = Field(
        default=None,
        max_length=300,
        description="Descripción corta si es servicio de paquete/encomienda"
    )

    payment_timing: Literal["AT_ORIGIN", "AT_DESTINATION"] = Field(
        default="AT_ORIGIN",
        description="Momento del cobro en efectivo"
    )

    @field_validator("passengers")
    @classmethod
    def validate_passengers_for_transport(cls, v: int, info):
        # En modo MOTO solo se permite 1 pasajero
        transport = info.data.get("transport_type")
        if transport == "MOTO" and v > 1:
            raise ValueError("En motocicleta únicamente se permite 1 pasajero.")
        return v

    @field_validator("air_conditioning")
    @classmethod
    def validate_ac_for_moto(cls, v: bool, info):
        transport = info.data.get("transport_type")
        if transport == "MOTO" and v:
            # En moto no aplica aire acondicionado
            return False
        return v


class TripCancelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    trip_id: str = Field(..., min_length=3, max_length=64)
    passenger_id: str = Field(..., min_length=3, max_length=64)
    reason: Optional[str] = Field(default=None, max_length=200)
    had_active_offers: bool = Field(
        default=False,
        description="Indica si el viaje ya había recibido ofertas de choferes antes de ser cancelado"
    )


class AuthVerificationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    dui: str = Field(
        ...,
        pattern=r"^\d{8}-\d{1}$",
        description="Número de DUI salvadoreño con guión obligatorio (ej. 01234567-8)"
    )
    phone: str = Field(
        ...,
        pattern=r"^\d{8}$",
        description="Número telefónico salvadoreño de 8 dígitos (ej. 71234567)"
    )
    full_name: str = Field(..., min_length=3, max_length=120)
    referrer_code: Optional[str] = Field(default=None, max_length=64)
