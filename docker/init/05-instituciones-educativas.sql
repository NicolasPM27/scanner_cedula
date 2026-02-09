-- ============================================================
-- 05-instituciones-educativas.sql
-- Schema normalizado 3NF para Instituciones Educativas
-- Compatible: Azure SQL Database (prod) / Azure SQL Edge (local)
-- ============================================================

USE fomag_poblacion;
GO

-- ────────────────────────────────────────────────────────────
-- Schemas lógicos: geo (geografía) e ie (instituciones educativas)
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'geo')
    EXEC('CREATE SCHEMA geo');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'ie')
    EXEC('CREATE SCHEMA ie');
GO

-- ════════════════════════════════════════════════════════════
-- 1. DIMENSIÓN GEOGRÁFICA (DIVIPOLA)
-- ════════════════════════════════════════════════════════════

-- 1a. Departamentos
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('geo.departamentos') AND type = 'U')
BEGIN
    CREATE TABLE geo.departamentos (
        codigo_departamento  INT            NOT NULL,
        nombre               NVARCHAR(100)  NOT NULL,
        activo               BIT            NOT NULL DEFAULT 1,
        created_at           DATETIME2(0)   NOT NULL DEFAULT CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time' AS DATETIME2(0)),
        CONSTRAINT PK_departamentos PRIMARY KEY CLUSTERED (codigo_departamento)
    );

    -- Índice para búsqueda por nombre
    CREATE NONCLUSTERED INDEX IX_departamentos_nombre
        ON geo.departamentos (nombre);

    PRINT '✅ Tabla geo.departamentos creada';
END
GO

-- 1b. Municipios
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('geo.municipios') AND type = 'U')
BEGIN
    CREATE TABLE geo.municipios (
        codigo_municipio     INT            NOT NULL,
        nombre               NVARCHAR(120)  NOT NULL,
        codigo_departamento  INT            NOT NULL,
        activo               BIT            NOT NULL DEFAULT 1,
        created_at           DATETIME2(0)   NOT NULL DEFAULT CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time' AS DATETIME2(0)),
        CONSTRAINT PK_municipios PRIMARY KEY CLUSTERED (codigo_municipio),
        CONSTRAINT FK_municipios_departamento
            FOREIGN KEY (codigo_departamento)
            REFERENCES geo.departamentos (codigo_departamento)
    );

    -- Índice para cascading dropdown: departamento → municipios
    CREATE NONCLUSTERED INDEX IX_municipios_departamento
        ON geo.municipios (codigo_departamento)
        INCLUDE (nombre);

    PRINT '✅ Tabla geo.municipios creada';
END
GO

-- ════════════════════════════════════════════════════════════
-- 2. DIMENSIÓN ADMINISTRATIVA
-- ════════════════════════════════════════════════════════════

-- 2a. Secretarías de Educación
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('ie.secretarias') AND type = 'U')
BEGIN
    CREATE TABLE ie.secretarias (
        id                   INT IDENTITY(1,1) NOT NULL,
        nombre               NVARCHAR(150)     NOT NULL,
        activo               BIT               NOT NULL DEFAULT 1,
        created_at           DATETIME2(0)      NOT NULL DEFAULT CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time' AS DATETIME2(0)),
        CONSTRAINT PK_secretarias PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_secretarias_nombre UNIQUE (nombre)
    );

    PRINT '✅ Tabla ie.secretarias creada';
END
GO

-- ════════════════════════════════════════════════════════════
-- 3. ENTIDADES EDUCATIVAS
-- ════════════════════════════════════════════════════════════

-- 3a. Establecimientos Educativos (Instituciones)
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('ie.establecimientos') AND type = 'U')
BEGIN
    CREATE TABLE ie.establecimientos (
        codigo_establecimiento  BIGINT          NOT NULL,
        nombre                  NVARCHAR(300)   NOT NULL,
        codigo_municipio        INT             NOT NULL,
        secretaria_id           INT             NOT NULL,
        activo                  BIT             NOT NULL DEFAULT 1,
        created_at              DATETIME2(0)    NOT NULL DEFAULT CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time' AS DATETIME2(0)),
        CONSTRAINT PK_establecimientos PRIMARY KEY CLUSTERED (codigo_establecimiento),
        CONSTRAINT FK_establecimientos_municipio
            FOREIGN KEY (codigo_municipio)
            REFERENCES geo.municipios (codigo_municipio),
        CONSTRAINT FK_establecimientos_secretaria
            FOREIGN KEY (secretaria_id)
            REFERENCES ie.secretarias (id)
    );

    -- Índice para cascading dropdown: municipio → establecimientos
    CREATE NONCLUSTERED INDEX IX_establecimientos_municipio
        ON ie.establecimientos (codigo_municipio)
        INCLUDE (nombre, secretaria_id);

    -- Índice para filtro por secretaría + municipio
    CREATE NONCLUSTERED INDEX IX_establecimientos_secretaria_municipio
        ON ie.establecimientos (secretaria_id, codigo_municipio)
        INCLUDE (nombre);

    PRINT '✅ Tabla ie.establecimientos creada';
