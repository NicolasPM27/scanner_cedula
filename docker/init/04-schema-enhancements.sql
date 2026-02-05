-- ============================================================
-- 04-schema-enhancements.sql
-- Mejoras de esquema: PK, columnas faltantes para formularios,
-- índices de búsqueda y campos de auditoría
-- ============================================================

USE fomag_poblacion;
GO

-- Agregar columna ID como Primary Key
-- Primero verificamos si ya existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.poblacion') AND name = 'id')
BEGIN
    ALTER TABLE poblacion ADD id INT IDENTITY(1,1);
    ALTER TABLE poblacion ADD CONSTRAINT PK_poblacion PRIMARY KEY (id);
    PRINT 'Columna id agregada como PK';
END
GO

-- Form 3: Laboral - fecha_pension
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.poblacion') AND name = 'fecha_pension')
BEGIN
    ALTER TABLE poblacion ADD fecha_pension DATE NULL;
    PRINT 'Columna fecha_pension agregada';
END
GO

-- Form 4: Caracterización - campos de discapacidad
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.poblacion') AND name = 'tiene_discapacidad')
BEGIN
    ALTER TABLE poblacion ADD tiene_discapacidad BIT NULL;
    PRINT 'Columna tiene_discapacidad agregada';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.poblacion') AND name = 'tipo_discapacidad')
BEGIN
    ALTER TABLE poblacion ADD tipo_discapacidad NVARCHAR(256) NULL;
    PRINT 'Columna tipo_discapacidad agregada';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.poblacion') AND name = 'detalle_discapacidad')
BEGIN
    ALTER TABLE poblacion ADD detalle_discapacidad NVARCHAR(500) NULL;
    PRINT 'Columna detalle_discapacidad agregada';
END
GO

-- Campos de auditoría
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.poblacion') AND name = 'fecha_ultima_actualizacion')
BEGIN
    ALTER TABLE poblacion ADD fecha_ultima_actualizacion DATETIME2 NULL;
    PRINT 'Columna fecha_ultima_actualizacion agregada';
END
GO

-- Habeas Data - Ley 1581
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.poblacion') AND name = 'acepto_habeas_data')
BEGIN
    ALTER TABLE poblacion ADD acepto_habeas_data BIT NULL;
    PRINT 'Columna acepto_habeas_data agregada';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.poblacion') AND name = 'fecha_acepto_habeas_data')
BEGIN
    ALTER TABLE poblacion ADD fecha_acepto_habeas_data DATETIME2 NULL;
    PRINT 'Columna fecha_acepto_habeas_data agregada';
END
GO

-- Índices para búsquedas por documento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_poblacion_numero_documento' AND object_id = OBJECT_ID('dbo.poblacion'))
BEGIN
    CREATE INDEX IX_poblacion_numero_documento ON poblacion (numero_documento);
    PRINT 'Índice IX_poblacion_numero_documento creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_poblacion_numero_documento_cotizante' AND object_id = OBJECT_ID('dbo.poblacion'))
BEGIN
    CREATE INDEX IX_poblacion_numero_documento_cotizante ON poblacion (numero_documento_cotizante);
    PRINT 'Índice IX_poblacion_numero_documento_cotizante creado';
END
GO

PRINT 'Schema enhancements aplicados exitosamente';
GO
