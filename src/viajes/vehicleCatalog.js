/**
 * Catálogo Oficial de Vehículos, Colores y Rendimiento Científico de Combustible en El Salvador
 * Diseñado para evitar errores ortográficos (ej. Mitsubishi) y calcular automáticamente el rendimiento por galón
 * según Marca, Modelo, Año de Fabricación y Presencia de Aire Acondicionado en tráfico urbano salvadoreño.
 */

export const VEHICLE_BRANDS = [
  'Toyota',
  'Nissan',
  'Hyundai',
  'Kia',
  'Honda',
  'Mitsubishi',
  'Suzuki',
  'Chevrolet',
  'Ford',
  'Mazda',
  'Volkswagen',
  'BYD',
  'Isuzu',
  'Chery',
  'Geely',
  'Renault',
  'Great Wall / Haval',
  'Jeep',
  'Subaru',
  'Otro'
];

export const VEHICLE_MODELS_BY_BRAND = {
  Toyota: [
    'Corolla',
    'Yaris',
    'Yaris Sedán / Hatchback',
    'Prius (Híbrido)',
    'RAV4',
    'Corolla Cross',
    'Hilux',
    'Avanza',
    'Rush',
    'Camry',
    'Matrix',
    'Sienna',
    'Hiace',
    'Otro modelo Toyota'
  ],
  Nissan: [
    'Sentra',
    'Versa',
    'March',
    'Tiida',
    'Kicks',
    'Rogue',
    'Qashqai',
    'Frontier',
    'Note / Versa Note',
    'Almera',
    'Pathfinder',
    'Urvan',
    'Otro modelo Nissan'
  ],
  Hyundai: [
    'Elantra',
    'Accent',
    'Grand i10',
    'i10',
    'Tucson',
    'Creta',
    'Venue',
    'Santa Fe',
    'Sonata',
    'H1 / Starex',
    'Otro modelo Hyundai'
  ],
  Kia: [
    'Rio',
    'Forte / Cerato',
    'Picanto',
    'Soul',
    'Sportage',
    'Seltos',
    'Carens',
    'Pegas',
    'Sorento',
    'Carnival',
    'Otro modelo Kia'
  ],
  Honda: [
    'Civic',
    'Fit',
    'City',
    'CR-V',
    'HR-V',
    'Accord',
    'Insight (Híbrido)',
    'Pilot',
    'Otro modelo Honda'
  ],
  Mitsubishi: [
    'Mirage (Hatchback)',
    'Mirage G4 (Sedán)',
    'Lancer',
    'Outlander',
    'ASX',
    'L200',
    'Montero Sport',
    'Eclipse Cross',
    'Otro modelo Mitsubishi'
  ],
  Suzuki: [
    'Swift',
    'Alto',
    'Dzire / Swift Sedán',
    'Baleno',
    'Ciaz',
    'Vitara / Grand Vitara',
    'Ertiga',
    'Jimny',
    'S-Presso',
    'Celerio',
    'Otro modelo Suzuki'
  ],
  Chevrolet: [
    'Spark',
    'Aveo',
    'Sonic',
    'Cruze',
    'Onix',
    'Tracker',
    'Trax',
    'Sail',
    'Colorado',
    'Equinox',
    'Otro modelo Chevrolet'
  ],
  Ford: [
    'Fiesta',
    'Focus',
    'EcoSport',
    'Escape',
    'Ranger',
    'Fusion',
    'Explorer',
    'Edge',
    'Otro modelo Ford'
  ],
  Mazda: [
    'Mazda 3',
    'Mazda 2',
    'CX-3',
    'CX-30',
    'CX-5',
    'BT-50',
    'Mazda 6',
    'Otro modelo Mazda'
  ],
  Volkswagen: [
    'Jetta',
    'Golf',
    'Polo',
    'Vento',
    'Tiguan',
    'Taos',
    'Amarok',
    'Saveiro',
    'Otro modelo Volkswagen'
  ],
  BYD: [
    'Dolphin (Eléctrico)',
    'Yuan Plus (Eléctrico)',
    'Seagull (Eléctrico)',
    'Song Plus (Híbrido)',
    'F3',
    'Otro modelo BYD'
  ],
  Isuzu: [
    'D-Max',
    'MU-X',
    'Trooper',
    'Otro modelo Isuzu'
  ],
  Chery: [
    'Tiggo 2',
    'Tiggo 4 Pro',
    'Tiggo 7 Pro',
    'Arrizo 5',
    'Otro modelo Chery'
  ],
  Geely: [
    'Coolray',
    'Emgrand',
    'GX3 Pro',
    'Azkarra',
    'Otro modelo Geely'
  ],
  Renault: [
    'Kwid',
    'Duster',
    'Logan',
    'Stepway',
    'Koleos',
    'Otro modelo Renault'
  ],
  'Great Wall / Haval': [
    'Haval Jolion',
    'Haval H6',
    'Poer (Pickup)',
    'Wingle',
    'Otro modelo GWM'
  ],
  Jeep: [
    'Renegade',
    'Compass',
    'Cherokee',
    'Grand Cherokee',
    'Wrangler',
    'Otro modelo Jeep'
  ],
  Subaru: [
    'Impreza',
    'XV / Crosstrek',
    'Forester',
    'Outback',
    'Legacy',
    'Otro modelo Subaru'
  ],
  Otro: [
    'Sedán Estándar',
    'Hatchback Compacto',
    'SUV / Camioneta',
    'Pickup Doble Cabina',
    'Microbús / Minivan'
  ]
};

