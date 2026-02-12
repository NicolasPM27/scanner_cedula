import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  createOutline,
  personAddOutline,
  personCircleOutline,
  pencilOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { PoblacionApiService } from '../../services/poblacion-api.service';
import { AfiliadoMapperService } from '../../services/afiliado-mapper.service';
import { FlujoActualizacionService } from '../../services/flujo-actualizacion.service';
import { DatosAfiliado, TipoAfiliado, TIPOS_AFILIADO } from '../../models/afiliado.model';

@Component({
  selector: 'app-admin-afiliados',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonList,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonLabel,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Administración de Afiliados</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="admin-content">
      <div class="container">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="search-outline"></ion-icon>
              Buscar afiliado
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-input
                [value]="searchQuery()"
                (ionInput)="onSearchInput($event)"
                label="Documento o nombre"
                labelPlacement="stacked"
                placeholder="Ej: 10203040 o Juan Pérez"
              ></ion-input>
            </ion-item>

            <div class="actions">
              <ion-button expand="block" (click)="buscar()" [disabled]="buscando() || !searchQuery().trim()">
                @if (buscando()) {
                  <ion-spinner slot="start" name="crescent"></ion-spinner>
                  Buscando...
                } @else {
                  <ion-icon slot="start" name="search-outline"></ion-icon>
                  Buscar
                }
              </ion-button>
            </div>

            @if (mensajeBusqueda()) {
              <ion-note color="medium">{{ mensajeBusqueda() }}</ion-note>
            }
          </ion-card-content>
        </ion-card>

        @if (resultados().length > 0) {
          <ion-card>
            <ion-card-header>
              <ion-card-title>Resultados ({{ resultados().length }})</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="full">
                @for (afiliado of resultados(); track afiliado.numeroDocumento) {
                  <ion-item>
                    <ion-label>
                      <h3>
                        {{ afiliado.primerNombre }} {{ afiliado.segundoNombre }}
                        {{ afiliado.primerApellido }} {{ afiliado.segundoApellido }}
                      </h3>
                      <p>Documento: {{ afiliado.numeroDocumento }}</p>
                      <p>Nacimiento: {{ afiliado.fechaNacimiento }}</p>
                    </ion-label>
                    <ion-button fill="outline" size="small" (click)="editarAfiliado(afiliado)">
                      <ion-icon slot="start" name="pencil-outline"></ion-icon>
                      Editar
                    </ion-button>
                  </ion-item>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>
        }

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="person-add-outline"></ion-icon>
              Nuevo afiliado (sin escáner)
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p class="intro">
              Registre los datos de identidad y continúe a los formularios para completar contacto,
              sociodemográfico, laboral y caracterización.
            </p>

            <form [formGroup]="crearForm" (ngSubmit)="iniciarCreacion()">
              <ion-list lines="none">
                <ion-item>
                  <ion-input
                    formControlName="numeroDocumento"
                    label="Número de documento"
                    labelPlacement="stacked"
                    type="text"
                    inputmode="numeric"
                  ></ion-input>
                </ion-item>

                <ion-item>
                  <ion-input
                    formControlName="primerNombre"
                    label="Primer nombre"
                    labelPlacement="stacked"
                    type="text"
                  ></ion-input>
                </ion-item>

                <ion-item>
                  <ion-input
                    formControlName="segundoNombre"
                    label="Segundo nombre (opcional)"
                    labelPlacement="stacked"
                    type="text"
                  ></ion-input>
                </ion-item>

                <ion-item>
                  <ion-input
                    formControlName="primerApellido"
                    label="Primer apellido"
                    labelPlacement="stacked"
                    type="text"
                  ></ion-input>
                </ion-item>

                <ion-item>
                  <ion-input
                    formControlName="segundoApellido"
                    label="Segundo apellido (opcional)"
                    labelPlacement="stacked"
                    type="text"
                  ></ion-input>
                </ion-item>

                <ion-item>
                  <ion-input
                    formControlName="fechaNacimiento"
                    label="Fecha de nacimiento"
                    labelPlacement="stacked"
                    type="date"
                  ></ion-input>
                </ion-item>

                <ion-item>
                  <ion-select
                    formControlName="genero"
                    label="Género"
                    labelPlacement="stacked"
                    interface="action-sheet"
                  >
                    <ion-select-option value="M">Masculino</ion-select-option>
                    <ion-select-option value="F">Femenino</ion-select-option>
                  </ion-select>
                </ion-item>

                <ion-item>
                  <ion-select
                    formControlName="tipoAfiliado"
                    label="Tipo de afiliado"
                    labelPlacement="stacked"
                    interface="action-sheet"
                  >
                    @for (tipo of tiposAfiliado; track tipo.value) {
                      <ion-select-option [value]="tipo.value">{{ tipo.label }}</ion-select-option>
                    }
                  </ion-select>
                </ion-item>
              </ion-list>

              <div class="actions">
                <ion-button expand="block" type="submit">
                  <ion-icon slot="start" name="create-outline"></ion-icon>
                  Continuar registro
                </ion-button>
              </div>
            </form>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .admin-content {
      --background: var(--ion-background-color);
    }

    .container {
      max-width: 920px;
      margin: 0 auto;
      padding: 16px;
    }

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .actions {
      margin-top: 16px;
    }

    .intro {
      margin: 0 0 12px;
      color: var(--ion-color-medium);
    }
  `],
})
export class AdminAfiliadosPage {
  readonly searchQuery = signal('');
  readonly buscando = signal(false);
  readonly mensajeBusqueda = signal('');
  readonly resultados = signal<DatosAfiliado[]>([]);
  readonly tiposAfiliado = TIPOS_AFILIADO;

  readonly crearForm = this.fb.group({
    numeroDocumento: ['', [Validators.required, Validators.minLength(4)]],
    primerNombre: ['', [Validators.required]],
    segundoNombre: [''],
    primerApellido: ['', [Validators.required]],
    segundoApellido: [''],
    fechaNacimiento: ['', [Validators.required]],
    genero: ['M', [Validators.required]],
    tipoAfiliado: ['docente_activo', [Validators.required]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly apiService: PoblacionApiService,
    private readonly mapperService: AfiliadoMapperService,
    private readonly flujoService: FlujoActualizacionService
  ) {
    addIcons({
      searchOutline,
      createOutline,
      personAddOutline,
      personCircleOutline,
      pencilOutline,
      documentTextOutline,
    });
  }

  onSearchInput(event: CustomEvent): void {
    const value = (event.detail?.value ?? '') as string;
    this.searchQuery.set(String(value).trim());
  }

  async buscar(): Promise<void> {
    const query = this.searchQuery().trim();
    if (!query) {
      this.mensajeBusqueda.set('Ingrese un valor de búsqueda.');
      this.resultados.set([]);
      return;
    }

    this.buscando.set(true);
    this.mensajeBusqueda.set('');
    this.resultados.set([]);

    try {
      const response = await this.apiService.buscarAfiliadosAdmin(query);
      const afiliados = response.afiliados.map((row) => this.mapperService.dbRecordToAfiliado(row));
      this.resultados.set(afiliados);

      if (afiliados.length === 0) {
        this.mensajeBusqueda.set('No se encontraron afiliados con ese criterio.');
      }
    } catch (error: any) {
      this.mensajeBusqueda.set(
        error?.message || error?.mensajeOriginal || 'No fue posible completar la búsqueda.'
      );
    } finally {
      this.buscando.set(false);
    }
  }

  async editarAfiliado(afiliado: DatosAfiliado): Promise<void> {
    await this.flujoService.iniciarEdicionAdmin(afiliado);
  }

  async iniciarCreacion(): Promise<void> {
    if (this.crearForm.invalid) {
      this.crearForm.markAllAsTouched();
      this.mensajeBusqueda.set('Complete los campos obligatorios para crear un afiliado.');
      return;
    }

    const value = this.crearForm.getRawValue();
    await this.flujoService.iniciarCreacionManual({
      numeroDocumento: String(value.numeroDocumento || '').trim(),
      primerNombre: String(value.primerNombre || '').trim(),
      segundoNombre: value.segundoNombre ? String(value.segundoNombre).trim() : undefined,
      primerApellido: String(value.primerApellido || '').trim(),
      segundoApellido: value.segundoApellido ? String(value.segundoApellido).trim() : undefined,
      fechaNacimiento: String(value.fechaNacimiento || '').trim(),
      genero: value.genero === 'F' ? 'F' : 'M',
      tipoAfiliado: (value.tipoAfiliado as TipoAfiliado) || 'docente_activo',
    });
  }
}