END
GO

-- 3b. Sedes (campus/sucursales de un establecimiento)
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('ie.sedes') AND type = 'U')
BEGIN
    CREATE TABLE ie.sedes (
        codigo_sede             BIGINT          NOT NULL,
        nombre                  NVARCHAR(300)   NOT NULL,
        codigo_establecimiento  BIGINT          NOT NULL,
        zona                    NVARCHAR(10)    NOT NULL CHECK (zona IN ('RURAL', 'URBANA')),
        direccion               NVARCHAR(300)   NULL,
        telefono                NVARCHAR(30)    NULL,
        estado                  NVARCHAR(30)    NOT NULL DEFAULT 'ACTIVO',
        activo                  BIT             NOT NULL DEFAULT 1,
        created_at              DATETIME2(0)    NOT NULL DEFAULT CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time' AS DATETIME2(0)),
        CONSTRAINT PK_sedes PRIMARY KEY CLUSTERED (codigo_sede),
        CONSTRAINT FK_sedes_establecimiento
            FOREIGN KEY (codigo_establecimiento)
            REFERENCES ie.establecimientos (codigo_establecimiento)
    );

    -- Índice para cascading dropdown: establecimiento → sedes
    CREATE NONCLUSTERED INDEX IX_sedes_establecimiento
        ON ie.sedes (codigo_establecimiento)
        INCLUDE (nombre, zona, estado);

    PRINT '✅ Tabla ie.sedes creada';
END
GO

-- ════════════════════════════════════════════════════════════
-- 4. CATÁLOGOS EDUCATIVOS (valores normalizados)
-- ════════════════════════════════════════════════════════════

-- 4a. Niveles educativos
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('ie.niveles') AND type = 'U')
BEGIN
    CREATE TABLE ie.niveles (
        id       INT IDENTITY(1,1) NOT NULL,
        nombre   NVARCHAR(100)     NOT NULL,
        CONSTRAINT PK_niveles PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_niveles_nombre UNIQUE (nombre)
    );

    PRINT '✅ Tabla ie.niveles creada';
END
GO

-- 4b. Modelos educativos
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('ie.modelos') AND type = 'U')
BEGIN
    CREATE TABLE ie.modelos (
        id       INT IDENTITY(1,1) NOT NULL,
        nombre   NVARCHAR(150)     NOT NULL,
        CONSTRAINT PK_modelos PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_modelos_nombre UNIQUE (nombre)
    );

    PRINT '✅ Tabla ie.modelos creada';
END
GO

-- 4c. Grados
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('ie.grados') AND type = 'U')
BEGIN
    CREATE TABLE ie.grados (
        id       INT IDENTITY(1,1) NOT NULL,
        codigo   NVARCHAR(10)      NOT NULL,
        nombre   NVARCHAR(80)      NULL,
        CONSTRAINT PK_grados PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_grados_codigo UNIQUE (codigo)
    );

    PRINT '✅ Tabla ie.grados creada';
END
GO

-- ════════════════════════════════════════════════════════════
-- 5. TABLAS PUENTE (many-to-many)
-- ════════════════════════════════════════════════════════════

-- 5a. Sede ↔ Niveles
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('ie.sede_niveles') AND type = 'U')
BEGIN
    CREATE TABLE ie.sede_niveles (
        codigo_sede  BIGINT NOT NULL,
        nivel_id     INT    NOT NULL,
        CONSTRAINT PK_sede_niveles PRIMARY KEY CLUSTERED (codigo_sede, nivel_id),
        CONSTRAINT FK_sede_niveles_sede
            FOREIGN KEY (codigo_sede) REFERENCES ie.sedes (codigo_sede),
        CONSTRAINT FK_sede_niveles_nivel
            FOREIGN KEY (nivel_id) REFERENCES ie.niveles (id)
    );

    PRINT '✅ Tabla ie.sede_niveles creada';
END
GO

-- 5b. Sede ↔ Modelos
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('ie.sede_modelos') AND type = 'U')
BEGIN
    CREATE TABLE ie.sede_modelos (
        codigo_sede  BIGINT NOT NULL,
        modelo_id    INT    NOT NULL,
        CONSTRAINT PK_sede_modelos PRIMARY KEY CLUSTERED (codigo_sede, modelo_id),
        CONSTRAINT FK_sede_modelos_sede
            FOREIGN KEY (codigo_sede) REFERENCES ie.sedes (codigo_sede),
        CONSTRAINT FK_sede_modelos_modelo
            FOREIGN KEY (modelo_id) REFERENCES ie.modelos (id)
    );

    PRINT '✅ Tabla ie.sede_modelos creada';
END
GO

