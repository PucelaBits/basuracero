BEGIN;
ALTER TABLE incidencias ADD COLUMN direccion_json TEXT;
COMMIT;