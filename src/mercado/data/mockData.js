export const BUILD_INFO = {
  version: '1.0.0',
  commit: 'd8e83f2',
  tag: '[Build v1.0.0-d8e83f2]',
  fullTitle: 'Mercados Nacionales Delivery [Build v1.0.0-d8e83f2]'
};

export const MERCADOS_DISPONIBLES = [
  { id: 'sanmiguelito', name: 'Mercado San Miguelito', ciudad: 'San Salvador', coor: '13.7042, -89.1915', activo: true },
  { id: 'central', name: 'Mercado Central', ciudad: 'San Salvador', coor: '13.6967, -89.1950', activo: false },
  { id: 'cuscatlan', name: 'Mercado Cuscatlán', ciudad: 'San Salvador', coor: '13.6980, -89.2020', activo: false },
];

export const DEPARTAMENTOS = [
  { id: 'comida', name: 'Comida Preparada', icon: 'Utensils', color: 'bg-amber-500' },
  { id: 'frutas-verduras', name: 'Frutas y Verduras', icon: 'Apple', color: 'bg-emerald-500' },
  { id: 'carnes-mariscos', name: 'Carnes y Mariscos', icon: 'Beef', color: 'bg-rose-500' },
  { id: 'abarrotes', name: 'Abarrotes y Lácteos', icon: 'ShoppingBag', color: 'bg-blue-500' },
];

export const LINEAS_POR_DEPTO = {
  'comida': [
    { id: 'pupusas', name: 'Pupusería' },
    { id: 'sopas', name: 'Sopas y Caldos' },
    { id: 'antojitos', name: 'Antojitos Típicos' },
    { id: 'bebidas', name: 'Refrescos y Bebidas' },
  ],
  'frutas-verduras': [
    { id: 'frutas', name: 'Frutas Frescas' },
    { id: 'verduras', name: 'Verduras y Legumbres' },
    { id: 'hierbas', name: 'Especias y Hierbas' },
  ],
  'carnes-mariscos': [
    { id: 'res-cerdo', name: 'Carne de Res y Cerdo' },
    { id: 'pollo', name: 'Pollo Fresco' },
    { id: 'mariscos', name: 'Mariscos Frescos' },
  ],
  'abarrotes': [
    { id: 'lacteos', name: 'Quesos y Lácteos' },
    { id: 'granos', name: 'Granos Básicos' },
    { id: 'semillas', name: 'Frutos Secos y Semillas' },
  ]
};

export const PUESTOS = [
  { id: 'p1', name: 'Pupusería Doña Chilo', pasillo: 'Pasillo 3, Puesto #42', rating: 4.8, contacto: '7844-1100' },
  { id: 'p2', name: 'Pupusería San Miguelito', pasillo: 'Pasillo 3, Puesto #45', rating: 4.6, contacto: '7922-3344' },
  { id: 'p3', name: 'Sopas y Comedero El Güero', pasillo: 'Pasillo 2, Puesto #18', rating: 4.9, contacto: '7199-8877' },
  { id: 'p4', name: 'Frutería El Carmen', pasillo: 'Pasillo 1, Puesto #05', rating: 4.7, contacto: '7766-5544' },
  { id: 'p5', name: 'Verdulería La Bendición', pasillo: 'Pasillo 1, Puesto #12', rating: 4.5, contacto: '7233-4455' },
  { id: 'p6', name: 'Carnicería San José', pasillo: 'Pasillo 5, Puesto #88', rating: 4.9, contacto: '7511-2233' },
  { id: 'p7', name: 'Lácteos Petacones y Mas', pasillo: 'Pasillo 4, Puesto #60', rating: 4.8, contacto: '7400-9988' },
];

export const TIPOS_TRANSPORTE = [
  { id: 'apie', label: 'A Pie (Runner Mercado)', icon: 'Footprints', desc: 'Ideal para recolección interna en pasillos del mercado' },
  { id: 'bicicleta', label: 'Bicicleta', icon: 'Bike', desc: 'Entregas en radio corto (1-3 km)' },
  { id: 'moto', label: 'Motocicleta', icon: 'Bike', desc: 'Entregas rápidas dentro del radio de 5 km en San Salvador' },
  { id: 'carro', label: 'Automóvil / Carro', icon: 'Car', desc: 'Pedidos de volumen alto o cajas pesadas de abarrotes' },
];