-- 5c. Sede ↔ Grados
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('ie.sede_grados') AND type = 'U')
BEGIN
    CREATE TABLE ie.sede_grados (
        codigo_sede  BIGINT NOT NULL,
        grado_id     INT    NOT NULL,
        CONSTRAINT PK_sede_grados PRIMARY KEY CLUSTERED (codigo_sede, grado_id),
        CONSTRAINT FK_sede_grados_sede
            FOREIGN KEY (codigo_sede) REFERENCES ie.sedes (codigo_sede),
        CONSTRAINT FK_sede_grados_grado
            FOREIGN KEY (grado_id) REFERENCES ie.grados (id)
    );

    PRINT '✅ Tabla ie.sede_grados creada';
END
GO

-- ════════════════════════════════════════════════════════════
-- 6. CATÁLOGO DE GRADOS (seed estático)
-- ════════════════════════════════════════════════════════════

-- Insertar grados estándar del sistema educativo colombiano
IF NOT EXISTS (SELECT 1 FROM ie.grados)
BEGIN
    INSERT INTO ie.grados (codigo, nombre) VALUES
        ('-2', 'Pre-jardín'),
        ('-1', 'Jardín'),
        ('0',  'Transición'),
        ('1',  'Primero'),
        ('2',  'Segundo'),
        ('3',  'Tercero'),
        ('4',  'Cuarto'),
        ('5',  'Quinto'),
        ('6',  'Sexto'),
        ('7',  'Séptimo'),
        ('8',  'Octavo'),
        ('9',  'Noveno'),
        ('10', 'Décimo'),
        ('11', 'Undécimo'),
        ('12', 'Duodécimo'),
        ('13', 'Ciclo 1'),
        ('20', 'Ciclo Complementario 1'),
        ('21', 'Ciclo Complementario 2'),
        ('22', 'Preescolar No Graduado'),
        ('23', 'Aceleración del Aprendizaje'),
        ('24', 'Grupos Juveniles Creativos'),
        ('25', 'Educación para Adultos'),
        ('26', 'Programa para Jóvenes'),
        ('99', 'No Aplica');

    PRINT '✅ Catálogo de grados insertado';
END
GO

-- ════════════════════════════════════════════════════════════
-- 7. VISTA MATERIALIZADA (desnormalizada) PARA API
-- Optimiza las consultas de los selectores cascading
-- ════════════════════════════════════════════════════════════

IF EXISTS (SELECT 1 FROM sys.views WHERE object_id = OBJECT_ID('ie.vw_sedes_completa'))
    DROP VIEW ie.vw_sedes_completa;
GO

CREATE VIEW ie.vw_sedes_completa
WITH SCHEMABINDING
AS
SELECT
    s.codigo_sede,
    s.nombre                    AS sede_nombre,
    s.zona,
    s.direccion,
    s.telefono,
    s.estado,
    e.codigo_establecimiento,
    e.nombre                    AS establecimiento_nombre,
    m.codigo_municipio,
    m.nombre                    AS municipio_nombre,
    d.codigo_departamento,
    d.nombre                    AS departamento_nombre,
    sec.id                      AS secretaria_id,
    sec.nombre                  AS secretaria_nombre
FROM ie.sedes s
    INNER JOIN ie.establecimientos e  ON s.codigo_establecimiento = e.codigo_establecimiento
    INNER JOIN geo.municipios m      ON e.codigo_municipio = m.codigo_municipio
    INNER JOIN geo.departamentos d   ON m.codigo_departamento = d.codigo_departamento
    INNER JOIN ie.secretarias sec    ON e.secretaria_id = sec.id
WHERE s.activo = 1
  AND e.activo = 1
  AND m.activo = 1
  AND d.activo = 1
  AND sec.activo = 1;
GO

PRINT '✅ Vista ie.vw_sedes_completa creada';
GO

-- ════════════════════════════════════════════════════════════
-- 8. TABLA DE CONTROL DE IMPORTACIÓN
-- Rastrea cada carga de datos desde Excel/CSV
-- ════════════════════════════════════════════════════════════

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('ie.importaciones') AND type = 'U')
BEGIN
    CREATE TABLE ie.importaciones (
        id              INT IDENTITY(1,1) NOT NULL,
        archivo_origen  NVARCHAR(256)     NOT NULL,
        registros_total INT               NOT NULL DEFAULT 0,
        registros_ok    INT               NOT NULL DEFAULT 0,
        registros_error INT               NOT NULL DEFAULT 0,
        estado          NVARCHAR(20)      NOT NULL DEFAULT 'PENDIENTE'
                        CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'ERROR')),
        iniciado_en     DATETIME2(0)      NOT NULL DEFAULT CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time' AS DATETIME2(0)),
        completado_en   DATETIME2(0)      NULL,
        errores_detalle NVARCHAR(MAX)     NULL,  -- JSON con detalle de errores
        CONSTRAINT PK_importaciones PRIMARY KEY CLUSTERED (id)
    );

    PRINT '✅ Tabla ie.importaciones creada';
END
GO

PRINT '══════════════════════════════════════════════════';
PRINT '✅ Schema de instituciones educativas 3NF creado';
PRINT '══════════════════════════════════════════════════';
GO
