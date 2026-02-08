-- ============================================================
-- 06-seed-instituciones-sample.sql
-- Datos de ejemplo para instituciones educativas
-- Basado en datos reales del departamento de Tolima
-- ============================================================

USE fomag_poblacion;
GO

-- ════════════════════════════════════════════════════════════
-- 1. Departamentos
-- ════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM geo.departamentos WHERE codigo_departamento = 73)
    INSERT INTO geo.departamentos (codigo_departamento, nombre) VALUES (73, 'TOLIMA');
GO

IF NOT EXISTS (SELECT 1 FROM geo.departamentos WHERE codigo_departamento = 5)
    INSERT INTO geo.departamentos (codigo_departamento, nombre) VALUES (5, 'ANTIOQUIA');
GO

IF NOT EXISTS (SELECT 1 FROM geo.departamentos WHERE codigo_departamento = 11)
    INSERT INTO geo.departamentos (codigo_departamento, nombre) VALUES (11, 'BOGOTÁ D.C.');
GO

-- ════════════════════════════════════════════════════════════
-- 2. Municipios
-- ════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM geo.municipios WHERE codigo_municipio = 73168)
    INSERT INTO geo.municipios (codigo_municipio, nombre, codigo_departamento) VALUES (73168, 'CHAPARRAL', 73);
GO

IF NOT EXISTS (SELECT 1 FROM geo.municipios WHERE codigo_municipio = 73001)
    INSERT INTO geo.municipios (codigo_municipio, nombre, codigo_departamento) VALUES (73001, 'IBAGUÉ', 73);
GO

IF NOT EXISTS (SELECT 1 FROM geo.municipios WHERE codigo_municipio = 73283)
    INSERT INTO geo.municipios (codigo_municipio, nombre, codigo_departamento) VALUES (73283, 'FRESNO', 73);
GO

IF NOT EXISTS (SELECT 1 FROM geo.municipios WHERE codigo_municipio = 5001)
    INSERT INTO geo.municipios (codigo_municipio, nombre, codigo_departamento) VALUES (5001, 'MEDELLÍN', 5);
GO

IF NOT EXISTS (SELECT 1 FROM geo.municipios WHERE codigo_municipio = 11001)
    INSERT INTO geo.municipios (codigo_municipio, nombre, codigo_departamento) VALUES (11001, 'BOGOTÁ D.C.', 11);
GO

-- ════════════════════════════════════════════════════════════
-- 3. Secretarías
-- ════════════════════════════════════════════════════════════
DECLARE @secTolima INT, @secAntioquia INT, @secBogota INT;

IF NOT EXISTS (SELECT 1 FROM ie.secretarias WHERE nombre = 'TOLIMA')
    INSERT INTO ie.secretarias (nombre) VALUES ('TOLIMA');
SELECT @secTolima = id FROM ie.secretarias WHERE nombre = 'TOLIMA';

IF NOT EXISTS (SELECT 1 FROM ie.secretarias WHERE nombre = 'ANTIOQUIA')
    INSERT INTO ie.secretarias (nombre) VALUES ('ANTIOQUIA');
SELECT @secAntioquia = id FROM ie.secretarias WHERE nombre = 'ANTIOQUIA';

IF NOT EXISTS (SELECT 1 FROM ie.secretarias WHERE nombre = 'BOGOTÁ D.C.')
    INSERT INTO ie.secretarias (nombre) VALUES ('BOGOTÁ D.C.');
SELECT @secBogota = id FROM ie.secretarias WHERE nombre = 'BOGOTÁ D.C.';

-- ════════════════════════════════════════════════════════════
-- 4. Establecimientos
-- ════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM ie.establecimientos WHERE codigo_establecimiento = 273168002277)
    INSERT INTO ie.establecimientos (codigo_establecimiento, nombre, codigo_municipio, secretaria_id)
    VALUES (273168002277, 'INSTITUCION EDUCATIVA LA RISALDA', 73168, @secTolima);
GO

-- Re-obtener variables (GO reinicia el batch)
DECLARE @secTolima2 INT;
SELECT @secTolima2 = id FROM ie.secretarias WHERE nombre = 'TOLIMA';

IF NOT EXISTS (SELECT 1 FROM ie.establecimientos WHERE codigo_establecimiento = 273168000010)
    INSERT INTO ie.establecimientos (codigo_establecimiento, nombre, codigo_municipio, secretaria_id)
    VALUES (273168000010, 'INSTITUCION EDUCATIVA TÉCNICA CHAPARRAL', 73168, @secTolima2);

