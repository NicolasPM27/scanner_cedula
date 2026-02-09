import { Component, EventEmitter, Input, Output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
  IonChip,
  IonIcon,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locationOutline, schoolOutline, closeCircle, checkmarkCircle } from 'ionicons/icons';

export interface InstitucionOption {
  codigo: number;
  nombre: string;
  descripcion?: string;
  tipo?: 'departamento' | 'municipio' | 'secretaria' | 'establecimiento' | 'sede';
}

/**
 * Componente de búsqueda accesible para instituciones educativas.
 * 
 * Características de accesibilidad:
 * - ARIA labels completos
 * - Navegación por teclado
 * - Anuncios para lectores de pantalla
 * - Contraste WCAG AA compliant
 * - Tamaño de toque mínimo de 44x44px
 */
@Component({
  selector: 'app-institucion-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
    IonIcon,
  ],
  template: `
    <div class="search-container">
      <!-- Buscador -->
      <ion-searchbar
        [placeholder]="placeholder"
        [value]="searchTerm()"
        (ionInput)="onSearchChange($event)"
        (ionClear)="onClear()"
        [disabled]="disabled || loading()"
        [attr.aria-label]="ariaLabel"
        [attr.aria-describedby]="helpText ? 'search-help' : null"
        debounce="300"
        mode="md"
        animated
      ></ion-searchbar>

      @if (helpText) {
        <ion-note id="search-help" color="medium" class="help-text">
          {{ helpText }}
        </ion-note>
      }

      <!-- Estado de carga -->
      @if (loading()) {
        <div class="loading-state" role="status" aria-live="polite">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <span>Cargando opciones...</span>
        </div>
      }

      <!-- Lista de resultados -->
      @if (!loading() && filteredOptions().length > 0) {
        <ion-list 
          class="results-list" 
          role="listbox"
          [attr.aria-label]="'Resultados de búsqueda: ' + filteredOptions().length + ' opciones'"
        >
          @for (option of filteredOptions(); track option.codigo) {
            <ion-item
              button
              (click)="selectOption(option)"
              class="result-item"
              [class.selected]="isSelected(option)"
              role="option"
              [attr.aria-selected]="isSelected(option)"
              [attr.aria-label]="option.nombre + (option.descripcion ? '. ' + option.descripcion : '')"
            >
              <ion-icon 
                [name]="getIconForType(option.tipo)" 
                slot="start" 
                [color]="isSelected(option) ? 'primary' : 'medium'"
                aria-hidden="true"
              ></ion-icon>
              
              <ion-label>
                <h3>{{ option.nombre }}</h3>
                @if (option.descripcion) {
                  <p>{{ option.descripcion }}</p>
                }
              </ion-label>

              @if (isSelected(option)) {
                <ion-icon 
                  name="checkmark-circle" 
                  slot="end" 
                  color="primary"
                  aria-hidden="true"
                ></ion-icon>
              }
            </ion-item>
          }
        </ion-list>

        <!-- Total de resultados -->
        <div class="results-count" role="status" aria-live="polite">
          Mostrando {{ filteredOptions().length }} de {{ options().length }} opciones
        </div>
      }

      <!-- Estado vacío -->
      @if (!loading() && filteredOptions().length === 0 && searchTerm()) {
        <div class="empty-state" role="status" aria-live="polite">
          <ion-icon name="close-circle" color="medium"></ion-icon>
          <h4>No se encontraron resultados</h4>
          <p>Intenta con otro término de búsqueda</p>
        </div>
      }

      <!-- Sin datos -->
      @if (!loading() && options().length === 0 && !disabled) {
        <div class="empty-state" role="status" aria-live="polite">
          <ion-icon name="school-outline" color="medium"></ion-icon>
          <h4>No hay opciones disponibles</h4>
          <p>{{ emptyMessage || 'Completa los pasos anteriores' }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .search-container {
      width: 100%;
    }

    .help-text {
      display: block;
      padding: 0 var(--space-md, 16px);
      font-size: 0.75rem;
      margin-top: -8px;
      margin-bottom: var(--space-sm, 12px);
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm, 12px);
      padding: var(--space-xl, 32px);
      color: var(--ion-color-medium);
      font-size: 0.875rem;
    }

    .results-list {
      margin: 0;
      padding: 0;
      max-height: 400px;
      overflow-y: auto;
      border-radius: var(--radius-md, 12px);
    }

    .result-item {
      --min-height: 56px;
      --padding-start: var(--space-md, 16px);
      --padding-end: var(--space-md, 16px);
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .result-item.selected {
      --background: rgba(var(--ion-color-primary-rgb), 0.08);
    }

    .result-item ion-label h3 {
      font-weight: 500;
      margin: 0;
      line-height: 1.4;
    }

    .result-item ion-label p {
      font-size: 0.8125rem;
      color: var(--ion-color-medium);
      margin: 4px 0 0;
    }

    .results-count {
      text-align: center;
      padding: var(--space-sm, 12px);
      font-size: 0.75rem;
      color: var(--ion-color-medium);
      font-weight: 500;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-xl, 32px);
      text-align: center;
      gap: var(--space-sm, 12px);
    }

    .empty-state ion-icon {
      font-size: 3rem;
    }

    .empty-state h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--ion-text-color);
    }

    .empty-state p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--ion-color-medium);
    }

    /* Accesibilidad: asegurar área de toque mínima */
    ion-item {
      min-height: 44px;
    }

    /* Mejorar contraste de foco para teclado */
    ion-item:focus-visible {
      outline: 2px solid var(--ion-color-primary);
      outline-offset: 2px;
    }

    /* Animación suave de resultados */
    .results-list {
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class InstitucionSearchComponent {
  @Input() options = signal<InstitucionOption[]>([]);
  @Input() selectedValue?: number;
  @Input() placeholder = 'Buscar...';
  @Input() ariaLabel = 'Buscar opciones';
  @Input() helpText = '';
  @Input() emptyMessage = '';
  @Input() disabled = false;
  @Input() loading = signal(false);

  @Output() optionSelected = new EventEmitter<InstitucionOption>();

  searchTerm = signal('');
  filteredOptions = signal<InstitucionOption[]>([]);

  constructor() {
    addIcons({ locationOutline, schoolOutline, closeCircle, checkmarkCircle });
    
    // Actualizar opciones filtradas cuando cambien las opciones o el término de búsqueda
    effect(() => {
      this.updateFilteredOptions();
    });
  }

  onSearchChange(event: any): void {
    const term = event.detail.value?.toLowerCase() || '';
    this.searchTerm.set(term);
    this.updateFilteredOptions();
  }

  onClear(): void {
    this.searchTerm.set('');
    this.updateFilteredOptions();
  }

  private updateFilteredOptions(): void {
    const term = this.searchTerm().toLowerCase();
    
    if (!term) {
      this.filteredOptions.set(this.options());
      return;
    }

    const filtered = this.options().filter(option => 
      option.nombre.toLowerCase().includes(term) ||
      option.descripcion?.toLowerCase().includes(term)
    );

    this.filteredOptions.set(filtered);
  }

  selectOption(option: InstitucionOption): void {
    this.optionSelected.emit(option);
  }

  isSelected(option: InstitucionOption): boolean {
    return option.codigo === this.selectedValue;
  }

  getIconForType(tipo?: string): string {
    switch (tipo) {
      case 'departamento':
      case 'municipio':
        return 'location-outline';
      case 'establecimiento':
      case 'sede':
        return 'school-outline';
      default:
        return 'school-outline';
    }
  }
}
