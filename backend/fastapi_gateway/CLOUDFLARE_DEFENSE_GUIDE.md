# 🛡️ Guía de Blindaje Perimetral DNS y WAF con Cloudflare (Addendum 19)
**Dominio:** `demiempresa.online` / `viajes.demiempresa.online`  
**Destino de Origen:** Web Service en Render ($7/mes Always-On)

---

## 1. Configuración de Registros DNS (Modo Proxy / Nube Naranja)

Para que el tráfico malicioso no llegue directamente a la infraestructura de Render, todos los registros públicos deben configurarse con **Proxy Status: Proxied (Nube Naranja Activada)**:

| Tipo | Nombre (Host) | Contenido (Destino) | Proxy Status | TTL |
|---|---|---|---|---|
| `CNAME` | `demiempresa.online` | `demiempresa-portal.onrender.com` | 🟠 **Proxied** | Auto |
| `CNAME` | `viajes` | `demiempresa-portal.onrender.com` | 🟠 **Proxied** | Auto |
| `CNAME` | `api` | `demiempresa-api.onrender.com` | 🟠 **Proxied** | Auto |
| `CNAME` | `driver` | `demiempresa-driver.onrender.com` | 🟠 **Proxied** | Auto |

> ⚠️ **REGLA DE ORO:** Nunca crear registros tipo `A` que apunten a IPs públicas directas sin proxy. La URL interna de Render (`*.onrender.com`) jamás debe divulgarse en el código del cliente.

---

## 2. Ocultación Absoluta de la IP de Origen de Render

Para asegurar que los atacantes no puedan saltarse Cloudflare conectándose directamente al host de Render:

1. **Configuración SSL/TLS en Cloudflare:**
   * Ir a **SSL/TLS** $\rightarrow$ Configurar en modo **Full (Strict)**.
   * Activar **Always Use HTTPS** y **Minimum TLS Version: 1.2**.
   * Activar **HTTP Strict Transport Security (HSTS)** con `max-age=31536000; includeSubDomains`.

2. **Cabeceras de Confianza en Render / FastAPI:**
   * FastAPI lee la IP real mediante la cabecera `CF-Connecting-IP`.
   * En Cloudflare, ir a **Rules** $\rightarrow$ **Transform Rules** $\rightarrow$ **Modify Request Header** y asegurar que `CF-Connecting-IP` sea preservada.

3. **Restricción de Tráfico en Render (Opcional con Cloudflare Tunnel o Firewall):**
   * Configurar en el middleware de FastAPI el rechazo con HTTP 403 de cualquier solicitud entrante que **no posea la cabecera `CF-Connecting-IP`** o que provenga de una IP directa fuera de los rangos oficiales de Cloudflare:
     ```python
     if not request.headers.get("CF-Connecting-IP"):
         return JSONResponse(status_code=403, content={"error": "Direct access to origin blocked"})
     ```

---

## 3. Reglas WAF (Web Application Firewall) Recomendadas

En el panel de Cloudflare $\rightarrow$ **Security** $\rightarrow$ **WAF** $\rightarrow$ **Custom Rules**:

### Regla 1: Bloquear Nodos de Salida TOR, Proxies Abiertos y Amenazas Altas
* **Nombre:** `Block Anonymous & High Threat Actors`
* **Condición de Coincidencia (Expression Builder):**
  ```text
  (ip.geoip.is_tor) or 
  (cf.client.bot) or 
  (cf.threat_score gt 15) or 
  (ip.geoip.country in {"RU", "CN", "IR", "KP"} and http.request.uri.path contains "/api/")
  ```
* **Acción:** `Block` (Bloqueo directo antes de consumir 1 solo ciclo de CPU en Render).

### Regla 2: Desafío Interactivo (Managed Challenge) en Endpoints Críticos
* **Nombre:** `Challenge Suspicious API Traffic`
* **Condición:**
  ```text
  (http.request.uri.path eq "/api/v1/trips" and cf.threat_score gt 5) or
  (http.request.uri.path contains "/api/v1/auth" and cf.threat_score gt 5)
  ```
* **Acción:** `Managed Challenge` (Captcha inteligente invisible de Cloudflare).

### Regla 3: Protección Especial para WebSockets (`/ws`)
* **Nombre:** `Allow Verified WebSockets Only`
* **Condición:**
  ```text
  (http.request.uri.path eq "/ws") and 
  not (http.request.headers["origin"][0] in {"https://viajes.demiempresa.online", "https://demiempresa.online", "https://driver.demiempresa.online"})
  ```
* **Acción:** `Block` (Corta intentos de conexión de herramientas de pentesting o bots externos que no provengan del frontend oficial).

---

## 4. Rate Limiting en el Edge (Borde de Cloudflare)

En **Security** $\rightarrow$ **WAF** $\rightarrow$ **Rate Limiting Rules**:

* **Regla:** `Trip Creation Flood Shield`
  * **URI Path:** `/api/v1/trips`
  * **Método:** `POST`
  * **Tasa:** 5 peticiones cada 1 minuto por IP.
  * **Acción:** `Block for 60 seconds`.
  *(Esto actúa como primera línea de defensa antes de que la petición toque el middleware en FastAPI).*

* **Regla:** `Auth Brute Force Shield`
  * **URI Path:** `/api/v1/auth/*`
  * **Método:** `POST`
  * **Tasa:** 3 peticiones cada 10 minutos por IP.
  * **Acción:** `Block for 600 seconds`.

---

## 5. Resumen de Ahorro de Recursos en Render ($7/mes)
Al delegar el 95% del tráfico sospechoso a Cloudflare y usar Redis en FastAPI:
1. **CPU en Render:** Reducción del 80% al evitar ejecutar Python o consultas SQL ante ataques.
2. **Memoria RAM:** Protegida dentro del límite de 512 MB gracias a la liberación de sockets inactivos a los 10 segundos.
3. **Ancho de Banda:** Mitigación de inundaciones HTTP Flood a costo $0 con la capa gratuita/pro de Cloudflare.
