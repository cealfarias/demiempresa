-- =====================================================================
-- RUMBO: MIGRACIÓN 008 - RADAR GEOFILTRO DE 3 ANILLOS PARA ALERTAS DE CHOFERES
-- Coordenadas GPS en alertas, cálculo de proximidad (Haversine) y corredor de ruta
-- =====================================================================

DO $$ BEGIN
    ALTER TABLE viajes_driver_social_posts 
    ADD COLUMN IF NOT EXISTS location_lat NUMERIC(10, 7) NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_social_posts 
    ADD COLUMN IF NOT EXISTS location_lng NUMERIC(10, 7) NULL;
EXCEPTION WHEN others THEN null; END $$;

CREATE INDEX IF NOT EXISTS idx_driver_social_coords ON viajes_driver_social_posts(location_lat, location_lng);

-- Actualizar coordenadas realistas de las alertas iniciales
UPDATE viajes_driver_social_posts
SET location_lat = 13.6820, location_lng = -89.2680
WHERE location_name ILIKE '%Monseñor Romero%' OR municipality = 'Santa Tecla';

UPDATE viajes_driver_social_posts
SET location_lat = 13.7102, location_lng = -89.1399
WHERE location_name ILIKE '%Plaza Mundo%' OR municipality = 'Soyapango';

UPDATE viajes_driver_social_posts
SET location_lat = 13.7015, location_lng = -89.2150
WHERE location_name ILIKE '%Los Héroes%' OR municipality = 'San Salvador';

UPDATE viajes_driver_social_posts
SET location_lat = 13.7310, location_lng = -89.1680
WHERE location_name ILIKE '%Troncal del Norte%' OR municipality = 'Ciudad Delgado';
