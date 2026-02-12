import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  DatosAfiliado,
  Beneficiario,
  EstadoFlujo,
  PasoFlujo,
  InformacionSociodemografica,
  InformacionContacto,
  InformacionLaboral,
  InformacionCaracterizacion,
} from '../models/afiliado.model';
import { CedulaData } from '../models/cedula.model';
import { PoblacionApiService } from './poblacion-api.service';
import { AfiliadoMapperService } from './afiliado-mapper.service';

/**
 * Servicio para gestionar el flujo de actualización de datos
 * Mantiene el estado global del proceso y coordina la navegación
 */
@Injectable({
  providedIn: 'root'
})
export class FlujoActualizacionService {
  // Estado reactivo del flujo
  private _estado = signal<EstadoFlujo>({
    paso: 'inicio'
  });

  // Señales computadas para acceso fácil
  readonly estado = this._estado.asReadonly();
  readonly pasoActual = computed(() => this._estado().paso);
  readonly afiliado = computed(() => this._estado().afiliado);
  readonly beneficiarioSeleccionado = computed(() => this._estado().beneficiarioSeleccionado);
  readonly esCorreccion = computed(() => this._estado().esCorreccion);
  readonly esCreacion = computed(() => this._estado().esCreacion);

  // Datos temporales durante el flujo
  private datosTemporales: {
    sociodemografico?: InformacionSociodemografica;
    contacto?: InformacionContacto;
    laboral?: InformacionLaboral;
    caracterizacion?: InformacionCaracterizacion;
  } = {};

  // Servicios inyectados
  private readonly apiService = inject(PoblacionApiService);
  private readonly mapperService = inject(AfiliadoMapperService);

  constructor(private router: Router) {}

  /**
   * Inicia el flujo con los datos escaneados de la cédula
   */
  async iniciarFlujo(datosCedula: CedulaData): Promise<void> {
    // Mapear datos de cédula a datos de afiliado
    const afiliado: DatosAfiliado = {
      numeroDocumento: datosCedula.numeroDocumento,
      primerApellido: datosCedula.primerApellido,
      segundoApellido: datosCedula.segundoApellido,
      primerNombre: datosCedula.primerNombre,
      segundoNombre: datosCedula.segundoNombre,
      fechaNacimiento: datosCedula.fechaNacimiento,
      genero: datosCedula.genero === 'M' ? 'M' : 'F',
      tipoAfiliado: 'docente_activo', // Por defecto, se puede cambiar después
    };

    this._estado.set({
      paso: 'verificacion',
      afiliado,
      esCreacion: false,
    });

    // Navegar a la pantalla de verificación
    await this.router.navigate(['/verification']);
  }

  /**
   * Inicia el flujo con datos de prueba (solo para desarrollo de UI)
   */
  async iniciarBypassDemo(): Promise<void> {
    const afiliado: DatosAfiliado = {
      numeroDocumento: '1002345678',
      primerApellido: 'Gómez',
      segundoApellido: 'Rojas',
      primerNombre: 'Laura',
      segundoNombre: 'Camila',
      fechaNacimiento: '1989-03-12',
      genero: 'F',
      tipoAfiliado: 'docente_activo',
      sociodemografica: {
        estadoCivil: 'casado',
        zona: 'urbano',
        departamento: '11',
        municipio: '11001',
        localidad: '11',
        barrio: '007',
        direccion: 'Cra 7 # 72-20',
        estrato: 4,
      },
      contacto: {
        correoElectronico: 'laura.gomez@pruebas.com',
        celular: '3009876543',
        telefonoFijo: '6015551234',
      },
      laboral: {
        tipoAfiliado: 'docente_activo',
        secretariaEducacion: 'SED-BOG',
        institucionEducativa: 'IE-001',
        cargo: 'Docente de Matemáticas',
        escalafon: '2A',
        gradoEscalafon: 'Grado 2',
      },
      caracterizacion: {
        tipoDiscapacidad: ['ninguna'],
        grupoEtnico: 'ninguna',
        poblacionLGBTIQ: 'ninguno',
        observaciones: 'Registro de prueba para UI.',
      },
      actualizacionPrevia: true,
      fechaUltimaActualizacion: '2025-12-01',
    };

    this._estado.set({
      paso: 'contacto',
      afiliado,
      esCorreccion: true,
      esCreacion: false,
    });

    await this.router.navigate(['/forms/contact']);
  }