IF NOT EXISTS (SELECT 1 FROM ie.establecimientos WHERE codigo_establecimiento = 273001000150)
    INSERT INTO ie.establecimientos (codigo_establecimiento, nombre, codigo_municipio, secretaria_id)
    VALUES (273001000150, 'INSTITUCIÓN EDUCATIVA TÉCNICA AMBIENTAL COMBEIMA', 73001, @secTolima2);

IF NOT EXISTS (SELECT 1 FROM ie.establecimientos WHERE codigo_establecimiento = 273283000100)
    INSERT INTO ie.establecimientos (codigo_establecimiento, nombre, codigo_municipio, secretaria_id)
    VALUES (273283000100, 'INSTITUCIÓN EDUCATIVA FRESNO', 73283, @secTolima2);
GO

-- ════════════════════════════════════════════════════════════
-- 5. Sedes
-- ════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM ie.sedes WHERE codigo_sede = 273168003273)
    INSERT INTO ie.sedes (codigo_sede, nombre, codigo_establecimiento, zona, direccion, telefono, estado)
    VALUES (273168003273, 'LOS LIRIOS CALARMA', 273168002277, 'RURAL', 'VDA LOS LIRIOS CALARMA', '3142408163', 'ANTIGUO-ACTIVO');

IF NOT EXISTS (SELECT 1 FROM ie.sedes WHERE codigo_sede = 273168003274)
    INSERT INTO ie.sedes (codigo_sede, nombre, codigo_establecimiento, zona, direccion, telefono, estado)
    VALUES (273168003274, 'SEDE PRINCIPAL LA RISALDA', 273168002277, 'RURAL', 'VDA LA RISALDA', '3142408163', 'ANTIGUO-ACTIVO');

IF NOT EXISTS (SELECT 1 FROM ie.sedes WHERE codigo_sede = 273168000011)
    INSERT INTO ie.sedes (codigo_sede, nombre, codigo_establecimiento, zona, direccion, telefono, estado)
    VALUES (273168000011, 'SEDE PRINCIPAL CHAPARRAL', 273168000010, 'URBANA', 'CRA 10 # 8-50', '2460100', 'ANTIGUO-ACTIVO');

IF NOT EXISTS (SELECT 1 FROM ie.sedes WHERE codigo_sede = 273001000151)
    INSERT INTO ie.sedes (codigo_sede, nombre, codigo_establecimiento, zona, direccion, telefono, estado)
    VALUES (273001000151, 'SEDE PRINCIPAL COMBEIMA', 273001000150, 'RURAL', 'VDA JUNTAS', '2669000', 'ANTIGUO-ACTIVO');

IF NOT EXISTS (SELECT 1 FROM ie.sedes WHERE codigo_sede = 273283000101)
    INSERT INTO ie.sedes (codigo_sede, nombre, codigo_establecimiento, zona, direccion, telefono, estado)
    VALUES (273283000101, 'SEDE PRINCIPAL FRESNO', 273283000100, 'URBANA', 'CRA 5 # 3-20', '2528100', 'ANTIGUO-ACTIVO');
GO

-- ════════════════════════════════════════════════════════════
-- 6. Niveles
-- ════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM ie.niveles WHERE nombre = 'PREESCOLAR')
    INSERT INTO ie.niveles (nombre) VALUES ('PREESCOLAR');
IF NOT EXISTS (SELECT 1 FROM ie.niveles WHERE nombre = 'BÁSICA PRIMARIA')
    INSERT INTO ie.niveles (nombre) VALUES ('BÁSICA PRIMARIA');
IF NOT EXISTS (SELECT 1 FROM ie.niveles WHERE nombre = 'BÁSICA SECUNDARIA')
    INSERT INTO ie.niveles (nombre) VALUES ('BÁSICA SECUNDARIA');
IF NOT EXISTS (SELECT 1 FROM ie.niveles WHERE nombre = 'MEDIA')
    INSERT INTO ie.niveles (nombre) VALUES ('MEDIA');
IF NOT EXISTS (SELECT 1 FROM ie.niveles WHERE nombre = 'MEDIA TÉCNICA')
    INSERT INTO ie.niveles (nombre) VALUES ('MEDIA TÉCNICA');
GO

