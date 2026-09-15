export const BUILD_INFO = {
  version: '1.0.0',
  commit: '7f7be93',
  tag: '[Build v1.0.0-7f7be93]',
  fullTitle: 'Mercados Nacionales Delivery [Build v1.0.0-7f7be93]'
};

export const MERCADOS_DISPONIBLES = [
  { id: 'todos', name: '🇸🇻 Todos los Mercados Nacionales', ciudad: 'El Salvador', departamentoId: 'todos', distrito: 'Todos', coor: '13.7000, -89.2000', activo: true, tipo: 'red' },
  { id: 'sanmiguelito', name: 'Mercado San Miguelito', ciudad: 'San Salvador', departamentoId: 'san-salvador', distrito: 'San Salvador Centro (Distritos 1-6)', coor: '13.7042, -89.1915', activo: true, tipo: 'municipal' },
  { id: 'excuartel', name: 'Mercado Ex-Cuartel', ciudad: 'San Salvador', departamentoId: 'san-salvador', distrito: 'San Salvador Centro (Distritos 1-6)', coor: '13.6985, -89.1870', activo: true, tipo: 'municipal', badge: 'Artesanías & Calzado' },
  { id: 'hulahula', name: 'Mercado Hula Hula', ciudad: 'San Salvador', departamentoId: 'san-salvador', distrito: 'San Salvador Centro (Distritos 1-6)', coor: '13.6980, -89.1910', activo: true, tipo: 'municipal' },
  { id: 'central', name: 'Mercado Central', ciudad: 'San Salvador', departamentoId: 'san-salvador', distrito: 'San Salvador Centro (Distritos 1-6)', coor: '13.6967, -89.1950', activo: true, tipo: 'municipal' },
  { id: 'latiendona', name: 'Mercado Mayorista La Tiendona', ciudad: 'San Salvador', departamentoId: 'san-salvador', distrito: 'San Salvador Centro (Distritos 1-6)', coor: '13.7089, -89.1722', activo: true, tipo: 'mayorista' },
  { id: 'sanmarcos', name: 'Mercado Municipal de San Marcos', ciudad: 'San Salvador', departamentoId: 'san-salvador', distrito: 'San Marcos', coor: '13.6580, -89.1810', activo: true, tipo: 'municipal' },
  { id: 'mejicanos', name: 'Mercado Municipal de Mejicanos', ciudad: 'San Salvador', departamentoId: 'san-salvador', distrito: 'Mejicanos', coor: '13.7340, -89.2130', activo: true, tipo: 'municipal' },
  { id: 'soyapango', name: 'Mercado Central de Soyapango', ciudad: 'San Salvador', departamentoId: 'san-salvador', distrito: 'Soyapango', coor: '13.7120, -89.1410', activo: true, tipo: 'municipal' },
  { id: 'apopa', name: 'Mercado Municipal de Apopa', ciudad: 'San Salvador', departamentoId: 'san-salvador', distrito: 'Apopa', coor: '13.8060, -89.1790', activo: true, tipo: 'municipal' },
  { id: 'santatecla', name: 'Mercado Municipal de Santa Tecla', ciudad: 'La Libertad', departamentoId: 'la-libertad', distrito: 'Santa Tecla', coor: '13.6769, -89.2797', activo: true, tipo: 'municipal' },
  { id: 'agromercado-zacamil', name: '🟢 AgroMercado MAG (Mejicanos / Zacamil)', ciudad: 'San Salvador', departamentoId: 'san-salvador', distrito: 'Mejicanos', coor: '13.7310, -89.2150', activo: true, tipo: 'mag', badge: 'Precios Justos $1.00' },
  { id: 'agromercado-lourdes', name: '🟢 AgroMercado MAG (Lourdes / Colón)', ciudad: 'La Libertad', departamentoId: 'la-libertad', distrito: 'Colón (Lourdes)', coor: '13.7220, -89.3610', activo: true, tipo: 'mag', badge: 'Precios Justos $1.00' },
  { id: 'agromercado-santaana', name: '🟢 AgroMercado MAG (Santa Ana Centro)', ciudad: 'Santa Ana', departamentoId: 'santa-ana', distrito: 'Santa Ana Centro', coor: '13.9942, -89.5597', activo: true, tipo: 'mag', badge: 'Precios Justos $1.00' },
  { id: 'agromercado-sanmiguel', name: '🟢 AgroMercado MAG (San Miguel Centro)', ciudad: 'San Miguel', departamentoId: 'san-miguel', distrito: 'San Miguel Centro', coor: '13.4833, -88.1833', activo: true, tipo: 'mag', badge: 'Precios Justos $1.00' },
  { id: 'tinetti', name: 'Mercado Tinetti', ciudad: 'San Salvador', departamentoId: 'san-salvador', distrito: 'San Salvador Centro (Distritos 1-6)', coor: '13.6991, -89.1840', activo: true, tipo: 'municipal' },
  { id: 'cuscatlan', name: 'Mercado Cuscatlán', ciudad: 'San Salvador', departamentoId: 'san-salvador', distrito: 'San Salvador Centro (Distritos 1-6)', coor: '13.6980, -89.2020', activo: true, tipo: 'municipal' },
];