  /**
   * Simula la verificación en base de datos
   * Retorna los datos del afiliado si existe, o null si es nuevo
   */
  async verificarEnBaseDatos(): Promise<{
    existe: boolean;
    afiliado?: DatosAfiliado;
    beneficiarios?: Beneficiario[];
  }> {
    const estado = this._estado();
    if (!estado.afiliado) {
      return { existe: false };
    }

    const numeroDocumento = estado.afiliado.numeroDocumento;

    // Buscar afiliado en la base de datos
    console.log('🔍 Buscando afiliado:', numeroDocumento);
    const resultado = await this.apiService.buscarAfiliado(numeroDocumento);
    console.log('✅ Respuesta API:', resultado);

    if (!resultado.existe || !resultado.afiliado) {
      console.log('❌ Afiliado no encontrado en BD');
      return { existe: false };
    }

    // Mapear datos de BD a modelo Angular
    const afiliadoDb = this.mapperService.dbRecordToAfiliado(resultado.afiliado);

    // Combinar datos escaneados con datos de BD
    const afiliadoCompleto: DatosAfiliado = {
      ...estado.afiliado,
      ...afiliadoDb,
      // Mantener datos de cédula escaneada
      numeroDocumento: estado.afiliado.numeroDocumento,
      primerApellido: estado.afiliado.primerApellido,
      segundoApellido: estado.afiliado.segundoApellido,
      primerNombre: estado.afiliado.primerNombre,
      segundoNombre: estado.afiliado.segundoNombre,
      fechaNacimiento: estado.afiliado.fechaNacimiento,
      genero: estado.afiliado.genero,
    };

    // Obtener beneficiarios
    let beneficiarios: Beneficiario[] = [];
    try {
      const beneficiariosResp = await this.apiService.obtenerBeneficiarios(numeroDocumento);
      beneficiarios = beneficiariosResp.beneficiarios.map(b => 
        this.mapperService.dbRecordToBeneficiario(b)
      );
    } catch (error) {
      console.warn('No se pudieron obtener beneficiarios:', error);
    }

    // Actualizar estado con datos de BD
    this._estado.update(e => ({
      ...e,
      afiliado: {
        ...afiliadoCompleto,
        beneficiarios,
      },
    }));

    return {
      existe: true,
      afiliado: this._estado().afiliado,
      beneficiarios,
    };
  }

  /**
   * Maneja el caso de usuario existente
   */
  async manejarUsuarioExistente(opcion: 'corregir' | 'beneficiario'): Promise<void> {
    if (opcion === 'corregir') {
      this._estado.update(e => ({
        ...e,
        paso: 'contacto',
        esCorreccion: true,
        esCreacion: false,
      }));
      await this.router.navigate(['/forms/contact']);
    } else {
      this._estado.update(e => ({
        ...e,
        paso: 'seleccion_beneficiarios',
        esCreacion: false,
      }));
      await this.router.navigate(['/beneficiaries']);
    }
  }

  /**
   * Continúa con usuario nuevo (sin registro previo)
   */
  async continuarNuevoUsuario(): Promise<void> {
    this._estado.update(e => ({
      ...e,
      paso: 'contacto',
      esCorreccion: false,
      esCreacion: true,
    }));
    await this.router.navigate(['/forms/contact']);
  }

  /**
   * Inicia flujo admin para creación manual (sin escáner)
   */
  async iniciarCreacionManual(
    identidad: Pick<
      DatosAfiliado,
      | 'numeroDocumento'
      | 'primerNombre'
      | 'segundoNombre'
      | 'primerApellido'
      | 'segundoApellido'
      | 'fechaNacimiento'
      | 'genero'
      | 'tipoAfiliado'
    >
  ): Promise<void> {
    this._estado.set({
      paso: 'contacto',
      afiliado: {
        ...identidad,
        tipoAfiliado: identidad.tipoAfiliado || 'docente_activo',
      },
      esCorreccion: false,
      esCreacion: true,
    });

    await this.router.navigate(['/forms/contact']);
  }

  /**
   * Inicia flujo admin para edición directa de un afiliado existente
   */
  async iniciarEdicionAdmin(afiliado: DatosAfiliado): Promise<void> {
    this._estado.set({
      paso: 'contacto',
      afiliado,
      esCorreccion: true,
      esCreacion: false,
    });

    await this.router.navigate(['/forms/contact']);
  }

