import { Injectable } from '@angular/core';
import {
  DatosAfiliado,
  Beneficiario,
  TipoAfiliado,
  InformacionSociodemografica,
  InformacionContacto,
  InformacionLaboral,
  InformacionCaracterizacion,
  EstadoCivil,
  Zona,
  Estrato,
  TipoDiscapacidad,
  GrupoEtnico,
  PoblacionLGBTIQ,
} from '../models/afiliado.model';

/**
 * Servicio para mapear datos entre la BD y los modelos de Angular
 */
@Injectable({
  providedIn: 'root'
})
export class AfiliadoMapperService {

  /**
   * Convierte un registro de BD a DatosAfiliado
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbRecordToAfiliado(row: any): DatosAfiliado {
    const afiliado: DatosAfiliado = {
      // Usamos id_hosvital como PK (soporta números y UUIDs)
      id: row['id_hosvital'],
      numeroDocumento: row['numero_documento'] || '',
      primerApellido: row['primer_apellido'] || '',
      segundoApellido: row['segundo_apellido'] || undefined,
      primerNombre: row['primer_nombre'] || '',
      segundoNombre: row['segundo_nombre'] || undefined,
      fechaNacimiento: this.formatDate(row['fecha_nacimiento']),
      genero: row['sexo'] === 'M' || row['sexo'] === 'MASCULINO' ? 'M' : 'F',
      tipoAfiliado: this.mapTipoAfiliado(row['tipo_afiliado']),
      actualizacionPrevia: !!row['fecha_ultima_actualizacion'],
      fechaUltimaActualizacion: row['fecha_ultima_actualizacion'] 
        ? this.formatDate(row['fecha_ultima_actualizacion']) 
        : undefined,
    };

    // Información sociodemográfica
    if (row['estado_civil'] || row['direccion_Residencia_cargue'] || row['departamento_residencia']) {
      afiliado.sociodemografica = {
        estadoCivil: row['estado_civil'] as EstadoCivil | undefined,
        direccion: row['direccion_Residencia_cargue'] || '',
        zona: (row['zona']?.toLowerCase() as Zona) || 'urbano',
        barrio: row['barrio'] || undefined,
        localidad: row['localidad'] || undefined,
        departamento: row['departamento_residencia'] || row['departamento_atencion'] || '',
        municipio: row['municipio_residencia'] || row['municipio_atencion'] || '',
        estrato: row['estrato'] as Estrato || 1,
      };
    }

    // Información de contacto
    if (row['correo_principal'] || row['celular_principal'] || row['telefono']) {
      afiliado.contacto = {
        correoElectronico: row['correo_principal'] || '',
        celular: row['celular_principal'] || '',
        telefonoFijo: row['telefono'] || undefined,
      };
    }

    // Información laboral
    if (row['secretaria_educacion'] || row['institucion_educativa'] || row['cargo']) {
      afiliado.laboral = {
        tipoAfiliado: afiliado.tipoAfiliado,
        secretariaEducacion: row['secretaria_educacion'] || undefined,
        institucionEducativa: row['institucion_educativa'] || undefined,
        cargo: row['cargo'] || undefined,
        escalafon: row['escalafon'] || undefined,
        gradoEscalafon: row['grado_escalafon'] || undefined,
        fechaPension: row['fecha_pension'] ? this.formatDate(row['fecha_pension']) : undefined,
      };
    }

    // Información de caracterización
    if (row['tiene_discapacidad'] !== null || row['pertenece_grupo_etnico'] !== null || row['pertenece_lgbtiq'] !== null) {
      afiliado.caracterizacion = {
        tipoDiscapacidad: row['tipo_discapacidad'] 
          ? this.parseCommaSeparated<TipoDiscapacidad>(row['tipo_discapacidad'])
          : undefined,
        detalleDiscapacidad: row['detalle_discapacidad'] || undefined,
        grupoEtnico: row['grupo_etnico'] as GrupoEtnico | undefined,
        poblacionLGBTIQ: row['poblacion_lgbtiq'] as PoblacionLGBTIQ | undefined,
        observaciones: row['observaciones'] || undefined,
      };
    }

    return afiliado;
  }

  /**
   * Convierte un registro de BD a Beneficiario
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbRecordToBeneficiario(row: any): Beneficiario {
    const edad = row['edad_cumplida'] || this.calcularEdad(row['fecha_nacimiento']);
    
    const beneficiario: Beneficiario = {
      // Usamos id_hosvital como PK (soporta números y UUIDs)
      id: row['id_hosvital'],
      numeroDocumento: row['numero_documento'] || '',
      tipoDocumento: this.mapTipoDocumento(row['tipo_documento']),
      primerApellido: row['primer_apellido'] || '',
      segundoApellido: row['segundo_apellido'] || undefined,
      primerNombre: row['primer_nombre'] || '',
      segundoNombre: row['segundo_nombre'] || undefined,
      fechaNacimiento: this.formatDate(row['fecha_nacimiento']),
      edad: edad,
      parentesco: this.mapParentesco(row['parentesco']),
      seleccionado: false,
      actualizado: false,
    };

    // Información sociodemográfica del beneficiario
    if (row['estado_civil'] || row['direccion_Residencia_cargue'] || row['departamento_residencia']) {
      beneficiario.sociodemografica = {
        estadoCivil: row['estado_civil'] as EstadoCivil | undefined,
        direccion: row['direccion_Residencia_cargue'] || '',
        zona: (row['zona']?.toLowerCase() as Zona) || 'urbano',
        barrio: row['barrio'] || undefined,
        localidad: row['localidad'] || undefined,
        departamento: row['departamento_residencia'] || row['departamento_atencion'] || '',
        municipio: row['municipio_residencia'] || row['municipio_atencion'] || '',
        estrato: row['estrato'] as Estrato || 1,
      };
    }

    // Información de contacto (solo para mayores de edad)
    if (edad >= 18 && (row['correo_principal'] || row['celular_principal'])) {
      beneficiario.contacto = {
        correoElectronico: row['correo_principal'] || '',
        celular: row['celular_principal'] || '',
        telefonoFijo: row['telefono'] || undefined,
      };
    }

    return beneficiario;
  }

  /**
   * Convierte los datos del afiliado a payload plano para la API
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afiliadoFormToDbPayload(afiliado: DatosAfiliado): any {
    const payload: any = {};

    // Sociodemográfico
    if (afiliado.sociodemografica) {
      const s = afiliado.sociodemografica;
      if (s.estadoCivil) payload['estadoCivil'] = s.estadoCivil;
      if (s.direccion) payload['direccion'] = s.direccion;
      if (s.zona) payload['zona'] = s.zona;
      if (s.barrio) payload['barrio'] = s.barrio;
      if (s.localidad) payload['localidad'] = s.localidad;
      if (s.departamento) payload['departamento'] = s.departamento;
      if (s.municipio) payload['municipio'] = s.municipio;
      if (s.estrato) payload['estrato'] = s.estrato;
    }

    // Contacto
    if (afiliado.contacto) {
      const c = afiliado.contacto;
      if (c.correoElectronico) payload['correoElectronico'] = c.correoElectronico;
      if (c.celular) payload['celular'] = c.celular;
      if (c.telefonoFijo) payload['telefonoFijo'] = c.telefonoFijo;
    }

    // Laboral
    if (afiliado.laboral) {
      const l = afiliado.laboral;
      if (l.secretariaEducacion) payload['secretariaEducacion'] = l.secretariaEducacion;
      if (l.institucionEducativa) payload['institucionEducativa'] = l.institucionEducativa;
      if (l.cargo) payload['cargo'] = l.cargo;
      if (l.escalafon) payload['escalafon'] = l.escalafon;
      if (l.gradoEscalafon) payload['gradoEscalafon'] = l.gradoEscalafon;
      if (l.fechaPension) payload['fechaPension'] = l.fechaPension;
    }

    // Caracterización
    if (afiliado.caracterizacion) {
      const car = afiliado.caracterizacion;
      if (car.tipoDiscapacidad && car.tipoDiscapacidad.length > 0) {
        payload['tieneDiscapacidad'] = true;
        payload['tipoDiscapacidad'] = car.tipoDiscapacidad;
      } else {
        payload['tieneDiscapacidad'] = false;
      }
      if (car.detalleDiscapacidad) payload['detalleDiscapacidad'] = car.detalleDiscapacidad;
      if (car.grupoEtnico) {
        payload['perteneceGrupoEtnico'] = true;
        payload['grupoEtnico'] = car.grupoEtnico;
      } else {
        payload['perteneceGrupoEtnico'] = false;
      }
      if (car.poblacionLGBTIQ) {
        payload['perteneceLGBTIQ'] = true;
        payload['poblacionLGBTIQ'] = car.poblacionLGBTIQ;
      } else {
        payload['perteneceLGBTIQ'] = false;
      }
      if (car.observaciones) payload['observaciones'] = car.observaciones;
    }

    // Habeas Data
    payload['aceptoHabeasData'] = true;

    return payload;
  }

  /**
   * Convierte datos de beneficiario a payload para API
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beneficiarioFormToDbPayload(
    sociodemografica: InformacionSociodemografica,
    contacto?: InformacionContacto
  ): any {
    const payload: any = {};

    // Sociodemográfico
    if (sociodemografica.estadoCivil) payload['estadoCivil'] = sociodemografica.estadoCivil;
    if (sociodemografica.direccion) payload['direccion'] = sociodemografica.direccion;
    if (sociodemografica.zona) payload['zona'] = sociodemografica.zona;
    if (sociodemografica.barrio) payload['barrio'] = sociodemografica.barrio;
    if (sociodemografica.localidad) payload['localidad'] = sociodemografica.localidad;
    if (sociodemografica.departamento) payload['departamento'] = sociodemografica.departamento;
    if (sociodemografica.municipio) payload['municipio'] = sociodemografica.municipio;
    if (sociodemografica.estrato) payload['estrato'] = sociodemografica.estrato;

    // Contacto (solo si se proporciona)
    if (contacto) {
      if (contacto.correoElectronico) payload['correoElectronico'] = contacto.correoElectronico;
      if (contacto.celular) payload['celular'] = contacto.celular;
      if (contacto.telefonoFijo) payload['telefonoFijo'] = contacto.telefonoFijo;
    }

    return payload;
  }

  // =========================================================================
  // Helpers privados
  // =========================================================================

  private mapTipoAfiliado(tipo: string | null | undefined): TipoAfiliado {
    if (!tipo) return 'docente_activo';
    
    const tipoUpper = tipo.toUpperCase();
    if (tipoUpper.includes('PENSIONADO')) return 'pensionado';
    if (tipoUpper.includes('DIRECTIVO')) return 'directivo_activo';
    if (tipoUpper.includes('BENEFICIARIO')) return 'beneficiario';
    return 'docente_activo';
  }

  private mapTipoDocumento(tipo: string | null | undefined): 'CC' | 'TI' | 'RC' | 'CE' {
    if (!tipo) return 'CC';
    
    const tipoUpper = tipo.toUpperCase();
    if (tipoUpper.includes('TI') || tipoUpper.includes('TARJETA')) return 'TI';
    if (tipoUpper.includes('RC') || tipoUpper.includes('REGISTRO')) return 'RC';
    if (tipoUpper.includes('CE') || tipoUpper.includes('EXTRANJER')) return 'CE';
    return 'CC';
  }

  private mapParentesco(parentesco: string | null | undefined): Beneficiario['parentesco'] {
    if (!parentesco) return 'otro';
    
    const p = parentesco.toLowerCase();
    if (p.includes('conyuge') || p.includes('esposo') || p.includes('esposa')) return 'conyuge';
    if (p.includes('hijo') || p.includes('hija')) return 'hijo';
    if (p.includes('padre')) return 'padre';
    if (p.includes('madre')) return 'madre';
    return 'otro';
  }

  private formatDate(date: any): string {
    if (!date) return '';
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    if (typeof date === 'string') {
      // Si ya está en formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
        return date.split('T')[0];
      }
      // Intentar parsear
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    return String(date);
  }

  private calcularEdad(fechaNacimiento: any): number {
    if (!fechaNacimiento) return 0;
    
    const nacimiento = new Date(fechaNacimiento);
    if (isNaN(nacimiento.getTime())) return 0;
    
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  }

  private parseCommaSeparated<T extends string>(value: string): T[] {
    if (!value) return [];
    return value.split(',').map(v => v.trim()).filter(Boolean) as T[];
  }
}