export const DEPARTAMENTOS = [
  { id: 'agromercado-mag', name: '🟢 Precios Justos MAG $1.00', icon: 'Sprout', color: 'bg-[#00D09C]' },
  { id: 'comida', name: 'Comida Preparada', icon: 'Utensils', color: 'bg-amber-500' },
  { id: 'frutas-verduras', name: 'Frutas y Verduras', icon: 'Apple', color: 'bg-emerald-500' },
  { id: 'carnes-mariscos', name: 'Carnes y Mariscos', icon: 'Beef', color: 'bg-rose-500' },
  { id: 'abarrotes', name: 'Abarrotes y Lácteos', icon: 'ShoppingBag', color: 'bg-blue-500' },
  { id: 'tecnologia-ropa', name: 'Tecnología, Artesanías y Calzado', icon: 'Smartphone', color: 'bg-indigo-600' },
];

export const LINEAS_POR_DEPTO = {
  'agromercado-mag': [
    { id: 'mag-combos', name: 'Combos a $1.00 (Productores)' },
    { id: 'mag-granos', name: 'Granos Básicos al Costo' },
    { id: 'mag-proteinas', name: 'Huevos y Proteína Directa' }
  ],
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
  ],
  'tecnologia-ropa': [
    { id: 'artesanias', name: 'Artesanías y Recuerdos' },
    { id: 'calzado', name: 'Calzado y Cuero' },
    { id: 'tecnologia', name: 'Accesorios Celulares' },
    { id: 'ropa', name: 'Ropa y Calzado' }
  ]
};

