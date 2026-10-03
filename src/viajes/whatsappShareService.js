/**
 * whatsappShareService.js
 * Genera mensajes profesionales, persuasivos y detallados para WhatsApp
 * destacando el logo de Rumbo a mi Destino y el mecanismo de pagar menos
 * por carrera a través de los bonos de referencia.
 */

export const RUMBO_LOGO_URL = 'https://viajes.demiempresa.online/rumbo-logo.png';

export function getSharePayload(type) {
  const isPassenger = type === 'passenger';

  if (isPassenger) {
    const title = '🚖 RUMBO A MI DESTINO | ¡Paga Menos con Bonos de Referencia!';
    const url = 'https://viajes.demiempresa.online';
    const text = 
`🚖 *RUMBO A MI DESTINO* 🇸🇻
_¡Tu nueva app de viajes en El Salvador!_

🎁 *¿CÓMO PAGAR MENOS POR CARRERA CON BONOS DE REFERENCIA?*
En Rumbo viajar te sale mucho más barato gracias a nuestro sistema de recompensas colaborativas:
1. Comparte tu enlace personal con tus familiares, amigos o compañeros.
2. Por cada persona que se registre con tu enlace, recibes *$1.00 USD en bonos directos de viaje*.
3. 👉 *¡Esos bonos se descuentan directamente del total de tu carrera!* Entre más recomiendes, *menos pagas en cada viaje* e incluso puedes llegar a viajar completamente gratis.

⭐ *¿Por qué viajar con Rumbo?*
• *Pagas menos por carrera* aplicando tus bonos acumulables.
• *Tarifas justas e indexadas:* Sin sorpresas ni aumentos abusivos por lluvia o tráfico.
• *Conductores 100% verificados:* Con solvencia policial y antecedentes penales comprobados.
• *Cercanía garantizada:* Choferes confirmados a 1 km a la redonda para recogida rápida sin solicitudes fantasmas.

📲 *Pide tu primer viaje, activa tus bonos y comienza a ahorrar aquí:*
${url}`;

    return { title, url, text };
  } else {
    const title = '🚗 RUMBO A MI DESTINO | 0% Comisión para Conductores';
    const url = 'https://viajes.demiempresa.online?ref=conductor';
    const text =
`🚗 *RUMBO A MI DESTINO* 🇸🇻
_La plataforma colaborativa que devuelve la dignidad al conductor_

🔥 *Ante la gasolina a $5.13 y los costos de alquiler o financiamiento del auto, ¡basta de regalarle el 28% de tu esfuerzo a las apps extranjeras!*

💰 *Tus ventajas reales como conductor en Rumbo:*
• *0% de Comisión:* El 100% de lo que paga el pasajero entra íntegro y en efectivo a tu bolsa.
• *Primera Semana 100% GRATIS:* Cero cuota semanal de bienvenida para que experimentes la ganancia real.
• *Pagas menos y ganas más con Bonos de Referencia:* Invita a otros colegas conductores y obtén semanas bonificadas y premios preferenciales.
• *Tus pasajeros pagan menos sin que tú pierdas:* Los bonos de descuento de los pasajeros los cubre la plataforma; tú siempre cobras tu tarifa completa en mano.
• *Cero viajes fantasma:* Solicitudes 100% reales a solo 1 km a la redonda de donde estás.

📲 *Inscríbete hoy en 3 minutos y activa tu primera semana gratis:*
${url}`;

    return { title, url, text };
  }
}

/**
 * Abre el diálogo nativo de compartir en móviles o redirige directo a WhatsApp
 */
export async function shareToWhatsAppOrNative(type) {
  const { title, url, text } = getSharePayload(type);

  // Intentar primero con la API nativa de compartir del celular si existe
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url
      });
      return true;
    } catch (err) {
      // Si el usuario cancela o falla, continuamos al fallback de WhatsApp
      if (err.name !== 'AbortError') {
        console.warn('Native share error, fallback to WhatsApp:', err);
      }
    }
  }

  // Fallback directo a WhatsApp Web / App
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Copia el enlace oficial al portapapeles
 */
export async function copyShareLink(type) {
  const { url } = getSharePayload(type);
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    return true;
  }
  return false;
}
