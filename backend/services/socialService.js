import { pool } from '../db.js';

export class SocialService {
  /**
   * Obtiene la lista de comunidades temáticas activas
   */
  static async getCommunities() {
    const query = `
      SELECT id, name, description, icon, tagline,
        (SELECT COUNT(*) FROM viajes_social_posts p WHERE p.community_id = c.id) as posts_count
      FROM viajes_social_communities c
      WHERE is_active = TRUE
      ORDER BY name ASC;
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  /**
   * Obtiene el feed de publicaciones con filtros por comunidad, municipio o red de contactos
   */
  static async getPosts({ communityId, municipality, userId, filter = 'ALL', limit = 20, offset = 0 }) {
    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    // Filtro por comunidad
    if (communityId && communityId !== 'ALL') {
      whereClauses.push(`p.community_id = $${paramIndex}`);
      params.push(communityId);
      paramIndex++;
    }

    // Filtro por red de contactos (amigos referidos)
    if (filter === 'CONTACTS' && userId) {
      whereClauses.push(`(
        p.author_id IN (
          SELECT user_b_id FROM viajes_social_connections WHERE user_a_id = $${paramIndex}
        ) OR p.author_id = $${paramIndex}
      )`);
      params.push(userId);
      paramIndex++;
    } else if (userId) {
      // En feed público, mostrar públicos, anónimos y los privados solo si son contactos
      whereClauses.push(`(
        p.privacy IN ('PUBLIC', 'ANONYMOUS') 
        OR (p.privacy = 'CONTACTS_ONLY' AND p.author_id IN (
          SELECT user_b_id FROM viajes_social_connections WHERE user_a_id = $${paramIndex}
        ))
        OR p.author_id = $${paramIndex}
      )`);
      params.push(userId);
      paramIndex++;
    } else {
      whereClauses.push(`p.privacy IN ('PUBLIC', 'ANONYMOUS')`);
    }

    // Filtro por municipio (opcional para priorizar destino)
    if (municipality) {
      // Priorizar en el ORDER BY si coincide con el destino
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        p.*,
        c.name as community_name,
        c.icon as community_icon,
        CASE 
          WHEN p.privacy = 'ANONYMOUS' THEN COALESCE(p.anonymous_alias, 'Viajero de Ruta')
          ELSE COALESCE(u.full_name, 'Usuario Rumbo')
        END as author_display_name,
        EXISTS(
          SELECT 1 FROM viajes_social_likes l 
          WHERE l.post_id = p.id AND l.user_id = $${paramIndex}
        ) as user_has_liked
      FROM viajes_social_posts p
      JOIN viajes_social_communities c ON p.community_id = c.id
      LEFT JOIN viajes_users u ON p.author_id = u.id
      ${whereSql}
      ORDER BY 
        p.is_pinned DESC,
        ${municipality ? `(CASE WHEN LOWER(p.municipality) = LOWER('${municipality}') THEN 0 ELSE 1 END),` : ''}
        p.created_at DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2};
    `;

    params.push(userId || null, limit, offset);

    const res = await pool.query(query, params);
    return res.rows;
  }