  /**
   * Guarda información sociodemográfica y avanza a laboral
   */
  async guardarSociodemografico(datos: InformacionSociodemografica): Promise<void> {
    this.datosTemporales.sociodemografico = datos;
    
    const afiliado = this._estado().afiliado;
    const requiereLaboral = afiliado?.tipoAfiliado === 'docente_activo';

    this._estado.update(e => ({
      ...e,
      paso: requiereLaboral ? 'laboral' : 'caracterizacion',
      afiliado: e.afiliado ? {
        ...e.afiliado,
        sociodemografica: datos,
      } : undefined,
    }));

    if (requiereLaboral) {
      await this.router.navigate(['/forms/employment']);
    } else {
      await this.router.navigate(['/forms/characterization']);
    }
  }

  /**
   * Guarda información de contacto y avanza a sociodemografico
   */
  async guardarContacto(datos: InformacionContacto): Promise<void> {
    this.datosTemporales.contacto = datos;

    this._estado.update(e => ({
      ...e,
      paso: 'sociodemografico',
      afiliado: e.afiliado ? {
        ...e.afiliado,
        contacto: datos,
      } : undefined,
    }));

    await this.router.navigate(['/forms/sociodemographic']);
  }

  /**
   * Guarda información laboral y avanza
   */
  async guardarLaboral(datos: InformacionLaboral): Promise<void> {
    this.datosTemporales.laboral = datos;
    
    this._estado.update(e => ({
      ...e,
      paso: 'caracterizacion',
      afiliado: e.afiliado ? {
        ...e.afiliado,
        laboral: datos,
      } : undefined,
    }));

    await this.router.navigate(['/forms/characterization']);
  }

  /**
   * Omite información laboral (para pensionados)
   */
  async omitirLaboral(): Promise<void> {
    this._estado.update(e => ({
      ...e,
      paso: 'caracterizacion',
    }));
    await this.router.navigate(['/forms/characterization']);
  }

  /**
   * Guarda información de caracterización y avanza a beneficiarios
   */
  async guardarCaracterizacion(datos: InformacionCaracterizacion): Promise<void> {
    this.datosTemporales.caracterizacion = datos;
    
    this._estado.update(e => ({
      ...e,
      paso: 'seleccion_beneficiarios',
      afiliado: e.afiliado ? {
        ...e.afiliado,
        caracterizacion: datos,
      } : undefined,
    }));

    await this.router.navigate(['/beneficiaries']);
  }

  /**
   * Selecciona un beneficiario para actualizar
   */
  async seleccionarBeneficiario(beneficiario: Beneficiario): Promise<void> {
    this._estado.update(e => ({
      ...e,
      paso: 'actualizacion_beneficiario',
      beneficiarioSeleccionado: beneficiario,
    }));

    await this.router.navigate(['/beneficiaries', beneficiario.id]);
  }

  /**
   * Guarda datos del beneficiario
   */
  async guardarDatosBeneficiario(
    beneficiarioId: string,
    sociodemografico: InformacionSociodemografica,
    contacto?: InformacionContacto
  ): Promise<void> {
    this._estado.update(e => {
      const beneficiarios = e.afiliado?.beneficiarios?.map(b => {
        if (b.id === beneficiarioId) {
          return {
            ...b,
            sociodemografica: sociodemografico,
            contacto: b.edad >= 18 ? contacto : undefined,
            actualizado: true,
          };
        }
        return b;
      });

      return {
        ...e,
        paso: 'seleccion_beneficiarios',
        afiliado: e.afiliado ? {
          ...e.afiliado,
          beneficiarios,
        } : undefined,
        beneficiarioSeleccionado: undefined,
      };
    });

    await this.router.navigate(['/beneficiaries']);
  }

