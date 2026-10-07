import { pool } from '../db.js';

export const AD_PRICING_PLANS = {
  VITRINA: {
    name: 'Plan Vitrina (Banner Estático)',
    weekly: 7.50,
    monthly: 25.00,
    features: ['Banner en feed de destino', 'Enlace directo a WhatsApp', 'Edición gráfica básica express']
  },
  IMPACTO: {
    name: 'Plan Impacto (Video Reel 10-15s en trayecto)',
    weekly: 12.50,
    monthly: 45.00,
    features: ['Video vertical de alta atención en trayecto', 'Guión y edición con IA', 'Llamada directa al negocio']
  },
  COMBO_FULL: {
    name: 'Combo Full (Pauta + Envíos Locales)',
    weekly: 17.50,
    monthly: 60.00,
    features: ['Reel + Banner prioritario', 'Canal de encomiendas y distribución con choferes a 1km', 'Soporte prioritario']
  }
};

export class AdService {
  /**
   * Captura en caliente de Lead B2B ("¿Tienes un negocio? Anúnciate aquí")
   */
  static async captureHotLead({ businessName, whatsapp, municipality }) {
    const query = `
      INSERT INTO viajes_merchants (business_name, whatsapp, municipality, status)
      VALUES ($1, $2, $3, 'LEAD')
      RETURNING *;
    `;
    const res = await pool.query(query, [businessName, whatsapp, municipality]);
    return {
      merchant: res.rows[0],
      pricingMatrix: AD_PRICING_PLANS
    };
  }

  /**
   * Crea una campaña B2B con validación de tarifas estipuladas
   */
  static async createCampaign({ merchantId, planType, billingFrequency }) {
    const plan = AD_PRICING_PLANS[planType];
    if (!plan) throw new Error('Plan publicitario inválido');

    const price = billingFrequency === 'WEEKLY' ? plan.weekly : plan.monthly;
    const intervalDays = billingFrequency === 'WEEKLY' ? 7 : 30;

    const query = `
      INSERT INTO viajes_ad_campaigns (merchant_id, plan_type, billing_frequency, price, starts_at, ends_at, status)
      VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE + ($5 || ' days')::INTERVAL, 'PENDING_CREATIVE')
      RETURNING *;
    `;
    const res = await pool.query(query, [merchantId, planType, billingFrequency, price, intervalDays]);
    return res.rows[0];
  }

  /**
   * Obtiene el feed publicitario (Reels y Banners) geocercado por municipio y departamento de destino
   */
  static async getFeedForDestination(destinationMunicipality, destinationDepartment) {
    const query = `
      SELECT c.*, m.business_name, m.whatsapp, camp.plan_type
      FROM viajes_ad_creatives c
      JOIN viajes_ad_campaigns camp ON c.campaign_id = camp.id
      JOIN viajes_merchants m ON camp.merchant_id = m.id
      WHERE c.is_active = TRUE
        AND camp.status = 'ACTIVE'
        AND (
          LOWER(c.target_municipality) = LOWER($1)
          OR LOWER(c.target_municipality) = LOWER($2)
          OR c.target_municipality = 'TODOS'
          OR c.target_municipality ILIKE '%' || $1 || '%'
          OR c.target_municipality ILIKE '%' || $2 || '%'
        )
      ORDER BY RANDOM()
      LIMIT 10;
    `;
    const res = await pool.query(query, [destinationMunicipality || 'TODOS', destinationDepartment || 'San Salvador']);
    return res.rows;
  }

  /**
   * Registrar impresión de anuncio durante el viaje
   */
  static async recordImpression({ creativeId, tripId, viewerUserId }) {
    const query = `
      INSERT INTO viajes_ad_impressions (creative_id, trip_id, viewer_user_id)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    const res = await pool.query(query, [creativeId, tripId, viewerUserId]);
    return res.rows[0];
  }
}
