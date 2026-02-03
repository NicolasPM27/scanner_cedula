import { Injectable, signal, computed } from '@angular/core';
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

  // Datos temporales durante el flujo
  private datosTemporales: {
    sociodemografico?: InformacionSociodemografica;
    contacto?: InformacionContacto;
    laboral?: InformacionLaboral;
    caracterizacion?: InformacionCaracterizacion;
  } = {};

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
      afiliado
    });

    // Navegar a la pantalla de verificación
    await this.router.navigate(['/verification']);
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
    // Simular delay de consulta a BD
    await this.delay(2500);

    const estado = this._estado();
    if (!estado.afiliado) {
      return { existe: false };
    }

    // Simular respuesta de BD (50% de probabilidad de usuario existente)
    const existeEnBD = Math.random() > 0.5;

    if (existeEnBD) {
      // Simular datos existentes
      const beneficiariosSimulados: Beneficiario[] = [
        {
          id: 'ben-001',
          numeroDocumento: '1000000001',
          tipoDocumento: 'TI',
          primerApellido: estado.afiliado.primerApellido,
          segundoApellido: estado.afiliado.segundoApellido,
          primerNombre: 'María',
          segundoNombre: 'José',
          fechaNacimiento: '2010-05-15',
          edad: 15,
          parentesco: 'hijo',
        },
        {
          id: 'ben-002',
          numeroDocumento: '52000000',
          tipoDocumento: 'CC',
          primerApellido: 'García',
          segundoApellido: 'López',
          primerNombre: 'Ana',
          segundoNombre: 'María',
          fechaNacimiento: '1985-08-20',
          edad: 40,
          parentesco: 'conyuge',
        },
      ];

      // Actualizar estado con datos de BD
      this._estado.update(e => ({
        ...e,
        afiliado: {
          ...e.afiliado!,
          actualizacionPrevia: true,
          fechaUltimaActualizacion: '2025-06-15',
          beneficiarios: beneficiariosSimulados,
          contacto: {
            correoElectronico: 'usuario@ejemplo.com',
            celular: '3001234567',
            telefonoFijo: '6011234567',
          },
        },
      }));

      return {
        existe: true,
        afiliado: this._estado().afiliado,
        beneficiarios: beneficiariosSimulados,
      };
    }

    return { existe: false };
  }

  /**
   * Maneja el caso de usuario existente
   */
  async manejarUsuarioExistente(opcion: 'corregir' | 'beneficiario'): Promise<void> {
    if (opcion === 'corregir') {
      this._estado.update(e => ({
        ...e,
        paso: 'sociodemografico',
        esCorreccion: true,
      }));
      await this.router.navigate(['/forms/sociodemographic']);
    } else {
      this._estado.update(e => ({
        ...e,
        paso: 'seleccion_beneficiarios',
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
      paso: 'sociodemografico',
      esCorreccion: false,
    }));
    await this.router.navigate(['/forms/sociodemographic']);
  }

  /**
   * Guarda información sociodemográfica y avanza
   */
  async guardarSociodemografico(datos: InformacionSociodemografica): Promise<void> {
    this.datosTemporales.sociodemografico = datos;
    
    this._estado.update(e => ({
      ...e,
      paso: 'contacto',
      afiliado: e.afiliado ? {
        ...e.afiliado,
        sociodemografica: datos,
      } : undefined,
    }));

    await this.router.navigate(['/forms/contact']);
  }

  /**
   * Guarda información de contacto y avanza
   */
  async guardarContacto(datos: InformacionContacto): Promise<void> {
    this.datosTemporales.contacto = datos;
    
    const afiliado = this._estado().afiliado;
    const requiereLaboral = afiliado?.tipoAfiliado === 'docente_activo';

    this._estado.update(e => ({
      ...e,
      paso: requiereLaboral ? 'laboral' : 'caracterizacion',
      afiliado: e.afiliado ? {
        ...e.afiliado,
        contacto: datos,
      } : undefined,
    }));

    if (requiereLaboral) {
      await this.router.navigate(['/forms/employment']);
    } else {
      await this.router.navigate(['/forms/characterization']);
    }
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
   */
  async finalizarActualizacion(): Promise<void> {
    // Aquí se enviarían los datos al servidor
    console.log('Datos finales:', this._estado().afiliado);

    this._estado.update(e => ({
      ...e,
      paso: 'completado',
    }));

    await this.router.navigate(['/confirmacion']);
  }

  /**
   * Reinicia el flujo completo
   */
  reiniciarFlujo(): void {
    this._estado.set({ paso: 'inicio' });
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
      sociodemografico: 'verificacion',
      contacto: 'sociodemografico',
      laboral: 'contacto',
      caracterizacion: this._estado().afiliado?.tipoAfiliado === 'docente_activo' ? 'laboral' : 'contacto',
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

  /**
   * Helper para delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
