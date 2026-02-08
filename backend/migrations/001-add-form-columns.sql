-- ============================================================================
-- Migration 001: Add form columns to fomag.afiliado
-- Database: fomag_db
-- Description: Adds 21 new columns needed by the update forms that don't
--              exist in the normalized schema.
-- ============================================================================

-- Sociodemographic columns
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='zona')
    ALTER TABLE fomag.afiliado ADD zona NVARCHAR(16) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='localidad')
    ALTER TABLE fomag.afiliado ADD localidad NVARCHAR(128) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='barrio')
    ALTER TABLE fomag.afiliado ADD barrio NVARCHAR(128) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='estrato')
    ALTER TABLE fomag.afiliado ADD estrato TINYINT NULL;

-- Labor columns
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='secretaria_educacion')
    ALTER TABLE fomag.afiliado ADD secretaria_educacion NVARCHAR(256) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='institucion_educativa')
    ALTER TABLE fomag.afiliado ADD institucion_educativa NVARCHAR(256) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='cargo')
    ALTER TABLE fomag.afiliado ADD cargo NVARCHAR(128) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='escalafon')
    ALTER TABLE fomag.afiliado ADD escalafon NVARCHAR(64) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='grado_escalafon')
    ALTER TABLE fomag.afiliado ADD grado_escalafon NVARCHAR(64) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='fecha_pension')
    ALTER TABLE fomag.afiliado ADD fecha_pension DATE NULL;

-- Characterization columns
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='tipo_discapacidad')
    ALTER TABLE fomag.afiliado ADD tipo_discapacidad NVARCHAR(256) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='detalle_discapacidad')
    ALTER TABLE fomag.afiliado ADD detalle_discapacidad NVARCHAR(500) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='pertenece_grupo_etnico')
    ALTER TABLE fomag.afiliado ADD pertenece_grupo_etnico BIT NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='grupo_etnico')
    ALTER TABLE fomag.afiliado ADD grupo_etnico NVARCHAR(128) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='pertenece_lgbtiq')
    ALTER TABLE fomag.afiliado ADD pertenece_lgbtiq BIT NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='poblacion_lgbtiq')
    ALTER TABLE fomag.afiliado ADD poblacion_lgbtiq NVARCHAR(128) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='observaciones')
    ALTER TABLE fomag.afiliado ADD observaciones NVARCHAR(1000) NULL;

-- Audit / consent columns
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='acepto_habeas_data')
    ALTER TABLE fomag.afiliado ADD acepto_habeas_data BIT NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='fecha_acepto_habeas_data')
    ALTER TABLE fomag.afiliado ADD fecha_acepto_habeas_data DATETIME2 NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='fecha_ultima_actualizacion')
    ALTER TABLE fomag.afiliado ADD fecha_ultima_actualizacion DATETIME2 NULL;

-- Beneficiary linkage
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fomag' AND TABLE_NAME='afiliado' AND COLUMN_NAME='numero_documento_cotizante')
    ALTER TABLE fomag.afiliado ADD numero_documento_cotizante VARCHAR(100) NULL;

PRINT 'Migration 001 completed: 21 form columns added to fomag.afiliado';