  /**
   * Finaliza el proceso de actualización
   * Envía los datos al servidor
   */
  async finalizarActualizacion(): Promise<void> {
    const estado = this._estado();
    const afiliado = estado.afiliado;
    const esCreacion = estado.esCreacion === true;
    
    console.log('🔄 Iniciando finalizarActualizacion');
    console.log(
      '🔄 Afiliado actual:',
      afiliado ? { id: afiliado.id, nombre: afiliado.primerNombre, esCreacion } : 'null'
    );
    
    if (!afiliado) {
      console.error('❌ No hay afiliado para guardar');
      throw new Error('No hay afiliado para guardar');
    }

    if (!esCreacion && !afiliado.id) {
      console.error('❌ No hay afiliado o falta ID');
      throw new Error('No hay afiliado para actualizar o falta el ID');
    }

    // Preparar payload para el afiliado
    console.log('📦 Preparando payload...');
    const payload = this.buildAfiliadoPayload(afiliado);
    console.log('📦 Payload preparado:', JSON.stringify(payload, null, 2));

    if (esCreacion) {
      console.log('💾 Creando afiliado nuevo');
      await this.apiService.crearAfiliado(payload);
      console.log('✅ Afiliado creado exitosamente');
    } else {
      console.log('💾 Enviando actualización de afiliado ID:', afiliado.id);
      await this.apiService.actualizarAfiliado(String(afiliado.id), payload);
      console.log('✅ Afiliado actualizado exitosamente');
    }

    // Actualizar beneficiarios modificados
    if (afiliado.beneficiarios) {
      console.log('👥 Procesando', afiliado.beneficiarios.length, 'beneficiarios');
      for (const beneficiario of afiliado.beneficiarios) {
        if (beneficiario.actualizado && beneficiario.id) {
          console.log('💾 Actualizando beneficiario ID:', beneficiario.id);
          const benefPayload = this.mapperService.beneficiarioFormToDbPayload(
            beneficiario.sociodemografica!,
            beneficiario.contacto
          );
          await this.apiService.actualizarBeneficiario(String(beneficiario.id), benefPayload);
          console.log('✅ Beneficiario actualizado:', beneficiario.id);
        }
      }
    }

    this._estado.update(e => ({
      ...e,
      paso: 'completado',
    }));

    await this.router.navigate(['/confirmation']);
  }

  /**
   * Reinicia el flujo completo
   */
  reiniciarFlujo(): void {
    this._estado.set({ paso: 'inicio', esCreacion: false });
    this.datosTemporales = {};
    this.router.navigate(['/home']);
  }

  /**
   * Establece el tipo de afiliado
   */
  setTipoAfiliado(tipo: DatosAfiliado['tipoAfiliado']): void {
    this._estado.update(e => ({
      ...e,
      afiliado: e.afiliado ? {
        ...e.afiliado,
        tipoAfiliado: tipo,
      } : undefined,
    }));
  }

  /**
   * Retrocede al paso anterior
   */
  async retroceder(): Promise<void> {
    const pasoActual = this._estado().paso;
    const mapaRetroceso: Record<PasoFlujo, PasoFlujo> = {
      inicio: 'inicio',
      escaneo: 'inicio',
      verificacion: 'escaneo',
      usuario_existente: 'verificacion',
      contacto: 'verificacion',
      sociodemografico: 'contacto',
      laboral: 'sociodemografico',
      caracterizacion: this._estado().afiliado?.tipoAfiliado === 'docente_activo' ? 'laboral' : 'sociodemografico',
      seleccion_beneficiarios: 'caracterizacion',
      actualizacion_beneficiario: 'seleccion_beneficiarios',
      confirmacion: 'seleccion_beneficiarios',
      completado: 'confirmacion',
    };

    const pasoAnterior = mapaRetroceso[pasoActual];
    this._estado.update(e => ({ ...e, paso: pasoAnterior }));

    // Navegar según el paso
    const rutasMapa: Record<PasoFlujo, string> = {
      inicio: '/home',
      escaneo: '/scanner',
      verificacion: '/verification',
      usuario_existente: '/verification',
      sociodemografico: '/forms/sociodemographic',
      contacto: '/forms/contact',
      laboral: '/forms/employment',
      caracterizacion: '/forms/characterization',
      seleccion_beneficiarios: '/beneficiaries',
      actualizacion_beneficiario: '/beneficiaries',
      confirmacion: '/confirmation',
      completado: '/confirmation',
    };

    await this.router.navigate([rutasMapa[pasoAnterior]]);
  }

  private buildAfiliadoPayload(afiliado: DatosAfiliado): Record<string, any> {
    const payload = this.mapperService.afiliadoFormToDbPayload(afiliado);

    payload['numeroDocumento'] = afiliado.numeroDocumento;
    payload['primerNombre'] = afiliado.primerNombre;
    payload['segundoNombre'] = afiliado.segundoNombre;
    payload['primerApellido'] = afiliado.primerApellido;
    payload['segundoApellido'] = afiliado.segundoApellido;
    payload['fechaNacimiento'] = afiliado.fechaNacimiento;
    payload['genero'] = afiliado.genero;
    payload['tipoAfiliado'] = afiliado.laboral?.tipoAfiliado || afiliado.tipoAfiliado;
    payload['tipoDocumentoId'] = 1;

    return payload;
  }
}