-- ════════════════════════════════════════════════════════════
-- 7. Modelos
-- ════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM ie.modelos WHERE nombre = 'ESCUELA NUEVA')
    INSERT INTO ie.modelos (nombre) VALUES ('ESCUELA NUEVA');
IF NOT EXISTS (SELECT 1 FROM ie.modelos WHERE nombre = 'TRADICIONAL')
    INSERT INTO ie.modelos (nombre) VALUES ('TRADICIONAL');
IF NOT EXISTS (SELECT 1 FROM ie.modelos WHERE nombre = 'POSTPRIMARIA')
    INSERT INTO ie.modelos (nombre) VALUES ('POSTPRIMARIA');
IF NOT EXISTS (SELECT 1 FROM ie.modelos WHERE nombre = 'ACELERACIÓN DEL APRENDIZAJE')
    INSERT INTO ie.modelos (nombre) VALUES ('ACELERACIÓN DEL APRENDIZAJE');
GO

-- ════════════════════════════════════════════════════════════
-- 8. Relaciones many-to-many para sede 273168003273
-- ════════════════════════════════════════════════════════════
DECLARE @nivelPreescolar INT, @nivelPrimaria INT;
SELECT @nivelPreescolar = id FROM ie.niveles WHERE nombre = 'PREESCOLAR';
SELECT @nivelPrimaria = id FROM ie.niveles WHERE nombre = 'BÁSICA PRIMARIA';

IF NOT EXISTS (SELECT 1 FROM ie.sede_niveles WHERE codigo_sede = 273168003273 AND nivel_id = @nivelPreescolar)
    INSERT INTO ie.sede_niveles VALUES (273168003273, @nivelPreescolar);
IF NOT EXISTS (SELECT 1 FROM ie.sede_niveles WHERE codigo_sede = 273168003273 AND nivel_id = @nivelPrimaria)
    INSERT INTO ie.sede_niveles VALUES (273168003273, @nivelPrimaria);

DECLARE @modeloEN INT;
SELECT @modeloEN = id FROM ie.modelos WHERE nombre = 'ESCUELA NUEVA';

IF NOT EXISTS (SELECT 1 FROM ie.sede_modelos WHERE codigo_sede = 273168003273 AND modelo_id = @modeloEN)
    INSERT INTO ie.sede_modelos VALUES (273168003273, @modeloEN);

-- Grados: 0,1,2,3,4,5,22
DECLARE @g0 INT, @g1 INT, @g2 INT, @g3 INT, @g4 INT, @g5 INT, @g22 INT;
SELECT @g0 = id FROM ie.grados WHERE codigo = '0';
SELECT @g1 = id FROM ie.grados WHERE codigo = '1';
SELECT @g2 = id FROM ie.grados WHERE codigo = '2';
SELECT @g3 = id FROM ie.grados WHERE codigo = '3';
SELECT @g4 = id FROM ie.grados WHERE codigo = '4';
SELECT @g5 = id FROM ie.grados WHERE codigo = '5';
SELECT @g22 = id FROM ie.grados WHERE codigo = '22';

IF @g0 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ie.sede_grados WHERE codigo_sede = 273168003273 AND grado_id = @g0)
    INSERT INTO ie.sede_grados VALUES (273168003273, @g0);
IF @g1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ie.sede_grados WHERE codigo_sede = 273168003273 AND grado_id = @g1)
    INSERT INTO ie.sede_grados VALUES (273168003273, @g1);
IF @g2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ie.sede_grados WHERE codigo_sede = 273168003273 AND grado_id = @g2)
    INSERT INTO ie.sede_grados VALUES (273168003273, @g2);
IF @g3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ie.sede_grados WHERE codigo_sede = 273168003273 AND grado_id = @g3)
    INSERT INTO ie.sede_grados VALUES (273168003273, @g3);
IF @g4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ie.sede_grados WHERE codigo_sede = 273168003273 AND grado_id = @g4)
    INSERT INTO ie.sede_grados VALUES (273168003273, @g4);
IF @g5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ie.sede_grados WHERE codigo_sede = 273168003273 AND grado_id = @g5)
    INSERT INTO ie.sede_grados VALUES (273168003273, @g5);
IF @g22 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ie.sede_grados WHERE codigo_sede = 273168003273 AND grado_id = @g22)
    INSERT INTO ie.sede_grados VALUES (273168003273, @g22);
GO

PRINT '✅ Datos de ejemplo insertados exitosamente';
GO
