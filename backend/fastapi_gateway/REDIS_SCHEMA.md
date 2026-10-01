# 📚 Esquema de Claves, Estructuras y TTLs en Redis (Addendum 19)
**Plataforma demiempresa.online — Entorno Render Always-On ($7/mes)**

Este documento detalla la arquitectura de claves en memoria en Redis para la mitigación perimetral de ataques DDoS, control de saturación de WebSockets, lógica anti-sabotaje y coordinación de subastas.

---

## 1. Capa de Rate Limiting (Middlewares y Handshakes)

| Patrón de Clave | Tipo | TTL | Propósito | Regla de Tráfico |
|---|---|---|---|---|
| `ratelimit:trip_create:{client_id}` | `String` (Entero) | `60s` | Control de creación de viajes por IP / dispositivo | Máx. 3 req / 60s. Si excede $\rightarrow$ HTTP 429 con `Retry-After`. |
| `ratelimit:ws_handshake:{client_id}` | `String` (Entero) | `5s` | Freno a tormentas de reconexión WebSocket (`/ws`) | Máx. 1 intento / 5s. Si excede $\rightarrow$ Cierre `WS_1008_POLICY_VIOLATION`. |
| `ratelimit:auth_verify:{client_id}` | `String` (Entero) | `600s` (10 min) | Blindaje contra fuerza bruta de DUI y teléfonos | Máx. 2 req / 10 min. Si excede $\rightarrow$ HTTP 429 con `Retry-After`. |

### Operación Atómica en Redis:
```text
MULTI
INCR ratelimit:{rule}:{client_id}
TTL ratelimit:{rule}:{client_id}
EXEC
```
*Si el valor resultante es 1 o el TTL es -1, se ejecuta `EXPIRE key {window_seconds}`.*

---

## 2. Capa Anti-Sabotaje y Cooldown de Pasajeros

| Patrón de Clave | Tipo | TTL | Propósito | Comportamiento |
|---|---|---|---|---|
| `sabotage:cancel_count:{passenger_id}` | `String` (Entero) | `1200s` (20 min) | Contador de cancelaciones consecutivas tras recibir ofertas | Si alcanza 2 cancelaciones $\rightarrow$ se elimina la clave y se crea el cooldown. |
| `sabotage:cooldown:{passenger_id}` | `String` ("ACTIVE") | `300s` (5 min) | Bloqueo temporal por sabotaje a choferes | Bloquea inmediatamente `POST /api/v1/trips` con HTTP 429 / 403 y devuelve los segundos restantes. |

### Ciclo de Vida:
1. Pasajero cancela solicitud teniendo ofertas activas de conductores $\rightarrow$ `INCR sabotage:cancel_count:{passenger_id}` (TTL 20 min).
2. Si `cancel_count >= 2`:
   ```text
   SET sabotage:cooldown:{passenger_id} "ACTIVE" EX 300
   DEL sabotage:cancel_count:{passenger_id}
   ```
3. Cualquier intento de crear viaje durante esos 300s consulta `TTL sabotage:cooldown:{passenger_id}` y rechaza sin tocar la base de datos PostgreSQL.
4. Si el pasajero completa o acepta un viaje con éxito $\rightarrow$ se ejecuta `DEL sabotage:cancel_count:{passenger_id}` para reiniciar su historial.

---

## 3. Subasta Atómica y Coordinación en Tiempo Real

| Patrón de Clave | Tipo | TTL | Propósito | Comportamiento |
|---|---|---|---|---|
| `trip:active:{trip_id}` | `Hash` | `120s` | Metadatos volátiles del viaje en subasta activa | Contiene tarifa, origen, destino, modalidad Ida y Vuelta (`is_round_trip`) y minutos de espera. |
| `trip:lock:{trip_id}` | `String` ("UNLOCKED" / "LOCKED") | `30s` | Cerrajero atómico de asignación exclusiva | Evita condiciones de carrera si dos choferes intentan tomar el mismo viaje. |
| `trip:offers:{trip_id}` | `Hash` | `10s` | Ofertas de conductores con TTL estricto | Las ofertas expiran automáticamente a los 10 segundos. |
| `driver:geo:locations` | `ZSet` (GEO) | `N/A` (Persistente) | Coordenadas GPS de choferes para búsqueda en 1 km | `GEOADD` cada 3-5s. `GEORADIUSBYMEMBER` / `GEOSEARCH` a 1.0 km. |

---

## 4. Uso de Memoria y Saneamiento en Render ($7/mes)
* **Consumo promedio por clave:** Menos de 200 bytes.
* **10,000 claves simultáneas de rate limiting:** Menos de 3 MB de memoria RAM.
* **Estrategia de expulsión configurada:** `volatile-ttl` o `allkeys-lru` con maxmemory de 100 MB para no superar el límite de la instancia Always-On.