export const PUESTOS = [
  { id: 'mag-p1', name: 'Punto AgroMercado MAG Directo', pasillo: 'Área de Canasta Básica #01', rating: 5.0, contacto: '2210-3300' },
  { id: 'p1', name: 'Pupusería Doña Chilo', pasillo: 'Pasillo 3, Puesto #42', rating: 4.8, contacto: '7844-1100' },
  { id: 'p2', name: 'Pupusería San Miguelito', pasillo: 'Pasillo 3, Puesto #45', rating: 4.6, contacto: '7922-3344' },
  { id: 'p3', name: 'Sopas y Comedero El Güero', pasillo: 'Pasillo 2, Puesto #18', rating: 4.9, contacto: '7199-8877' },
  { id: 'p4', name: 'Frutería El Carmen', pasillo: 'Pasillo 1, Puesto #05', rating: 4.7, contacto: '7766-5544' },
  { id: 'p5', name: 'Verdulería La Bendición', pasillo: 'Pasillo 1, Puesto #12', rating: 4.5, contacto: '7233-4455' },
  { id: 'p6', name: 'Carnicería San José', pasillo: 'Pasillo 5, Puesto #88', rating: 4.9, contacto: '7511-2233' },
  { id: 'p7', name: 'Lácteos Petacones y Mas', pasillo: 'Pasillo 4, Puesto #60', rating: 4.8, contacto: '7400-9988' },
  { id: 'exc-1', name: 'Artesanías y Calzado El Salvador Ex-Cuartel', pasillo: 'Sector A, Local #108', rating: 4.9, contacto: '7899-2211' },
  { id: 'sm-1', name: 'Pollo y Carnes San Marcos', pasillo: 'Sector Central #15', rating: 4.8, contacto: '7744-3322' },
  { id: 'hh-1', name: 'Novedades y Tecnología Hula Hula', pasillo: 'Nivel 2, Local #204', rating: 4.9, contacto: '7300-1122' },
  { id: 'mc-1', name: 'Distribuidora Lácteos y Abarrotes Central', pasillo: 'Edificio 4, Local #12', rating: 4.8, contacto: '7655-4433' },
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
  // --- MERCADO EX-CUARTEL (ARTESANÍAS, CALZADO, ROPA) ---
  {
    id: 'exc-prod-1',
    name: 'Hamaca Salvadoreña Matrimonial Tejida de Algodón',
    departamentoId: 'tecnologia-ropa',
    lineaId: 'artesanias',
    puestoId: 'exc-1',
    puestoName: 'Artesanías y Calzado El Salvador Ex-Cuartel',
    pasillo: 'Sector A, Local #108',
    price: 22.00,
    unit: 'unidad',
    mercadoId: 'excuartel',
    mercadoName: 'Mercado Ex-Cuartel',
    mercadoType: 'municipal',
    badge: '🏺 Mercado Ex-Cuartel',
    image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=400&q=80',
    description: 'Hamaca artesanal salvadoreña tejida a mano con hilos de algodón multicolor resistente.'
  },
  {
    id: 'exc-prod-2',
    name: 'Zapato de Cuero Artesanal Cosido a Mano',
    departamentoId: 'tecnologia-ropa',
    lineaId: 'calzado',
    puestoId: 'exc-1',
    puestoName: 'Artesanías y Calzado El Salvador Ex-Cuartel',
    pasillo: 'Sector A, Local #108',
    price: 16.50,
    unit: 'par',
    mercadoId: 'excuartel',
    mercadoName: 'Mercado Ex-Cuartel',
    mercadoType: 'municipal',
    badge: '👞 Mercado Ex-Cuartel',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80',
    description: 'Calzado formal/casual 100% cuero vacuno fabricado por artesanos salvadoreños.'
  },

  // --- MERCADO DE SAN MARCOS ---
  {
    id: 'sm-prod-1',
    name: 'Pollo Entero de Granja San Marcos',
    departamentoId: 'carnes-mariscos',
    lineaId: 'pollo',
    puestoId: 'sm-1',
    puestoName: 'Pollo y Carnes San Marcos',
    pasillo: 'Sector Central #15',
    price: 1.45,
    unit: 'libra',
    mercadoId: 'sanmarcos',
    mercadoName: 'Mercado Municipal de San Marcos',
    mercadoType: 'municipal',
    badge: '🏬 San Marcos',
    image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=400&q=80',
    description: 'Pollo fresco entero amarillo de granja, limpio y listo para cocinar.'
  },

  // --- AGROMERCADO MAG (PRODUCTOR DIRECTO / PRECIOS JUSTOS $1.00) ---
  {
    id: 'mag-prod-1',
    name: 'Combo Tomates de Ensalada (25 Tomates Frescos)',
    departamentoId: 'agromercado-mag',
    lineaId: 'mag-combos',
    puestoId: 'mag-p1',
    puestoName: 'Punto AgroMercado MAG Directo',
    pasillo: 'Área Canasta Básica MAG',
    price: 1.00,
    unit: 'combo (25 unidades)',
    mercadoId: 'agromercado-zacamil',
    mercadoName: 'AgroMercado MAG Zacamil',
    mercadoType: 'mag',
    badge: '🟢 Precio Justo MAG $1.00',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80',
    description: 'Tomate rojo directo del productor agrícola. Paquete especial de 25 tomates seleccionados.'
  },
  {
    id: 'mag-prod-2',
    name: 'Combo Cebollas Blancas Seleccionadas (10 Cebollas)',
    departamentoId: 'agromercado-mag',
    lineaId: 'mag-combos',
    puestoId: 'mag-p1',
    puestoName: 'Punto AgroMercado MAG Directo',
    pasillo: 'Área Canasta Básica MAG',
    price: 1.00,
    unit: 'combo (10 unidades)',
    mercadoId: 'agromercado-zacamil',
    mercadoName: 'AgroMercado MAG Zacamil',
    mercadoType: 'mag',
    badge: '🟢 Precio Justo MAG $1.00',
    image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=400&q=80',
    description: 'Cebolla blanca firme y limpia de cosecha nacional.'
  },
  {
    id: 'mag-prod-3',
    name: 'Combo Güisquiles Frescos (7 Güisquiles Tiernos)',
    departamentoId: 'agromercado-mag',
    lineaId: 'mag-combos',
    puestoId: 'mag-p1',
    puestoName: 'Punto AgroMercado MAG Directo',
    pasillo: 'Área Canasta Básica MAG',
    price: 1.00,
    unit: 'combo (7 unidades)',
    mercadoId: 'agromercado-lourdes',
    mercadoName: 'AgroMercado MAG Lourdes',
    mercadoType: 'mag',
    badge: '🟢 Precio Justo MAG $1.00',
    image: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=400&q=80',
    description: 'Güisquil tierno verdoso de altura, ideal para sopas y guisados.'
  },
  {
    id: 'mag-prod-4',
    name: 'Frijol Rojo de Seda MAG (Libra)',
    departamentoId: 'agromercado-mag',
    lineaId: 'mag-granos',
    puestoId: 'mag-p1',
    puestoName: 'Punto AgroMercado MAG Directo',
    pasillo: 'Área Canasta Básica MAG',
    price: 0.75,
    unit: 'libra',
    mercadoId: 'agromercado-zacamil',
    mercadoName: 'AgroMercado MAG Zacamil',
    mercadoType: 'mag',
    badge: '🟢 Precio Justo MAG',
    image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=400&q=80',
    description: 'Frijol nuevo de seda salvadoreño, blando y de excelente cocción.'
  },
  {
    id: 'mag-prod-5',
    name: 'Arroz Blanco de Granja MAG (Libra)',
    departamentoId: 'agromercado-mag',
    lineaId: 'mag-granos',
    puestoId: 'mag-p1',
    puestoName: 'Punto AgroMercado MAG Directo',
    pasillo: 'Área Canasta Básica MAG',
    price: 0.30,
    unit: 'libra',
    mercadoId: 'agromercado-zacamil',
    mercadoName: 'AgroMercado MAG Zacamil',
    mercadoType: 'mag',
    badge: '🟢 Precio Justo MAG',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
    description: 'Arroz blanco seleccionado directo del beneficio agrícola sin intermediarios.'
  },
  {
    id: 'mag-prod-6',
    name: 'Cartón de Huevos Frescos de Granja (30 Huevos)',
    departamentoId: 'agromercado-mag',
    lineaId: 'mag-proteinas',
    puestoId: 'mag-p1',
    puestoName: 'Punto AgroMercado MAG Directo',
    pasillo: 'Área Canasta Básica MAG',
    price: 3.90,
    unit: 'cartón (30 unidades)',
    mercadoId: 'agromercado-zacamil',
    mercadoName: 'AgroMercado MAG Zacamil',
    mercadoType: 'mag',
    badge: '🟢 Precio Justo MAG',
    image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=400&q=80',
    description: 'Cartón de 30 huevos medianos/grandes frescos de granja local.'
  },
  {
    id: 'mag-prod-7',
    name: 'Combo Plátanos Grandes de Cosecha (5 Plátanos)',
    departamentoId: 'agromercado-mag',
    lineaId: 'mag-combos',
    puestoId: 'mag-p1',
    puestoName: 'Punto AgroMercado MAG Directo',
    pasillo: 'Área Canasta Básica MAG',
    price: 1.00,
    unit: 'combo (5 unidades)',
    mercadoId: 'agromercado-lourdes',
    mercadoName: 'AgroMercado MAG Lourdes',
    mercadoType: 'mag',
    badge: '🟢 Precio Justo MAG $1.00',
    image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=400&q=80',
    description: 'Plátano verde/maduro de buen tamaño para freír o sancochar.'
  },

  // --- MERCADO SAN MIGUELITO ---
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
    mercadoId: 'sanmiguelito',
    mercadoName: 'Mercado San Miguelito',
    mercadoType: 'municipal',
    image: 'https://images.unsplash.com/photo-1629731653841-7667a421c609?auto=format&fit=crop&w=400&q=80',
    description: 'Tradicional pupusa de arroz o maíz con abundante queso y loroco fresco.'
  },
  {
    id: 'prod-2',
    name: 'Pupusa Revuelta (Chicharrón, Frijol y Queso)',
    departamentoId: 'comida',
    lineaId: 'pupusas',
    puestoId: 'p1',
    puestoName: 'Pupusería Doña Chilo',
    pasillo: 'Pasillo 3, Puesto #42',
    price: 0.85,
    unit: 'unidad',
    mercadoId: 'sanmiguelito',
    mercadoName: 'Mercado San Miguelito',
    mercadoType: 'municipal',
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
    mercadoId: 'sanmiguelito',
    mercadoName: 'Mercado San Miguelito',
    mercadoType: 'municipal',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80',
    description: 'Incluye tazón de sopa de gallina india, pieza de gallina asada, arroz y tortillas.'
  },

  // --- MERCADO HULA HULA ---
  {
    id: 'hh-prod-1',
    name: 'Audífonos Bluetooth Inalámbricos P9 Pro',
    departamentoId: 'tecnologia-ropa',
    lineaId: 'tecnologia',
    puestoId: 'hh-1',
    puestoName: 'Novedades y Tecnología Hula Hula',
    pasillo: 'Nivel 2, Local #204',
    price: 6.50,
    unit: 'unidad',
    mercadoId: 'hulahula',
    mercadoName: 'Mercado Hula Hula',
    mercadoType: 'municipal',
    badge: '🏬 Hula Hula Nivel 2',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    description: 'Audífonos supraaurales estéreo con cancelación de ruido pasiva y Bluetooth 5.0.'
  },
  {
    id: 'hh-prod-2',
    name: 'Camisa Guayabera Tradicional Salvadoreña',
    departamentoId: 'tecnologia-ropa',
    lineaId: 'ropa',
    puestoId: 'hh-1',
    puestoName: 'Novedades y Tecnología Hula Hula',
    pasillo: 'Nivel 2, Local #204',
    price: 12.00,
    unit: 'unidad',
    mercadoId: 'hulahula',
    mercadoName: 'Mercado Hula Hula',
    mercadoType: 'municipal',
    badge: '🏬 Hula Hula Nivel 2',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80',
    description: 'Camisa guayabera 100% algodón fresca, bordados finos de alta calidad.'
  },

  // --- MERCADO CENTRAL (SAN SALVADOR) ---
  {
    id: 'mc-prod-1',
    name: 'Queso Duro Viejo Salado Petacones Auténtico',
    departamentoId: 'abarrotes',
    lineaId: 'lacteos',
    puestoId: 'mc-1',
    puestoName: 'Distribuidora Lácteos Central',
    pasillo: 'Edificio 4, Local #12',
    price: 3.80,
    unit: 'libra',
    mercadoId: 'central',
    mercadoName: 'Mercado Central',
    mercadoType: 'municipal',
    badge: '🏬 Central Edificio 4',
    image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=400&q=80',
    description: 'Queso rallado duro viejo artesanal de sabor tradicional.'
  },
  {
    id: 'mc-prod-2',
    name: 'Crema Purísima Especial de Vaca',
    departamentoId: 'abarrotes',
    lineaId: 'lacteos',
    puestoId: 'mc-1',
    puestoName: 'Distribuidora Lácteos Central',
    pasillo: 'Edificio 4, Local #12',
    price: 2.25,
    unit: 'libra',
    mercadoId: 'central',
    mercadoName: 'Mercado Central',
    mercadoType: 'municipal',
    badge: '🏬 Central Edificio 4',
    image: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=400&q=80',
    description: 'Crema de ordeño fresca espesa ideal para plátanos o frijoles.'
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
