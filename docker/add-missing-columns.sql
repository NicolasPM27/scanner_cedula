USE fomag_poblacion;
GO

-- Columnas de caracterización/discapacidad
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('poblacion') AND name = 'tiene_discapacidad')
    ALTER TABLE poblacion ADD tiene_discapacidad BIT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('poblacion') AND name = 'tipo_discapacidad')
    ALTER TABLE poblacion ADD tipo_discapacidad NVARCHAR(512) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('poblacion') AND name = 'detalle_discapacidad')
    ALTER TABLE poblacion ADD detalle_discapacidad NVARCHAR(1000) NULL;
GO

-- Columnas de auditoría y consentimiento
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('poblacion') AND name = 'acepto_habeas_data')
    ALTER TABLE poblacion ADD acepto_habeas_data BIT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('poblacion') AND name = 'fecha_acepto_habeas_data')
    ALTER TABLE poblacion ADD fecha_acepto_habeas_data DATETIME2 NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('poblacion') AND name = 'fecha_ultima_actualizacion')
    ALTER TABLE poblacion ADD fecha_ultima_actualizacion DATETIME2 NULL;
GO

PRINT 'Columnas agregadas exitosamente';
GO
