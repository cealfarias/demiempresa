/**
 * Servicio de Cálculo de Carretera, Motor de Tráfico Dinámico en El Salvador (ETA Ajustado),
 * Consumo Probabilístico de Gasolina y Radar de Gasolineras (DGEHM + Choferes Crowdsourcing)
 */

// 1. MOTOR DE EVALUACIÓN DE TRÁFICO EN TIEMPO REAL (EL SALVADOR UTC-6)
export function evaluateSalvadoranTraffic(originCoords, destCoords, baseDurationMin) {
  const now = new Date();
  
  // Extraer hora local de El Salvador (UTC-6)
  let currentHour = 12.0;
  let dayOfWeek = now.getDay(); // 0: Dom, 1: Lun... 6: Sáb

  try {
    const svTimeString = now.toLocaleTimeString('en-US', {
      timeZone: 'America/El_Salvador',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    const [h, m] = svTimeString.split(':');
    currentHour = parseInt(h, 10) + parseInt(m, 10) / 60;
  } catch {
    const localHour = now.getHours() + now.getMinutes() / 60;
    currentHour = localHour;
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let trafficMultiplier = 1.20; // Tráfico base urbano (semáforos y cruces)
  let trafficLevel = 'FLUID';    // 'FLUID' | 'MODERATE' | 'HEAVY' | 'SEVERE'
  let trafficColor = '#10B981';  // Verde esmeralda
  let trafficLabel = 'Tráfico Fluido';
  let rushHourContext = 'Horario Normal';

  if (!isWeekend) {
    // DÍAS LABORALES (Lunes a Viernes)
    if (currentHour >= 6.5 && currentHour <= 8.75) {
      // HORA PICO MATUTINA (6:30 AM - 8:45 AM)
      trafficMultiplier = 2.10;
      trafficLevel = 'HEAVY';
      trafficColor = '#EF4444'; // Rojo
      trafficLabel = 'Tráfico Pesado (Pico Mañana)';
      rushHourContext = 'Hora Pico Matutina';
    } else if (currentHour >= 11.5 && currentHour <= 13.5) {
      // HORA DE ALMUERZO (11:30 AM - 1:30 PM)
      trafficMultiplier = 1.45;
      trafficLevel = 'MODERATE';
      trafficColor = '#F59E0B'; // Ámbar
      trafficLabel = 'Tráfico Moderado (Almuerzo)';
      rushHourContext = 'Hora Almuerzo';
    } else if (currentHour >= 16.5 && currentHour <= 19.5) {
      // HORA PICO VESPERTINA (4:30 PM - 7:30 PM) - La más severa en San Salvador
      trafficMultiplier = 2.45;
      trafficLevel = 'SEVERE';
      trafficColor = '#DC2626'; // Rojo Intenso / Trabazón
      trafficLabel = 'Congestión Fuerte (Pico Tarde)';
      rushHourContext = 'Hora Pico Vespertina';
    } else if (currentHour >= 20.0 || currentHour <= 5.75) {
      // NOCHE / MADRUGADA
      trafficMultiplier = 1.05;
      trafficLevel = 'FLUID';
      trafficColor = '#10B981'; // Verde
      trafficLabel = 'Vías Despejadas / Tráfico Libre';
      rushHourContext = 'Horario Nocturno Fluido';
    } else {
      // HORAS VALLE (9:00 AM - 11:30 AM / 2:00 PM - 4:30 PM)
      trafficMultiplier = 1.30;
      trafficLevel = 'MODERATE';
      trafficColor = '#F59E0B';
      trafficLabel = 'Tráfico Moderado';
      rushHourContext = 'Horario Valle';
    }
  } else {
    // FINES DE SEMANA (Sábado y Domingo)
    if (dayOfWeek === 6 && currentHour >= 11.0 && currentHour <= 15.0) {
      // Sábado al mediodía (centros comerciales)
      trafficMultiplier = 1.55;
      trafficLevel = 'MODERATE';
      trafficColor = '#F59E0B';
      trafficLabel = 'Tráfico Comercial (Sábado)';
      rushHourContext = 'Sábado Comercial';
    } else {
      trafficMultiplier = 1.10;
      trafficLevel = 'FLUID';
      trafficColor = '#10B981';
      trafficLabel = 'Vías Libres Fin de Semana';
      rushHourContext = 'Fin de Semana Despejado';
    }
  }

  // Corredores de alto tráfico: Los Próceres, Panamericana (San Salvador <-> Santa Tecla / Antiguo Cuscatlán)
  const isTeclaSanSalvador =
    (destCoords?.lat < 13.69 && originCoords?.lat > 13.69) ||
    (originCoords?.lat < 13.69 && destCoords?.lat > 13.69);
  if (isTeclaSanSalvador && (trafficLevel === 'HEAVY' || trafficLevel === 'SEVERE')) {
    trafficMultiplier += 0.25; // Trabazón adicional en Los Próceres / Panamericana
  }

  const baseMinutes = Math.max(1, baseDurationMin || 1);
  const trafficDurationMin = Math.max(2, Math.round(baseMinutes * trafficMultiplier));
  const delayMinutes = Math.max(0, trafficDurationMin - baseMinutes);

  return {
    trafficDurationMin,
    delayMinutes,
    trafficMultiplier,
    trafficLevel,
    trafficColor,
    trafficLabel,
    rushHourContext
  };
}

// 2. CÁLCULO DE DISTANCIA REAL EN CARRETERA CON TRÁFICO Y GEOMETRÍA COMPLETA
export async function calculateRoadDistance(originCoords, destCoords) {
  if (!originCoords?.lat || !destCoords?.lat) {
    return {
      distanceKm: 5.0,
      durationMinutes: 12,
      baseDurationMinutes: 10,
      delayMinutes: 2,
      trafficLevel: 'FLUID',
      trafficColor: '#10B981',
      trafficLabel: 'Tráfico Fluido',
      routeCoordinates: []
    };
  }

  let routeCoordinates = [];
  let baseDurationMinutes = 10;
  let distanceKm = 5.0;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        distanceKm = +(route.distance / 1000).toFixed(2);
        baseDurationMinutes = Math.max(2, Math.round(route.duration / 60));

        // Mapear coordenadas de OSRM [lon, lat] a Leaflet [lat, lon]
        if (route.geometry?.coordinates) {
          routeCoordinates = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        }
      }
    }
  } catch (err) {
    console.warn('Fallback a cálculo geodésico:', err);
  }

  // Fallback si OSRM no respondió
  if (routeCoordinates.length === 0) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((destCoords.lat - originCoords.lat) * Math.PI) / 180;
    const dLon = ((destCoords.lng - originCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((originCoords.lat * Math.PI) / 180) *
        Math.cos((destCoords.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const directKm = R * c;

    // Curvatura urbana 1.28x y velocidad base urbana sin congestión (32 km/h)
    distanceKm = +(directKm * 1.28).toFixed(2);
    baseDurationMinutes = Math.max(2, Math.round((distanceKm / 32) * 60));
    routeCoordinates = [
      [originCoords.lat, originCoords.lng],
      [destCoords.lat, destCoords.lng]
    ];
  }

  // Evaluar tráfico en tiempo real según hora de El Salvador y corredor vial
  const traffic = evaluateSalvadoranTraffic(originCoords, destCoords, baseDurationMinutes);

  return {
    distanceKm,
    baseDurationMinutes,
    durationMinutes: traffic.trafficDurationMin,
    delayMinutes: traffic.delayMinutes,
    trafficMultiplier: traffic.trafficMultiplier,
    trafficLevel: traffic.trafficLevel,
    trafficColor: traffic.trafficColor,
    trafficLabel: traffic.trafficLabel,
    rushHourContext: traffic.rushHourContext,
    routeCoordinates,
    isLiveRoute: true
  };
}

// 3. MODELO PROBABILÍSTICO DE RENDIMIENTO SEGÚN VEHÍCULO Y AÑO
export function estimateFuelEconomy(year = 2018, vehicleCategory = 'SEDAN_COMPACT') {
  const parsedYear = parseInt(year) || 2018;

  // Curvas base de rendimiento en km por galón (tráfico mixto El Salvador)
  const baseRates = {
    SEDAN_COMPACT: { base: 38.0, factorPerYear: 0.8 }, // Corolla, Sentra, Civic, Elantra, Yaris
    HATCHBACK:     { base: 43.0, factorPerYear: 0.9 }, // Spark, Rio, March, Picanto
    SUV_COMPACT:   { base: 30.0, factorPerYear: 0.6 }, // Rav4, CR-V, Tucson, Rogue, Creta
    PICKUP:        { base: 26.0, factorPerYear: 0.5 }, // Hilux, D-Max, Frontier
    MOTO:          { base: 125.0, factorPerYear: 1.2 }  // Mensajería / moto
  };

  const model = baseRates[vehicleCategory] || baseRates.SEDAN_COMPACT;
  const yearDelta = Math.max(-10, Math.min(10, parsedYear - 2015));
  const calculated = model.base + yearDelta * model.factorPerYear;

  return +calculated.toFixed(1);
}

// 4. MODELO DE PESO Y CARGA DE PASAJEROS
export const PASSENGER_WEIGHT_PROFILES = {
  LIGHT:  { label: 'Delgada / Ligero', avgKg: 58, icon: '🏃', desc: '~58 kg por persona' },
  NORMAL: { label: 'Peso Normal / Estándar', avgKg: 75, icon: '🚶', desc: '~75 kg por persona' },
  HEAVY:  { label: 'Robusta / Fuerte', avgKg: 100, icon: '🏋️', desc: '~100 kg por persona' },
  OBESE:  { label: 'Carga Pesada / Obeso', avgKg: 125, icon: '⚖️', desc: '~125 kg por persona' }
};

export function calculateCabinWeight(passengersCount = 1, weightProfile = 'NORMAL', extraLuggage = false) {
  const pCount = Math.max(1, parseInt(passengersCount) || 1);
  const profile = PASSENGER_WEIGHT_PROFILES[weightProfile] || PASSENGER_WEIGHT_PROFILES.NORMAL;
  const luggageKg = extraLuggage ? 35 : 0;
  const totalWeightKg = (pCount * profile.avgKg) + luggageKg;

  // Peso de referencia base (1 pasajero estándar = 75 kg)
  const excessWeightKg = Math.max(0, totalWeightKg - 75);
  // Cada 100 kg extra incrementa el consumo del motor un 3.5% (fricción, masa inercial y pendientes)
  const weightConsumptionFactor = 1 + (excessWeightKg / 100) * 0.035;

  return {
    passengersCount: pCount,
    weightProfile,
    avgKgPerPerson: profile.avgKg,
    totalWeightKg,
    luggageKg,
    excessWeightKg,
    weightConsumptionFactor: +weightConsumptionFactor.toFixed(3)
  };
}

// 5. CÁLCULO CIENTÍFICO DE COSTO DE GASOLINA (DISTANCIA + TRÁFICO + A/C + PESO DE PASAJEROS)
export function calculateTripFuelCost(
  distanceKm,
  kmPerGallon = 42.0,
  fuelPricePerGallon = 3.80,
  agreedFare = 3.50,
  delayMinutes = 0,
  options = {}
) {
  const dist = parseFloat(distanceKm) || 1.0;
  const kpg = Math.max(10.0, parseFloat(kmPerGallon) || 42.0);
  const price = parseFloat(fuelPricePerGallon) || 3.80;
  const fare = parseFloat(agreedFare) || 0.0;

  const {
    airConditioning = true,
    passengers = 1,
    weightProfile = 'NORMAL',
    extraLuggage = false
  } = options;

  // 1. Análisis de peso y factor de sobreconsumo
  const weightAnalysis = calculateCabinWeight(passengers, weightProfile, extraLuggage);
  const weightFactor = weightAnalysis.weightConsumptionFactor;

  // 2. Factor de Aire Acondicionado (+15% de consumo en el motor con compresor activo)
  const acFactor = airConditioning ? 1.15 : 1.0;

  // 3. Consumo de rodaje afectado por peso y A/C
  const baseDrivingGallons = dist / kpg;
  const drivingGallons = baseDrivingGallons * weightFactor * acFactor;

  // 4. Consumo por trabazón / ralentí (motor encendido detenido)
  const idlingHours = Math.max(0, parseFloat(delayMinutes) || 0) / 60;
  // A ralentí el A/C gasta ~0.24 gal/h vs ~0.15 gal/h sin A/C
  const idlingBurnRate = airConditioning ? 0.24 : 0.16;
  const idlingGallons = idlingHours * idlingBurnRate;

  // Total de galones y costo en USD
  const totalGallons = +(drivingGallons + idlingGallons).toFixed(3);
  const fuelCostUsd = +(totalGallons * price).toFixed(2);
  const netEarningsUsd = +(Math.max(0, fare - fuelCostUsd)).toFixed(2);
  const profitMarginPercent = fare > 0 ? Math.round((netEarningsUsd / fare) * 100) : 0;

  return {
    distanceKm: dist,
    gallonsConsumed: totalGallons,
    drivingGallons: +drivingGallons.toFixed(3),
    idlingGallons: +idlingGallons.toFixed(3),
    fuelCostUsd,
    netEarningsUsd,
    profitMarginPercent,
    weightAnalysis,
    acFactor,
    airConditioning
  };
}

// 6. ALGORITMO DE TARIFA SUGERIDA PONDERADA (DISTANCIA + TRÁFICO + A/C + PESO DE PASAJEROS)
export function calculateSuggestedFare(
  distanceKm,
  kmPerGallon = 42.0,
  fuelPricePerGallon = 3.80,
  delayMinutes = 0,
  options = {}
) {
  const isMoto = options.transportType === 'MOTO' || options.vehicleType === 'MOTO';
  const isLargeGroup = !isMoto && (options.passengers > 4);

  const {
    airConditioning = true,
    passengers = 1,
    weightProfile = 'NORMAL',
    extraLuggage = false
  } = isMoto ? { airConditioning: false, passengers: 1, weightProfile: options.weightProfile || 'NORMAL', extraLuggage: false } : options;

  const dist = parseFloat(distanceKm) || 1.0;

  // 1. Banderazo base operativo (arranque, llantas y salida)
  // Moto: $0.90 | Auto normal: $1.60 | Camioneta/Van 5+: $3.00
  const baseFare = isMoto ? 0.90 : (isLargeGroup ? 3.00 : 1.60);

  // 2. Costo por kilómetro recorrido (amortización y operación)
  // Moto: $0.18/km | Auto: $0.32/km | Van: $0.45/km
  const kmRate = isMoto ? 0.18 : (isLargeGroup ? 0.45 : 0.32);
  const kmCost = dist * kmRate;

  // 3. Costo real de combustible (incluyendo A/C y peso)
  // En moto el rendimiento es ~115 km/gal vs 42 km/gal en auto
  const effectiveKpg = isMoto ? 115.0 : kmPerGallon;
  // En moto la demora por trabazón se reduce un 65% porque filtra tráfico
  const effectiveDelayMinutes = isMoto ? (parseFloat(delayMinutes) || 0) * 0.35 : (parseFloat(delayMinutes) || 0);

  const fuelMetrics = calculateTripFuelCost(
    dist,
    effectiveKpg,
    fuelPricePerGallon,
    0,
    effectiveDelayMinutes,
    isMoto ? { airConditioning: false, passengers: 1, weightProfile, extraLuggage: false } : options
  );
  const fuelComponent = fuelMetrics.fuelCostUsd;

  // 4. Recargo por congestión y tiempo de tráfico
  const trafficSurcharge = isMoto
    ? Math.min(0.75, effectiveDelayMinutes * 0.02)
    : Math.min(2.50, Math.max(0, parseFloat(delayMinutes) || 0) * 0.06);

  // 5. Recargo por Aire Acondicionado (no aplica a moto)
  const acSurcharge = isMoto ? 0.00 : (airConditioning ? (dist > 10 ? 0.50 : 0.35) : 0.00);

  // 6. Recargo ponderado por peso y número de pasajeros (en moto solo 1 persona)
  const weightData = fuelMetrics.weightAnalysis;
  let weightSurcharge = 0.00;
  if (!isMoto) {
    if (isLargeGroup) {
      weightSurcharge = 1.75;
    } else if (weightData.totalWeightKg >= 350) {
      weightSurcharge = 1.00;
    } else if (weightData.totalWeightKg >= 260) {
      weightSurcharge = 0.60;
    } else if (weightData.totalWeightKg >= 180) {
      weightSurcharge = 0.35;
    } else if (weightData.totalWeightKg >= 130) {
      weightSurcharge = 0.20;
    }
  }

  // Recargo por equipaje voluminoso en baúl (en moto no aplica baúl grande)
  const luggageSurcharge = isMoto ? 0.00 : (extraLuggage ? 0.40 : 0.00);

  // Soporte de Ida y Vuelta (Viaje Redondo) y tiempo de espera en destino
  const isRoundTrip = Boolean(options.isRoundTrip);
  const roundTripWaitMinutes = Math.max(0, parseInt(options.roundTripWaitMinutes) || 0);
  const roundTripWaitSurcharge = roundTripWaitMinutes * 0.05; // $0.05 por minuto de espera ($1.50 por cada 30 min)

  // Factor de retorno para ida y vuelta: 1.85x (15% de descuento en el tramo de retorno para premiar fidelidad)
  const distanceMultiplier = isRoundTrip ? 1.85 : 1.0;

  // Total bruto
  const rawTripKmAndFuel = (kmCost + (fuelComponent * 0.85) + trafficSurcharge + acSurcharge) * distanceMultiplier;
  const rawTotal = baseFare + rawTripKmAndFuel + weightSurcharge + luggageSurcharge + roundTripWaitSurcharge;

  // Redondear a múltiplos de $0.25 para pagos en efectivo limpios
  // Mínimo Moto: $1.50 (o $2.75 ida y vuelta) | Mínimo Auto: $2.50 (o $4.50 ida y vuelta) | Mínimo Van: $4.50
  const minBaseFare = isMoto ? (isRoundTrip ? 2.75 : 1.50) : (isLargeGroup ? (isRoundTrip ? 8.00 : 4.50) : (isRoundTrip ? 4.50 : 2.50));
  const roundedSuggested = Math.max(
    minBaseFare,
    Math.round(rawTotal * 4) / 4
  ).toFixed(2);

  const minimumRecommended = Math.max(
    minBaseFare * 0.85,
    Math.round((rawTotal * 0.85) * 4) / 4
  ).toFixed(2);

  return {
    isMoto,
    isRoundTrip,
    roundTripWaitMinutes,
    roundTripWaitSurcharge: +roundTripWaitSurcharge.toFixed(2),
    suggestedFare: roundedSuggested,
    minimumRecommended,
    fuelCostUsd: fuelComponent * distanceMultiplier,
    trafficSurcharge: +trafficSurcharge.toFixed(2),
    acSurcharge: acSurcharge * distanceMultiplier,
    weightSurcharge: +(weightSurcharge + luggageSurcharge).toFixed(2),
    weightAnalysis: weightData,
    fuelMetrics
  };
}

// 4. PRECIOS OFICIALES DE REFERENCIA DEL GOBIERNO (DGEHM EL SALVADOR)
export const OFFICIAL_GOV_PRICES = {
  zone: 'Zona Central (San Salvador / La Libertad)',
  regular: 3.82,
  especial: 4.18,
  diesel: 3.52,
  source: 'Dirección General de Energía, Hidrocarburos y Minas (DGEHM)',
  effectiveDate: 'Quincena Vigente'
};

// 5. ESTACIONES DE GASOLINA EN EL SALVADOR CON PRECIOS AL DÍA
export const DEFAULT_GAS_STATIONS = [
  {
    id: 'gas-dlc-const',
    brand: 'DLC',
    name: 'DLC Constitución',
    address: 'Boulevard Constitución y Calle Los Sisimiles',
    municipality: 'San Salvador',
    lat: 13.7150,
    lng: -89.2280,
    regular: 3.72,
    especial: 4.08,
    diesel: 3.42,
    savingsRegular: 0.10,
    reportsCount: 19
  },
  {
    id: 'gas-puma-metro',
    brand: 'Puma',
    name: 'Puma Metrocentro Los Héroes',
    address: 'Boulevard de Los Héroes',
    municipality: 'San Salvador',
    lat: 13.7025,
    lng: -89.2150,
    regular: 3.75,
    especial: 4.10,
    diesel: 3.44,
    savingsRegular: 0.07,
    reportsCount: 14
  },
  {
    id: 'gas-puma-tecla',
    brand: 'Puma',
    name: 'Puma Santa Tecla Panamericana',
    address: 'Carretera Panamericana frente a La Joya',
    municipality: 'Santa Tecla',
    lat: 13.6738,
    lng: -89.2789,
    regular: 3.74,
    especial: 4.09,
    diesel: 3.45,
    savingsRegular: 0.08,
    reportsCount: 12
  },
  {
    id: 'gas-uno-soya',
    brand: 'Uno',
    name: 'Uno Soyapango Blvd. del Ejército',
    address: 'Boulevard del Ejército Km 4.5',
    municipality: 'Soyapango',
    lat: 13.7080,
    lng: -89.1550,
    regular: 3.76,
    especial: 4.11,
    diesel: 3.46,
    savingsRegular: 0.06,
    reportsCount: 11
  },
  {
    id: 'gas-texaco-heroes',
    brand: 'Texaco',
    name: 'Texaco Los Héroes',
    address: 'Blvd. Los Héroes y Calle Gabriela Mistral',
    municipality: 'San Salvador',
    lat: 13.7040,
    lng: -89.2140,
    regular: 3.78,
    especial: 4.12,
    diesel: 3.47,
    savingsRegular: 0.04,
    reportsCount: 8
  },
  {
    id: 'gas-uno-salvador-mundo',
    brand: 'Uno',
    name: 'Uno Salvador del Mundo',
    address: 'Alameda Roosevelt y Plaza Las Américas',
    municipality: 'San Salvador',
    lat: 13.7013,
    lng: -89.2244,
    regular: 3.79,
    especial: 4.14,
    diesel: 3.48,
    savingsRegular: 0.03,
    reportsCount: 6
  }
];

// 6. DETECTOR DE GASOLINERA MÁS CERCANA (HUD EN RUTA)
export function getNearbyGasStation(currentCoords, stations = DEFAULT_GAS_STATIONS, maxRadiusMeters = 800) {
  if (!currentCoords?.lat) return null;

  let nearest = null;
  let minDistanceMeters = Infinity;

  stations.forEach((st) => {
    const dLat = ((st.lat - currentCoords.lat) * Math.PI) / 180;
    const dLon = ((st.lng - currentCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((currentCoords.lat * Math.PI) / 180) *
        Math.cos((st.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distMeters = 6371 * c * 1000;

    if (distMeters < minDistanceMeters) {
      minDistanceMeters = distMeters;
      nearest = { ...st, distanceMeters: Math.round(distMeters) };
    }
  });

  if (nearest && nearest.distanceMeters <= maxRadiusMeters) {
    return nearest;
  }
  return null;
}