  /**
   * Crea una nueva publicación o recomendación de spot
   */
  static async createPost({
    authorId,
    communityId,
    title,
    description,
    hook = '',
    mediaUrl = null,
    mediaType = 'IMAGE',
    locationName,
    locationLat = null,
    locationLng = null,
    municipality = 'San Salvador',
    privacy = 'PUBLIC',
    anonymousAlias = null
  }) {
    const query = `
      INSERT INTO viajes_social_posts (
        author_id, community_id, title, description, hook, media_url, media_type,
        location_name, location_lat, location_lng, municipality, privacy, anonymous_alias
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const res = await pool.query(query, [
      authorId,
      communityId,
      title,
      description,
      hook,
      mediaUrl,
      mediaType,
      locationName,
      locationLat,
      locationLng,
      municipality,
      privacy,
      anonymousAlias
    ]);

    return res.rows[0];
  }

  /**
   * Da o quita like a un post
   */
  static async toggleLike(postId, userId) {
    const checkQuery = `SELECT 1 FROM viajes_social_likes WHERE post_id = $1 AND user_id = $2;`;
    const checkRes = await pool.query(checkQuery, [postId, userId]);

    if (checkRes.rows.length > 0) {
      // Quitar like
      await pool.query(`DELETE FROM viajes_social_likes WHERE post_id = $1 AND user_id = $2;`, [postId, userId]);
      await pool.query(`UPDATE viajes_social_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1;`, [postId]);
      return { liked: false };
    } else {
      // Dar like
      await pool.query(`INSERT INTO viajes_social_likes (post_id, user_id) VALUES ($1, $2);`, [postId, userId]);
      await pool.query(`UPDATE viajes_social_posts SET likes_count = likes_count + 1 WHERE id = $1;`, [postId]);
      return { liked: true };
    }
  }

  /**
   * Obtiene la red de contactos / amigos referidos del usuario
   */
  static async getUserContacts(userId) {
    const query = `
      SELECT 
        u.id as user_id,
        u.full_name,
        CONCAT(SUBSTRING(u.phone FROM 1 FOR 4), '****') as masked_phone,
        sc.connection_type,
        sc.created_at as connected_at,
        r.status as referral_status,
        r.activation_deadline,
        (SELECT COUNT(*) FROM viajes_social_posts p WHERE p.author_id = u.id) as posts_count
      FROM viajes_social_connections sc
      JOIN viajes_users u ON sc.user_b_id = u.id
      LEFT JOIN viajes_referrals r ON (
        (r.referrer_user_id = $1 AND r.referred_user_id = u.id) OR
        (r.referrer_user_id = u.id AND r.referred_user_id = $1)
      )
      WHERE sc.user_a_id = $1
      ORDER BY sc.created_at DESC;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows;
  }

