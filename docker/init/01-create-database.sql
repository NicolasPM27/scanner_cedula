CREATE DATABASE fomag_poblacion;
GO

USE fomag_poblacion;
GO

CREATE TABLE poblacion (
    id_hosvital                    NVARCHAR(128),
    primer_nombre                  NVARCHAR(128),
    segundo_nombre                 NVARCHAR(128),
    primer_apellido                NVARCHAR(128),
    segundo_apellido               NVARCHAR(128),
    tipo_documento                 NVARCHAR(64),
    numero_documento               NVARCHAR(64),
    sexo                           NVARCHAR(32),
    edad_cumplida                  INT,
    fecha_nacimiento               DATE,
    parentesco                     NVARCHAR(64),
    tipo_afiliado                  NVARCHAR(64),
    fecha_afiliacion               DATE,
    fecharetiro                    DATE NULL,
    tipo_documento_cotizante       NVARCHAR(64),
    tipo_cotizante                 NVARCHAR(64),
    numero_documento_cotizante     NVARCHAR(64),
    estado_afiliacion              NVARCHAR(32),
    codigo_dane_depto_atencion     INT,
    departamento_atencion          NVARCHAR(128),
    codigo_dane_municipio_atencion INT,
    municipio_atencion             NVARCHAR(128),
    IPS_Primaria                   NVARCHAR(512),
    telefono                       NVARCHAR(32),
    celular_principal              NVARCHAR(32),
    celular_alterno                NVARCHAR(32),
    correo_principal               NVARCHAR(256),
    direccion_Residencia_cargue    NVARCHAR(512),
    zona                           NVARCHAR(64),
    region                         NVARCHAR(64),
    nit                            NVARCHAR(64),
    nombre_prestador               NVARCHAR(512),
    discapacidad                   NVARCHAR(128),
    grado_discapacidad             NVARCHAR(128),
    afiliado_id                    INT,
    entidad_id                     INT,
    codigo_habilitacion_sede_prim  NVARCHAR(64),
    municipio_residencia           NVARCHAR(128),
    departamento_residencia        NVARCHAR(128)
);
GO

-- Indices para columnas usadas en el procesamiento
CREATE INDEX IX_poblacion_nit ON poblacion (nit);
CREATE INDEX IX_poblacion_departamento_atencion ON poblacion (departamento_atencion);
CREATE INDEX IX_poblacion_municipio_atencion ON poblacion (municipio_atencion);
CREATE INDEX IX_poblacion_edad_cumplida ON poblacion (edad_cumplida);
CREATE INDEX IX_poblacion_sexo ON poblacion (sexo);
CREATE INDEX IX_poblacion_estado_afiliacion ON poblacion (estado_afiliacion);
GO
