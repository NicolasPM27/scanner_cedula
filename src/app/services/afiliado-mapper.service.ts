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
 * Servicio para mapear datos entre la BD normalizada (fomag.afiliado) y los modelos de Angular.
 *
 * The backend SELECT queries JOIN catalog tables and return both FK IDs and
 * human-readable name/code columns (e.g. tipo_afiliado_nombre, departamento_codigo).
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
      id: row['numero_documento'] || row['afiliado_id'],
      numeroDocumento: row['numero_documento'] || '',
      primerApellido: row['primer_apellido'] || '',
      segundoApellido: row['segundo_apellido'] || undefined,
      primerNombre: row['primer_nombre'] || '',
      segundoNombre: row['segundo_nombre'] || undefined,
      fechaNacimiento: this.formatDate(row['fecha_nacimiento']),
      genero: this.mapSexoId(row['sexo_id']),
      tipoAfiliado: this.mapTipoAfiliadoFromId(row['tipo_afiliado_id'], row['tipo_afiliado_nombre']),
      actualizacionPrevia: !!row['fecha_ultima_actualizacion'],
      fechaUltimaActualizacion: row['fecha_ultima_actualizacion']
        ? this.formatDate(row['fecha_ultima_actualizacion'])
        : undefined,
    };

    // Sociodemographic
    if (row['estado_civil_id'] || row['direccion'] || row['departamento_residencia_id']) {
      afiliado.sociodemografica = {
        estadoCivil: this.mapEstadoCivilFromId(row['estado_civil_id']) as EstadoCivil | undefined,
        direccion: row['direccion'] || '',
        zona: (row['zona']?.toLowerCase() as Zona) || 'urbano',
        barrio: row['barrio'] || undefined,
        localidad: row['localidad'] || undefined,
        departamento: row['departamento_codigo'] || '',
        municipio: row['municipio_codigo'] || '',
        estrato: row['estrato'] as Estrato || 1,
      };
    }

    // Contact
    if (row['email'] || row['celular'] || row['telefono']) {
      afiliado.contacto = {
        correoElectronico: row['email'] || '',
        celular: row['celular'] || '',
        telefonoFijo: row['telefono'] || undefined,
      };
    }

    // Labor
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

    // Characterization
    if (row['discapacidad_id'] != null || row['pertenece_grupo_etnico'] != null || row['pertenece_lgbtiq'] != null) {
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
    const edad = this.calcularEdad(row['fecha_nacimiento']);

    const beneficiario: Beneficiario = {
      id: row['numero_documento'] || row['afiliado_id'],
      numeroDocumento: row['numero_documento'] || '',
      tipoDocumento: this.mapTipoDocumentoCodigo(row['tipo_documento_codigo']),
      primerApellido: row['primer_apellido'] || '',
      segundoApellido: row['segundo_apellido'] || undefined,
      primerNombre: row['primer_nombre'] || '',
      segundoNombre: row['segundo_nombre'] || undefined,
      fechaNacimiento: this.formatDate(row['fecha_nacimiento']),
      edad: edad,
      parentesco: this.mapParentescoFromNombre(row['parentesco_nombre'], row['parentesco_id']),
      seleccionado: false,
      actualizado: false,
    };

    // Sociodemographic
    if (row['estado_civil_id'] || row['direccion'] || row['departamento_residencia_id']) {
      beneficiario.sociodemografica = {
        estadoCivil: this.mapEstadoCivilFromId(row['estado_civil_id']) as EstadoCivil | undefined,
        direccion: row['direccion'] || '',
        zona: (row['zona']?.toLowerCase() as Zona) || 'urbano',
        barrio: row['barrio'] || undefined,
        localidad: row['localidad'] || undefined,
        departamento: row['departamento_codigo'] || '',
        municipio: row['municipio_codigo'] || '',
        estrato: row['estrato'] as Estrato || 1,
      };
    }

    // Contact (only for adults)
    if (edad >= 18 && (row['email'] || row['celular'])) {
      beneficiario.contacto = {
        correoElectronico: row['email'] || '',
        celular: row['celular'] || '',
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

    // Sociodemographic
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

    // Contact
    if (afiliado.contacto) {
      const c = afiliado.contacto;
      if (c.correoElectronico) payload['correoElectronico'] = c.correoElectronico;
      if (c.celular) payload['celular'] = c.celular;
      if (c.telefonoFijo) payload['telefonoFijo'] = c.telefonoFijo;
    }

    // Labor
    if (afiliado.laboral) {
      const l = afiliado.laboral;
      if (l.secretariaEducacion) payload['secretariaEducacion'] = l.secretariaEducacion;
      if (l.institucionEducativa) payload['institucionEducativa'] = l.institucionEducativa;
      if (l.cargo) payload['cargo'] = l.cargo;
      if (l.escalafon) payload['escalafon'] = l.escalafon;
      if (l.gradoEscalafon) payload['gradoEscalafon'] = l.gradoEscalafon;
      if (l.fechaPension) payload['fechaPension'] = l.fechaPension;
    }

    // Characterization
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

    // Sociodemographic
    if (sociodemografica.estadoCivil) payload['estadoCivil'] = sociodemografica.estadoCivil;
    if (sociodemografica.direccion) payload['direccion'] = sociodemografica.direccion;
    if (sociodemografica.zona) payload['zona'] = sociodemografica.zona;
    if (sociodemografica.barrio) payload['barrio'] = sociodemografica.barrio;
    if (sociodemografica.localidad) payload['localidad'] = sociodemografica.localidad;
    if (sociodemografica.departamento) payload['departamento'] = sociodemografica.departamento;
    if (sociodemografica.municipio) payload['municipio'] = sociodemografica.municipio;
    if (sociodemografica.estrato) payload['estrato'] = sociodemografica.estrato;

    // Contact
    if (contacto) {
      if (contacto.correoElectronico) payload['correoElectronico'] = contacto.correoElectronico;
      if (contacto.celular) payload['celular'] = contacto.celular;
      if (contacto.telefonoFijo) payload['telefonoFijo'] = contacto.telefonoFijo;
    }

    return payload;
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /**
   * Maps sexo_id (1=M, 2=F) to gender char
   */
  private mapSexoId(sexoId: number | null | undefined): 'M' | 'F' {
    if (sexoId === 1) return 'M';
    if (sexoId === 2) return 'F';
    return 'M'; // default
  }

  /**
   * Maps tipo_afiliado_id → TipoAfiliado string
   * 1=directivo_activo, 2=docente_activo, 3=beneficiario, 4=pensionado
   */
  private mapTipoAfiliadoFromId(id: number | null | undefined, nombre?: string): TipoAfiliado {
    if (id === 1) return 'directivo_activo';
    if (id === 2) return 'docente_activo';
    if (id === 3) return 'beneficiario';
    if (id === 4) return 'pensionado';
    // Fallback to name if available
    if (nombre) {
      const n = nombre.toUpperCase();
      if (n.includes('PENSIONADO')) return 'pensionado';
      if (n.includes('DIRECTIVO')) return 'directivo_activo';
      if (n.includes('BENEFICIARIO')) return 'beneficiario';
    }
    return 'docente_activo';
  }

  /**
   * Maps estado_civil_id → EstadoCivil string
   * 1=soltero, 2=casado, 3=union_libre, 5=viudo
   */
  private mapEstadoCivilFromId(id: number | null | undefined): string | undefined {
    if (id === 1) return 'soltero';
    if (id === 2) return 'casado';
    if (id === 3) return 'union_libre';
    if (id === 5) return 'viudo';
    return undefined;
  }

  /**
   * Maps tipo_documento_codigo → document type
   */
  private mapTipoDocumentoCodigo(codigo: string | null | undefined): 'CC' | 'TI' | 'RC' | 'CE' {
    if (!codigo) return 'CC';
    const c = codigo.toUpperCase();
    if (c === 'TI' || c.includes('TARJETA')) return 'TI';
    if (c === 'RC' || c.includes('REGISTRO')) return 'RC';
    if (c === 'CE' || c.includes('EXTRANJER')) return 'CE';
    return 'CC';
  }

  /**
   * Maps parentesco from JOINed nombre or parentesco_id
   */
  private mapParentescoFromNombre(
    nombre: string | null | undefined,
    id?: number | null
  ): Beneficiario['parentesco'] {
    if (nombre) {
      const p = nombre.toLowerCase();
      if (p.includes('conyuge') || p.includes('esposo') || p.includes('esposa')) return 'conyuge';
      if (p.includes('hijo') || p.includes('hija')) return 'hijo';
      if (p.includes('padre')) return 'padre';
      if (p.includes('madre')) return 'madre';
    }
    return 'otro';
  }

  private formatDate(date: any): string {
    if (!date) return '';
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    if (typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
        return date.split('T')[0];
      }
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
