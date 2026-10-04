# Especificación Técnica y Funcional: Plataforma de Viajes y Hub Comercial
**Dominio:** demiempresa.online  
**Infraestructura:** Vercel (PWA Frontend) + Render (Backend API Always-On + DB/Redis)

---

## 1. Visión General del Proyecto
Sistema de transporte compartido punto a punto bajo demanda (estilo inDriver) basado en negociación libre de tarifas por oferta y demanda directa, pagos 100% en efectivo y arquitectura asimétrica:
- **Pasajero:** Web Móvil / PWA ligera (sin descarga de tienda obligatoria).
- **Conductor:** Aplicación instalable (APK Android) con servicio en segundo plano (Foreground Service).

---

## 2. Modelo de Negocio y Monetización de Transporte
- **Cobro al Conductor:** Suscripción plana de $15.00 USD semanales ($60.00 USD/mes) o pase diario de $3.00 USD, sin comisiones porcentuales sobre las carreras realizadas.
- **Periodo de Prueba:** Primer mes (30 días) 100% gratuito tras el registro y validación del chofer.
- **Pagos de Carreras:** 100% en efectivo directo del pasajero al conductor. La plataforma no retiene comisiones por viaje.
- **Incentivos Conductor-Conductor:** Extensión de 1 semana gratuita al completar su referido los primeros viajes.
- **Incentivos Conductor-Pasajero (QR en auto):** Acreditación de $1.00 USD a la cuota semanal del chofer tras el primer viaje calificado del pasajero.

---

## 3. Dinámica de Solicitud y Subasta en Tiempo Real
1. **Publicación:** El pasajero define origen, destino y monto en efectivo que ofrece (ej. $3.50 USD).
2. **Despacho Acotado:** La solicitud se emite a conductores activos dentro de un radio estricto de 1 km para evitar consumo innecesario de combustible.
3. **Ofertas del Conductor:**
   - La pantalla del conductor muestra de un vistazo: destino, distancia de recogida y oferta propuesta.
   - Opciones rápidas: [Aceptar tarifa] o contraofertas rápidas (+$0.50, +$1.00).
4. **Regla de Expiración Estricta (10 Segundos):**
   - Cada tarjeta de oferta en la pantalla del pasajero tiene una vida útil de **10 segundos exactos**.
   - Si no se acepta en 10 segundos, la tarjeta desaparece del lado del pasajero y el chofer queda libre.
   - El conductor puede emitir ofertas simultáneas a varias solicitudes.
   - **Regla atómica ("El primero que pulsa gana"):** Cuando un pasajero presiona [ACEPTAR], el conductor queda asignado y bloqueado al instante; sus ofertas activas en otras pantallas de pasajeros desaparecen en ese milisegundo.

---

## 4. Fase de Detalle Operativo (Post-Asignación)
Al confirmarse el viaje, la interfaz minimalista se transforma en centro de control:
- **Pantalla del Conductor:**
  - Monto acordado en efectivo en tipografía gigante (ej. **$4.00 EFECTIVO**).
  - Destino y dirección exacta de recogida con referencias.
  - Nombre del pasajero, botón de llamada directa y botón de WhatsApp.
  - Botón de un toque: [Abrir en Waze / Google Maps] con coordenadas precargadas.
  - Controles de estado: [Ya llegué al punto], [Iniciar viaje], [Finalizar y cobrar].
- **Pantalla del Pasajero:**
  - Datos completos del vehículo: Placa visible en grande, marca, modelo y color.
  - Foto de rostro y nombre del conductor con contacto telefónico/WhatsApp.
  - Tracking en tiempo real del vehículo acercándose y tiempo estimado de llegada (ETA).
  - Botón de seguridad: [Compartir viaje en tiempo real] vía enlace web.

---

## 5. Programa de Referidos: Doble Presión Temporal (7 + 7 Días)
El canal "Pasajero refiere Pasajero" subsidia $1.00 USD por usuario verificado bajo dos cuentas regresivas independientes:

### Fase 1: Objetivo "Ganarse el Premio" (Activación)
- El invitado se registra formalmente con datos reales: Nombre completo, DUI (validación de máscara y unicidad estricta en BD) y Teléfono móvil.
- **Cuenta regresiva:** 7 días naturales desde el registro (`activation_deadline = registered_at + 7 días`).
- **Condición:** El referido debe completar un viaje real pagado en efectivo de al menos **$3.00 USD**.
- Si no viaja en 7 días, la referencia expira (`ACTIVATION_EXPIRED`).