export const VEHICLE_COLORS = [
  'Gris Plata',
  'Gris Oscuro / Grafito',
  'Blanco',
  'Negro',
  'Azul Marino',
  'Azul Eléctrico / Celeste',
  'Rojo',
  'Vino / Corinto',
  'Beige / Champagne / Arena',
  'Verde Oscuro / Olivo',
  'Amarillo / Dorado',
  'Café / Bronce'
];

/**
 * Tabla de consumo base por modelo representativo en tráfico urbano salvadoreño (km por galón de gasolina regular/especial)
 */
const MODEL_BASE_EFFICIENCY = {
  // Híbridos / Ultra Eficientes
  'prius': 68.0,
  'insight': 62.0,
  'corolla cross': 52.0,
  'dolphin': 140.0, // Equivalente eléctrico
  'seagull': 150.0,

  // Subcompactos económicos (3-4 cilindros 1.0L - 1.2L)
  'spark': 50.0,
  'picanto': 52.0,
  'grand i10': 50.0,
  'i10': 52.0,
  'alto': 55.0,
  'mirage': 52.0,
  'mirage g4': 49.0,
  'march': 46.0,
  'celerio': 53.0,
  's-presso': 54.0,
  'kwid': 50.0,

  // Compactos y Sedanes urbanos (1.4L - 1.8L)
  'yaris': 46.0,
  'yaris sedán': 45.0,
  'corolla': 42.0,
  'sentra': 40.0,
  'versa': 44.0,
  'tiida': 42.0,
  'elantra': 41.0,
  'accent': 44.0,
  'rio': 43.0,
  'forte': 40.0,
  'civic': 40.0,
  'fit': 46.0,
  'city': 45.0,
  'swift': 47.0,
  'dzire': 47.0,
  'baleno': 45.0,
  'aveo': 41.0,
  'sonic': 39.0,
  'fiesta': 42.0,
  'focus': 38.0,
  'mazda 2': 46.0,
  'mazda 3': 39.0,
  'jetta': 38.0,
  'vento': 42.0,
  'logan': 43.0,
  'pegas': 46.0,

  // Mini SUVs y Crossovers (1.5L - 2.0L)
  'kicks': 38.0,
  'creta': 37.0,
  'venue': 39.0,
  'soul': 38.0,
  'seltos': 36.0,
  'hr-v': 38.0,
  'tracker': 38.0,
  'cx-3': 39.0,
  'cx-30': 35.0,
  'ecosport': 36.0,
  'duster': 36.0,
  'tiggo 2': 38.0,
  'tiggo 4 pro': 35.0,
  'coolray': 35.0,

  // SUVs Medianas (2.0L - 2.5L)
  'rav4': 33.0,
  'cr-v': 32.0,
  'tucson': 32.0,
  'sportage': 32.0,
  'rogue': 31.0,
  'qashqai': 34.0,
  'cx-5': 32.0,
  'escape': 30.0,
  'outlander': 30.0,
  'forester': 30.0,
  'crosstrek': 32.0,
  'vitara': 35.0,
  'tiguan': 31.0,

  // Pickups y Camionetas Grandes
  'hilux': 30.0,
  'frontier': 29.0,
  'd-max': 31.0,
  'ranger': 28.0,
  'l200': 30.0,
  'bt-50': 30.0,
  'amarok': 29.0,
  'poer': 28.0,
  'montero sport': 26.0,
  '4runner': 22.0,
  'explorer': 23.0
};

/**
 * Calcula con precisión el rendimiento de combustible en km/galón
 * @param {string} brand - Marca (ej. 'Toyota')
 * @param {string} model - Modelo (ej. 'Corolla')
 * @param {number} year - Año de fabricación (ej. 2018)
 * @param {boolean} hasAirConditioning - ¿Tiene aire acondicionado activo?
 * @returns {object} Métricas de consumo estimadas
 */
export function calculateVehicleFuelEfficiency(brand, model, year = 2018, hasAirConditioning = true) {
  const modelKey = (model || '').toLowerCase().trim();
  let baseKpg = 42.0; // Sedán promedio por defecto

  // Búsqueda inteligente en base de datos
  for (const [key, kpg] of Object.entries(MODEL_BASE_EFFICIENCY)) {
    if (modelKey.includes(key)) {
      baseKpg = kpg;
      break;
    }
  }

  // Ajuste por año de fabricación
  const y = parseInt(year, 10) || 2018;
  let yearMultiplier = 1.0;
  if (y >= 2022) {
    yearMultiplier = 1.06; // Inyección directa optimizada, menor fricción
  } else if (y >= 2017) {
    yearMultiplier = 1.00; // Estándar de calibración
  } else if (y >= 2012) {
    yearMultiplier = 0.94; // Desgaste de inyectores y compresión
  } else {
    yearMultiplier = 0.88; // Tecnología previa y kilometraje alto
  }

  const nominalKpg = +(baseKpg * yearMultiplier).toFixed(1);

  // Impacto de Aire Acondicionado: el compresor demanda 2.5 - 4 HP al motor en ralentí/aceleración
  // reduce entre 11% y 14% el rendimiento en tráfico denso
  const acKpg = hasAirConditioning ? +(nominalKpg * 0.88).toFixed(1) : nominalKpg;
  const highwayKpg = +(nominalKpg * 1.35).toFixed(1);

  return {
    nominalKpg,
    acKpg,
    highwayKpg,
    recommendedFuelType: nominalKpg > 48 ? 'REGULAR' : (y >= 2018 ? 'ESPECIAL' : 'REGULAR'),
    summaryText: hasAirConditioning
      ? `Promedio estimado: ${acKpg} km/galón con A/C (${nominalKpg} km/galón sin clima)`
      : `Promedio estimado: ${nominalKpg} km/galón en ciudad`
  };
}