export const REPARTIDORES_INICIALES = [
  {
    id: 'desp-01',
    nombre: 'Kevin Rivera',
    telefono: '7822-4455',
    tipoTransporte: 'moto',
    vehiculo: 'Motocicleta Honda Cargo 150 - Placa M-492102',
    estado: 'Disponible',
    entregasRealizadas: 142,
    rating: 4.9,
    foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'desp-02',
    nombre: 'Samuel Hernández',
    telefono: '7911-3322',
    tipoTransporte: 'carro',
    vehiculo: 'Toyota Hilux Pick-up (Carga Pesada) - Placa P-882019',
    estado: 'Disponible',
    entregasRealizadas: 89,
    rating: 4.8,
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'rec-01',
    nombre: 'Chepe Gómez (Runner)',
    telefono: '7100-2211',
    tipoTransporte: 'apie',
    vehiculo: 'Runner Mercado (Coche de mano)',
    estado: 'Disponible',
    entregasRealizadas: 310,
    rating: 5.0,
    foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
  }
];

export const PRODUCTOS = [
  {
    id: 'prod-1',
    name: 'Pupusa de Queso con Loroco',
    departamentoId: 'comida',
    lineaId: 'pupusas',
    puestoId: 'p1',
    puestoName: 'Pupusería Doña Chilo',
    pasillo: 'Pasillo 3, Puesto #42',
    price: 0.85,
    unit: 'unidad',
    image: 'https://images.unsplash.com/photo-1629731653841-7667a421c609?auto=format&fit=crop&w=400&q=80',
    description: 'Tradicional pupusa de arroz o maíz con abundante queso y loroco fresco.'
  },
  {
    id: 'prod-2',
    name: 'Pupusa de Queso con Loroco',
    departamentoId: 'comida',
    lineaId: 'pupusas',
    puestoId: 'p2',
    puestoName: 'Pupusería San Miguelito',
    pasillo: 'Pasillo 3, Puesto #45',
    price: 0.75,
    unit: 'unidad',
    image: 'https://images.unsplash.com/photo-1629731653841-7667a421c609?auto=format&fit=crop&w=400&q=80',
    description: 'Pupusa de maíz recién hecha con curtidito casero y salsa especial.'
  },
  {
    id: 'prod-3',
    name: 'Pupusa Revuelta (Chicharrón, Frijol y Queso)',
    departamentoId: 'comida',
    lineaId: 'pupusas',
    puestoId: 'p1',
    puestoName: 'Pupusería Doña Chilo',
    pasillo: 'Pasillo 3, Puesto #42',
    price: 0.85,
    unit: 'unidad',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80',
    description: 'Chicharrón molido en casa, frijoles refritos y queso cremoso.'
  },
  {
    id: 'prod-4',
    name: 'Sopa de Gallina India con Arroz y Ensalada',
    departamentoId: 'comida',
    lineaId: 'sopas',
    puestoId: 'p3',
    puestoName: 'Sopas y Comedero El Güero',
    pasillo: 'Pasillo 2, Puesto #18',
    price: 4.50,
    unit: 'plato completo',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80',
    description: 'Incluye tazón de sopa de gallina india, pieza de gallina asada, arroz y tortillas.'
  },
  {
    id: 'prod-5',
    name: 'Sopa de Res (Pata y Costilla)',
    departamentoId: 'comida',
    lineaId: 'sopas',
    puestoId: 'p3',
    puestoName: 'Sopas y Comedero El Güero',
    pasillo: 'Pasillo 2, Puesto #18',
    price: 4.00,
    unit: 'plato completo',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80',
    description: 'Con yuca, elote, guineo verde, elotitos y verdura surtida.'
  },
  {
    id: 'prod-6',
    name: 'Aguacate Criollo de Ahuachapán',
    departamentoId: 'frutas-verduras',
    lineaId: 'frutas',
    puestoId: 'p4',
    puestoName: 'Frutería El Carmen',
    pasillo: 'Pasillo 1, Puesto #05',
    price: 1.25,
    unit: 'unidad grande',
    image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=400&q=80',
    description: 'Aguacate maduro en su punto, suave y mantecoso.'
  },
  {
    id: 'prod-7',
    name: 'Mango Manzana Madurito',
    departamentoId: 'frutas-verduras',
    lineaId: 'frutas',
    puestoId: 'p4',
    puestoName: 'Frutería El Carmen',
    pasillo: 'Pasillo 1, Puesto #05',
    price: 1.00,
    unit: 'bolsa de 3 unidades',
    image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=400&q=80',
    description: 'Mango dulce de estación seleccionado a mano.'
  },
  {
    id: 'prod-8',
    name: 'Tomate de Cocina Seleccionado',
    departamentoId: 'frutas-verduras',
    lineaId: 'verduras',
    puestoId: 'p5',
    puestoName: 'Verdulería La Bendición',
    pasillo: 'Pasillo 1, Puesto #12',
    price: 1.00,
    unit: 'libra (aprox 4-5 tomates)',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80',
    description: 'Tomate rojo de pasta ideal para salsas y guisados.'
  },
  {
    id: 'prod-9',
    name: 'Lomo de Res Fresco Cortado al Gusto',
    departamentoId: 'carnes-mariscos',
    lineaId: 'res-cerdo',
    puestoId: 'p6',
    puestoName: 'Carnicería San José',
    pasillo: 'Pasillo 5, Puesto #88',
    price: 4.75,
    unit: 'libra',
    image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=400&q=80',
    description: 'Carne magra de res fresca del día, limpia sin exceso de gordo.'
  },
  {
    id: 'prod-10',
    name: 'Queso Duro Viejo Salado Petacones',
    departamentoId: 'abarrotes',
    lineaId: 'lacteos',
    puestoId: 'p7',
    puestoName: 'Lácteos Petacones y Mas',
    pasillo: 'Pasillo 4, Puesto #60',
    price: 3.80,
    unit: 'libra',
    image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=400&q=80',
    description: 'Queso rallado duro viejo artesanal auténtico.'
  },
  {
    id: 'prod-11',
    name: 'Crema Purísima Especial',
    departamentoId: 'abarrotes',
    lineaId: 'lacteos',
    puestoId: 'p7',
    puestoName: 'Lácteos Petacones y Mas',
    pasillo: 'Pasillo 4, Puesto #60',
    price: 2.25,
    unit: 'libra',
    image: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=400&q=80',
    description: 'Crema ácida pura de vaca ideal para plátanos fritos o pupusas.'
  }
];

export const METODOS_PAGO = [
  {
    id: 'transfer365',
    name: 'Transfer365 Móvil',
    subtitle: 'Banco Davivienda - Tel: 6989-3101',
    icon: 'Building2',
    color: 'bg-emerald-600',
    details: 'Transferencia móvil instantánea a Banco Davivienda sin costo'
  },
  {
    id: 'chivo',
    name: 'Chivo Wallet',
    subtitle: 'Pago rápido en USD / Bitcoin',
    icon: 'Wallet',
    color: 'bg-blue-600',
    details: 'Escanea código QR oficial o transfiere a teléfono registrado'
  },
  {
    id: 'cubo',
    name: 'El Cubo (Tarjetas)',
    subtitle: 'Tarjeta de Crédito / Débito (Visa, Mastercard)',
    icon: 'CreditCard',
    color: 'bg-purple-600',
    details: 'Pasarela segura El Cubo con confirmación inmediata'
  },
  {
    id: 'efectivo',
    name: 'Efectivo contra Entrega',
    subtitle: 'Pago físico al recibir la orden',
    icon: 'Banknote',
    color: 'bg-amber-600',
    details: 'Pagas al motorista o runner al momento de la entrega'
  }
];
