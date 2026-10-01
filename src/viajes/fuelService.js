/**
 * Servicio de Cálculo de Carretera, Consumo Probabilístico de Gasolina
 * y Radar de Gasolineras en El Salvador (DGEHM + Choferes Crowdsourcing)
 */

// 1. CÁLCULO DE DISTANCIA REAL EN CARRETERA (OSRM + FALLBACK HAVERSINE)
export async function calculateRoadDistance(originCoords, destCoords) {
  if (!originCoords?.lat || !destCoords?.lat) {
    return { distanceKm: 5.0, durationMinutes: 12 };
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=false`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = +(route.distance / 1000).toFixed(2);
        const durationMinutes = Math.max(1, Math.round(route.duration / 60));
        return { distanceKm, durationMinutes, isLiveRoute: true };
      }
    }
  } catch (err) {
    console.warn('Fallback a cálculo geodésico:', err);
  }

  // Fallback con fórmula de Haversine + Factor de curvatura urbana 1.28x
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
  
  // Factor de calles de San Salvador (1.28x) y velocidad promedio urbana (26 km/h)
  const distanceKm = +(directKm * 1.28).toFixed(2);
  const durationMinutes = Math.max(2, Math.round((distanceKm / 26) * 60));

  return { distanceKm, durationMinutes, isLiveRoute: false };
}

// 2. MODELO PROBABILÍSTICO DE RENDIMIENTO SEGÚN VEHÍCULO Y AÑO
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

// 3. CÁLCULO DE COSTO DE GASOLINA Y MARGEN NETO DEL CHOFER
export function calculateTripFuelCost(distanceKm, kmPerGallon = 42.0, fuelPricePerGallon = 3.80, agreedFare = 3.50) {
  const dist = parseFloat(distanceKm) || 1.0;
  const kpg = Math.max(10.0, parseFloat(kmPerGallon) || 42.0);
  const price = parseFloat(fuelPricePerGallon) || 3.80;
  const fare = parseFloat(agreedFare) || 0.0;

  const gallonsConsumed = dist / kpg;
  const fuelCostUsd = +(gallonsConsumed * price).toFixed(2);
  const netEarningsUsd = +(Math.max(0, fare - fuelCostUsd)).toFixed(2);
  const profitMarginPercent = fare > 0 ? Math.round((netEarningsUsd / fare) * 100) : 0;

  return {
    distanceKm: dist,
    gallonsConsumed: +gallonsConsumed.toFixed(3),
    fuelCostUsd,
    netEarningsUsd,
    profitMarginPercent
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