  /**
   * Juega en el Arcade durante el viaje y calcula la recompensa
   */
  static async playArcadeGame({ userId, tripId, gameType = 'WHEEL_OF_FORTUNE' }) {
    // Premios posibles:
    // 1. 100 Puntos (Común - 50%)
    // 2. 250 Puntos (Poco común - 30%)
    // 3. Bono de $0.50 en viaje (Raro - 15%)
    // 4. Bono de $1.00 en viaje (Épico - 5%)

    const rand = Math.random() * 100;
    let pointsWon = 100;
    let bonusAmount = 0.00;
    let rewardDescription = '¡Ganaste 100 Puntos de Ruta!';

    if (rand < 50) {
      pointsWon = 100;
      rewardDescription = '¡Ganaste 100 Puntos de Ruta!';
    } else if (rand < 80) {
      pointsWon = 250;
      rewardDescription = '¡Tiro Certero! Ganaste 250 Puntos de Ruta';
    } else if (rand < 95) {
      pointsWon = 500;
      bonusAmount = 0.50;
      rewardDescription = '¡PREMIO DIRECTO! Bono de $0.50 para tu próximo viaje';
    } else {
      pointsWon = 1000;
      bonusAmount = 1.00;
      rewardDescription = '¡JACKPOT! Bono Máximo de $1.00 para tu próximo viaje';
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Registrar recompensa obtenida
      const rewardRes = await client.query(`
        INSERT INTO viajes_arcade_rewards (user_id, trip_id, game_type, points_won, bonus_amount, reward_description)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `, [userId, tripId, gameType, pointsWon, bonusAmount, rewardDescription]);

      // 2. Actualizar saldo acumulado de puntos
      await client.query(`
        INSERT INTO viajes_user_reward_balance (user_id, accumulated_points, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE SET
          accumulated_points = viajes_user_reward_balance.accumulated_points + EXCLUDED.accumulated_points,
          updated_at = CURRENT_TIMESTAMP;
      `, [userId, pointsWon]);

      // 3. Si ganó bono en efectivo para viaje, conceder crédito
      if (bonusAmount > 0) {
        await client.query(`
          INSERT INTO viajes_user_credits (user_id, amount, status, granted_at, credit_expires_at)
          VALUES ($1, $2, 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days');
        `, [userId, bonusAmount]);
      }

      // Obtener saldo total actualizado
      const balRes = await client.query(`SELECT accumulated_points FROM viajes_user_reward_balance WHERE user_id = $1;`, [userId]);
      const currentPoints = balRes.rows[0]?.accumulated_points || pointsWon;

      await client.query('COMMIT');

      return {
        reward: rewardRes.rows[0],
        totalPoints: currentPoints,
        bonusAwarded: bonusAmount
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al procesar juego arcade:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene el saldo de puntos y recompensas del usuario
   */
  static async getUserRewardBalance(userId) {
    const balQuery = `SELECT accumulated_points FROM viajes_user_reward_balance WHERE user_id = $1;`;
    const balRes = await pool.query(balQuery, [userId]);

    const rewardsQuery = `
      SELECT * FROM viajes_arcade_rewards 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10;
    `;
    const rewardsRes = await pool.query(rewardsQuery, [userId]);

    return {
      points: balRes.rows[0]?.accumulated_points || 0,
      recentRewards: rewardsRes.rows
    };
  }

  // =====================================================================
  // RED SOCIAL & RADIO DE RUTA PARA CONDUCTORES (HERMANDAD DEL VOLANTE)
  // =====================================================================

  static MUNICIPALITY_COORDINATES = {
    'san salvador': { lat: 13.6989, lng: -89.1914 },
    'santa tecla': { lat: 13.6769, lng: -89.2797 },
    'antiguo cuscatlán': { lat: 13.6738, lng: -89.2372 },
    'antiguo cuscatlan': { lat: 13.6738, lng: -89.2372 },
    'soyapango': { lat: 13.7102, lng: -89.1399 },
    'san martín': { lat: 13.7250, lng: -89.0560 },
    'san martin': { lat: 13.7250, lng: -89.0560 },
    'ilopango': { lat: 13.7010, lng: -89.1090 },
    'mejicanos': { lat: 13.7380, lng: -89.2130 },
    'apopa': { lat: 13.8070, lng: -89.1790 },
    'ciudad delgado': { lat: 13.7250, lng: -89.1700 },
    'panchimalco': { lat: 13.6140, lng: -89.1790 },
    'la libertad': { lat: 13.4880, lng: -89.3220 }
  };

  /**
   * Obtiene las alertas viales filtradas por proximidad GPS y corredor de ruta
   */
  static async getDriverPosts({
    category,
    municipality,
    driverId,
    driverLat = null,
    driverLng = null,
    radiusKm = 5,
    destinationMunicipality = null,
    limit = 30
  }) {
    let whereClauses = ['p.is_active = TRUE', 'p.expires_at > CURRENT_TIMESTAMP'];
    let params = [];
    let paramIndex = 1;

    // Categoría con compatibilidad ALTA_DEMANDA / ZONA_CALIENTE
    if (category && category !== 'ALL') {
      if (category === 'ALTA_DEMANDA' || category === 'ZONA_CALIENTE') {
        whereClauses.push(`p.category IN ('ALTA_DEMANDA', 'ZONA_CALIENTE')`);
      } else {
        whereClauses.push(`p.category = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }
    }

    // Filtro por municipio manual si el chofer lo seleccionó
    if (municipality && municipality !== 'ALL') {
      whereClauses.push(`LOWER(p.municipality) = LOWER($${paramIndex})`);
      params.push(municipality);
      paramIndex++;
    }

    // =====================================================================
    // FILTRO INTELIGENTE: PROXIMIDAD GPS (<= radiusKm) O CORREDOR DE RUTA
    // =====================================================================
    let distanceSelectSql = 'NULL::numeric AS distance_km, FALSE AS is_in_route_corridor';

    const hasGps = driverLat !== null && driverLng !== null && !isNaN(parseFloat(driverLat)) && !isNaN(parseFloat(driverLng));
    const dLat = hasGps ? parseFloat(driverLat) : null;
    const dLng = hasGps ? parseFloat(driverLng) : null;
    const radKm = parseFloat(radiusKm) || 5;

    if (hasGps) {
      const latParam = paramIndex;
      const lngParam = paramIndex + 1;
      params.push(dLat, dLng);
      paramIndex += 2;

      let destParam = null;
      if (destinationMunicipality && destinationMunicipality.trim()) {
        destParam = paramIndex;
        params.push(destinationMunicipality.trim().toLowerCase());
        paramIndex++;
      }

      // Cálculo de distancia euclidiana esférica (Haversine)
      distanceSelectSql = `
        ROUND(
          (6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians($${latParam})) * cos(radians(COALESCE(p.location_lat, 13.6989))) *
              cos(radians(COALESCE(p.location_lng, -89.1914)) - radians($${lngParam})) +
              sin(radians($${latParam})) * sin(radians(COALESCE(p.location_lat, 13.6989)))
            ))
          ))::numeric, 1
        ) AS distance_km,
        ${destParam ? `(LOWER(p.municipality) = $${destParam})` : 'FALSE'} AS is_in_route_corridor
      `;

      // Regla de Relevancia de 3 Anillos:
      // Pasa si:
      // 1. Está dentro del radio de proximidad física (distance <= radKm)
      // 2. O si es un SOS crítico a menos de 5 km
      // 3. O si coincide con el corredor/municipio de destino hacia donde va el viaje activo
      const radParam = paramIndex;
      params.push(radKm);
      paramIndex++;

      whereClauses.push(`(
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($${latParam})) * cos(radians(COALESCE(p.location_lat, 13.6989))) *
            cos(radians(COALESCE(p.location_lng, -89.1914)) - radians($${lngParam})) +
            sin(radians($${latParam})) * sin(radians(COALESCE(p.location_lat, 13.6989)))
          ))
        )) <= $${radParam}
        ${destParam ? `OR (LOWER(p.municipality) = $${destParam})` : ''}
        OR (p.urgency = 'CRITICAL_SOS' AND (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($${latParam})) * cos(radians(COALESCE(p.location_lat, 13.6989))) *
            cos(radians(COALESCE(p.location_lng, -89.1914)) - radians($${lngParam})) +
            sin(radians($${latParam})) * sin(radians(COALESCE(p.location_lat, 13.6989)))
          ))
        )) <= 5.0)
      )`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const query = `
      SELECT 
        p.*,
        ${distanceSelectSql},
        EXISTS(
          SELECT 1 FROM viajes_driver_social_confirmations c
          WHERE c.post_id = p.id AND c.driver_id = $${paramIndex}
        ) as driver_has_confirmed
      FROM viajes_driver_social_posts p
      ${whereSql}
      ORDER BY 
        (CASE WHEN p.urgency = 'CRITICAL_SOS' THEN 0 WHEN p.urgency = 'HIGH' THEN 1 ELSE 2 END),
        ${hasGps ? 'distance_km ASC,' : ''}
        p.created_at DESC
      LIMIT $${paramIndex + 1};
    `;

    params.push(driverId || null, limit);
    const res = await pool.query(query, params);
    return res.rows;
  }

  /**
   * Publica una alerta vial, punto de alta demanda o auxilio SOS con coordenadas GPS
   */
  static async createDriverPost({
    driverId,
    driverName = 'Conductor Rumbo',
    vehicleInfo = null,
    category = 'ALERTA_VIAL',
    subType = 'TRAFICO',
    title,
    description,
    locationName,
    municipality = 'San Salvador',
    locationLat = null,
    locationLng = null,
    urgency = 'NORMAL',
    driverPhone = null
  }) {
    let intervalHours = 4;
    if (category === 'ALTA_DEMANDA' || category === 'ZONA_CALIENTE') intervalHours = 2;
    else if (category === 'AUXILIO_SOS') intervalHours = 3;
    else if (category === 'TALLER_LLANTERIA' || category === 'CHARLA_RUTERA') intervalHours = 48;

    // Asignar coordenadas automáticas por municipio si no vienen del GPS
    let finalLat = locationLat;
    let finalLng = locationLng;
    if (!finalLat || !finalLng) {
      const muniKey = (municipality || 'san salvador').toLowerCase().trim();
      const coords = SocialService.MUNICIPALITY_COORDINATES[muniKey] || SocialService.MUNICIPALITY_COORDINATES['san salvador'];
      finalLat = coords.lat;
      finalLng = coords.lng;
    }

    const query = `
      INSERT INTO viajes_driver_social_posts (
        driver_id, driver_name, vehicle_info, category, sub_type, title, description,
        location_name, municipality, location_lat, location_lng, urgency, driver_phone, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP + INTERVAL '${intervalHours} hours')
      RETURNING *;
    `;

    const res = await pool.query(query, [
      driverId,
      driverName,
      vehicleInfo,
      category,
      subType,
      title,
      description,
      locationName,
      municipality,
      finalLat,
      finalLng,
      urgency,
      driverPhone
    ]);

    return res.rows[0];
  }

  /**
   * Confirma una alerta vial ("A mí también me consta / Sigue ahí")
   */
  static async confirmDriverAlert(postId, driverId) {
    if (!driverId) return { confirmed: false, error: 'driverId requerido' };

    const checkQuery = `SELECT 1 FROM viajes_driver_social_confirmations WHERE post_id = $1 AND driver_id = $2;`;
    const checkRes = await pool.query(checkQuery, [postId, driverId]);

    if (checkRes.rows.length > 0) {
      // Ya confirmó, no duplicar
      return { confirmed: true, alreadyConfirmed: true };
    }

    await pool.query(`INSERT INTO viajes_driver_social_confirmations (post_id, driver_id) VALUES ($1, $2);`, [postId, driverId]);
    const updateRes = await pool.query(`
      UPDATE viajes_driver_social_posts 
      SET confirmations_count = confirmations_count + 1 
      WHERE id = $1 
      RETURNING confirmations_count;
    `, [postId]);

    return {
      confirmed: true,
      confirmationsCount: updateRes.rows[0]?.confirmations_count || 1
    };
  }

  // =====================================================================
  // FRECUENCIA PRIVADA Y RED DE COLEGAS DE CONFIANZA
  // =====================================================================

  /**
   * Obtiene la lista de colegas de confianza del conductor
   */
  static async getDriverBuddies(driverId) {
    const query = `
      SELECT 
        b.buddy_driver_id,
        b.created_at as connected_since,
        p.full_name as buddy_name,
        p.vehicle_plate,
        p.vehicle_model,
        p.vehicle_color,
        p.is_online,
        p.phone as buddy_phone
      FROM viajes_driver_buddies b
      JOIN viajes_driver_profiles p ON b.buddy_driver_id = p.id
      WHERE b.driver_id = $1
      ORDER BY p.is_online DESC, b.created_at DESC;
    `;
    const res = await pool.query(query, [driverId]);
    return res.rows;
  }

  /**
   * Agrega un colega de confianza a la frecuencia privada
   */
  static async addDriverBuddy(driverId, buddyDriverId) {
    if (driverId === buddyDriverId) {
      throw new Error('No puedes agregarte a ti mismo como colega');
    }
    const query = `
      INSERT INTO viajes_driver_buddies (driver_id, buddy_driver_id)
      VALUES ($1, $2)
      ON CONFLICT (driver_id, buddy_driver_id) DO NOTHING
      RETURNING *;
    `;
    const res = await pool.query(query, [driverId, buddyDriverId]);
    return res.rows[0] || { alreadyBuddy: true };
  }

  /**
   * Busca a un colega por número de teléfono o placa para agregarlo
   */
  static async searchDriverBuddy(searchQuery, currentDriverId) {
    const clean = searchQuery.trim();
    const query = `
      SELECT id, full_name, vehicle_plate, vehicle_model, vehicle_color, is_online
      FROM viajes_driver_profiles
      WHERE (phone LIKE $1 OR vehicle_plate ILIKE $2 OR full_name ILIKE $2)
        AND id::text <> $3::text
      LIMIT 10;
    `;
    const res = await pool.query(query, [`%${clean}%`, `%${clean}%`, currentDriverId || '00000000-0000-0000-0000-000000000000']);
    return res.rows;
  }

  /**
   * Obtiene los mensajes de la frecuencia privada
   */
  static async getPrivateMessages(driverId, limit = 40) {
    // Trae mensajes donde el chofer es emisor, destinatario, o enviados al canal común de sus colegas
    const query = `
      SELECT *
      FROM viajes_driver_private_messages
      WHERE (
        sender_driver_id = $1 
        OR recipient_driver_id = $1
        OR (recipient_driver_id IS NULL AND sender_driver_id IN (
          SELECT buddy_driver_id FROM viajes_driver_buddies WHERE driver_id = $1
        ))
      )
      ORDER BY created_at DESC
      LIMIT $2;
    `;
    const res = await pool.query(query, [driverId, limit]);
    return res.rows.reverse(); // cronológico para chat
  }

  /**
   * Envía un mensaje en la frecuencia privada
   */
  static async sendPrivateMessage({
    senderDriverId,
    recipientDriverId = null,
    senderName = 'Colega Rumbo',
    senderVehicle = null,
    messageText
  }) {
    const query = `
      INSERT INTO viajes_driver_private_messages (
        sender_driver_id, recipient_driver_id, sender_name, sender_vehicle, message_text
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const res = await pool.query(query, [
      senderDriverId,
      recipientDriverId,
      senderName,
      senderVehicle,
      messageText.trim()
    ]);
    return res.rows[0];
  }

  // =====================================================================
  // CLUB DE COMPRAS COLECTIVAS DE MANTENIMIENTO, REPUESTOS Y ASESORÍA
  // =====================================================================

  /**
   * Obtiene los lotes activos de compras colectivas de la semana
   */
  static async getGroupDeals() {
    const query = `
      SELECT *
      FROM viajes_driver_group_deals
      WHERE status = 'OPEN_PAYMENT' AND payment_deadline > CURRENT_TIMESTAMP
      ORDER BY payment_deadline ASC;
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  /**
   * Registra una compra colectiva pagada por anticipado con Transfer365 Móvil
   */
  static async createDealOrder({
    dealId,
    driverId,
    driverName = 'Conductor Rumbo',
    vehiclePlate,
    amountPaid,
    transferReference,
    transferProofUrl = null
  }) {
    // Generar código de retiro único para el taller
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const cleanPlate = (vehiclePlate || 'RUMBO').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const redemptionCode = `RMB-${cleanPlate}-${randCode}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderQuery = `
        INSERT INTO viajes_driver_deal_orders (
          deal_id, driver_id, driver_name, vehicle_plate, amount_paid,
          bank_name, transfer_phone, account_holder, transfer_reference,
          transfer_proof_url, status, redemption_code
        )
        VALUES ($1, $2, $3, $4, $5, 'DAVIVIENDA', '69893101', 'Cesar Arias', $6, $7, 'PAID_VERIFIED', $8)
        RETURNING *;
      `;

      const orderRes = await client.query(orderQuery, [
        dealId,
        driverId,
        driverName,
        vehiclePlate,
        amountPaid,
        transferReference,
        transferProofUrl,
        redemptionCode
      ]);

      // Incrementar contador de participantes pagados en el lote
      await client.query(`
        UPDATE viajes_driver_group_deals
        SET current_paid_count = current_paid_count + 1
        WHERE id = $1;
      `, [dealId]);

      await client.query('COMMIT');
      return orderRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al registrar pedido de compra colectiva:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene los pedidos y tickets de canje del conductor
   */
  static async getDriverDealOrders(driverId) {
    const query = `
      SELECT o.*, d.title as deal_title, d.category as deal_category,
             d.supplier_name, d.supplier_address, d.delivery_date
      FROM viajes_driver_deal_orders o
      JOIN viajes_driver_group_deals d ON o.deal_id = d.id
      WHERE o.driver_id = $1
      ORDER BY o.created_at DESC;
    `;
    const res = await pool.query(query, [driverId]);
    return res.rows;
  }

  /**
   * Registra una necesidad de repuesto o servicio para la cotización de la próxima semana
   */
  static async submitDemandRequest({
    driverId,
    driverName,
    vehicleInfo,
    category,
    itemDescription,
    urgency = 'ESTA_SEMANA'
  }) {
    const query = `
      INSERT INTO viajes_driver_demand_requests (
        driver_id, driver_name, vehicle_info, category, item_description, urgency
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const res = await pool.query(query, [
      driverId,
      driverName,
      vehicleInfo,
      category,
      itemDescription.trim(),
      urgency
    ]);
    return res.rows[0];
  }

  /**
   * Obtiene el conteo agregado de lo que los conductores están pidiendo
   */
  static async getDemandSummary() {
    const query = `
      SELECT category, COUNT(*) as count
      FROM viajes_driver_demand_requests
      WHERE status = 'GATHERING_DEMAND'
      GROUP BY category
      ORDER BY count DESC;
    `;
    const res = await pool.query(query);
    return res.rows;
  }
}

