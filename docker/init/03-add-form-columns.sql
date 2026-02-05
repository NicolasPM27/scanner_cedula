-- ============================================================
-- Columnas adicionales para campos de formularios de
-- registro/actualización que no existían en la BD original.
-- Todas son NULL para no afectar registros existentes.
-- ============================================================

USE fomag_poblacion;
GO

-- Form 1: Sociodemográfico
ALTER TABLE poblacion ADD estado_civil          NVARCHAR(64)   NULL;
ALTER TABLE poblacion ADD estrato               INT            NULL;
ALTER TABLE poblacion ADD localidad             NVARCHAR(128)  NULL;
ALTER TABLE poblacion ADD barrio                NVARCHAR(128)  NULL;
GO

-- Form 3: Laboral
ALTER TABLE poblacion ADD secretaria_educacion  NVARCHAR(256)  NULL;
ALTER TABLE poblacion ADD institucion_educativa NVARCHAR(256)  NULL;
ALTER TABLE poblacion ADD cargo                 NVARCHAR(128)  NULL;
ALTER TABLE poblacion ADD escalafon             NVARCHAR(64)   NULL;
ALTER TABLE poblacion ADD grado_escalafon       NVARCHAR(64)   NULL;
GO

-- Form 4: Caracterización
ALTER TABLE poblacion ADD tiene_discapacidad     BIT            NULL;
ALTER TABLE poblacion ADD tipo_discapacidad      NVARCHAR(512)  NULL;
ALTER TABLE poblacion ADD detalle_discapacidad   NVARCHAR(1000) NULL;
ALTER TABLE poblacion ADD pertenece_grupo_etnico BIT           NULL;
ALTER TABLE poblacion ADD grupo_etnico           NVARCHAR(128) NULL;
ALTER TABLE poblacion ADD pertenece_lgbtiq       BIT           NULL;
ALTER TABLE poblacion ADD poblacion_lgbtiq       NVARCHAR(128) NULL;
ALTER TABLE poblacion ADD observaciones          NVARCHAR(1000) NULL;
GO

-- Auditoría y consentimiento
ALTER TABLE poblacion ADD acepto_habeas_data          BIT        NULL;
ALTER TABLE poblacion ADD fecha_acepto_habeas_data    DATETIME2  NULL;
ALTER TABLE poblacion ADD fecha_ultima_actualizacion  DATETIME2  NULL;
GO