### Fase 2: Objetivo "Gastar el Premio" (Redención)
- Al completarse el viaje del referido, se asigna **$1.00 USD de crédito** al referente.
- **Segunda cuenta regresiva:** 7 días naturales desde la acreditación (`credit_expires_at = reward_granted_at + 7 días`).
- **Condición:** El referente tiene 7 días para usar ese $1.00 de descuento en su propio próximo viaje.
- Si no viaja en 7 días, el crédito se elimina (`CREDIT_EXPIRED`).

### Compensación y Límite Semanal del Conductor (Cap de 15)
- Si el pasajero redime un bono de $1.00, entrega $1.00 menos en efectivo al chofer.
- El sistema acredita automáticamente ese $1.00 a la cuota semanal de $15.00 del conductor.
- **Límite de blindaje financiero:** Un conductor solo puede aceptar hasta **15 viajes bonificados por semana** ($\text{Cuota Neta} = \max(0, \$15.00 - (\text{bonos} \times \$1.00))$). Al llegar a 15, la cuota queda en $0.00 y el motor de despacho le bloquea solicitudes con bonos, dejándole solo carreras 100% en efectivo. La plataforma **nunca acumula deudas con el conductor**.

---

## 6. UI Dinámica: El Señuelo Minimalista vs. Hub Comercial
La interfaz web opera en dos fases de interacción:
1. **Fase Señuelo (Negociación):** 100% limpia y sin distracciones. Solo origen, destino, oferta en efectivo y subasta rápida.
2. **Punto de Inflexión:** Al presionar [ACEPTAR], se solicitan los datos obligatorios (Nombre, DUI único, Teléfono).
3. **Fase Hub Comercial (En Espera y Trayecto):** Con el viaje cerrado y el pasajero a bordo con tiempo muerto (3 a 10 min), la pantalla muestra el tracking en barra superior y despliega un **feed de videos cortos (tipo Reels) y banners de comerciantes locales de la zona de destino**.

---

## 7. Ecosistema B2B: Publicidad y Envíos para Comerciantes
- **Canal de Distribución / Encomiendas:** Selector en web para alternar entre `[Viaje de Pasajero]` y `[Envío de Paquete/Mercadería]`. Choferes a 1 km transportan pedidos comerciales con cobro en efectivo en origen o contra entrega.
- **Captación en Caliente ("¿Tienes un negocio? Anúnciate aquí"):** Micro-enlace dentro del reproductor publicitario. Al hacer clic y llenar 3 datos rápidos (Nombre del local, WhatsApp y Municipio), se despliega de inmediato la matriz de tarifas y paquetes publicitarios.
- **Fábrica Exprés de Creatividades:** El servicio incluye el diseño o edición básica sin costo adicional a partir de 2-3 fotos de celular enviadas por WhatsApp (plantillas para banners y videos cortos de 10-15s).

---

## 8. Estructura Financiera y Tarifas B2B
- **Base de Costos Fijos:**
  - Render (Backend Always-On + PostgreSQL + Redis): ~$14.00 USD/mes.
  - Vercel (Frontend CDN Pro): ~$20.00 USD/mes.
  - Herramientas de IA (generación de copys y guiones): ~$20.00 USD/mes.
  - Dominio y DNS (`demiempresa.online`): ~$6.00 USD/mes.
  - **Total Costos Operativos:** **~$60.00 USD/mes**.
- **Paquetes Publicitarios para Comerciantes:**
  - **Plan Vitrina (Banner Estático):** $7.50 USD/semana o $25.00 USD/mes.
  - **Plan Impacto (Video Reel 10-15s en trayecto):** $12.50 USD/semana o $45.00 USD/mes.
  - **Combo Full (Pauta + Envíos Locales):** $17.50 USD/semana o $60.00 USD/mes.
- **Punto de Equilibrio:** 6 conductores activos ($240/mes) o 2 comerciantes en pauta mensual ($50/mes) cubren la infraestructura; 10 comerciantes generan entre $350 y $450 USD/mes con margen neto superior al 80%.

---

## 9. Arquitectura Técnica de Infraestructura (`demiempresa.online`)
- **Frontend Pasajero (PWA):** `viajes.demiempresa.online` en **Vercel** (Edge CDN, SSL automático). CNAME a Vercel.
- **Backend API & WebSockets:** `api.demiempresa.online` en **Render** (Instancia Always-On de $7/mes para evitar sleep mode). CNAME a Render.
- **Capa de Datos:** PostgreSQL y Redis gestionados en la red interna privada de Render.
- **Parámetros de Red:** WebSockets con keepalive ping/pong (25-30s), CORS restringido a los subdominios de la aplicación y reconexión automática en clientes móviles.
- **App Conductor:** APK Android con Foreground Service nativo para transmisión continua de GPS (cada 3-5s).