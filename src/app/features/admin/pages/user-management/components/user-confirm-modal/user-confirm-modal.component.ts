// USER CONFIRM MODAL: Componente modal de confirmación (TS)

import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

// INTERFACES:
export interface ConfirmModalData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'warning' | 'danger' | 'info';
  icon?: string;
  userId?: number;
}

// ENUMERACIONES:
export enum ModalType {
  WARNING = 'warning',
  DANGER = 'danger',
  INFO = 'info'
}

// CONSTANTES:
const MODAL_ICONS = {
  [ModalType.WARNING]: 'warning',
  [ModalType.DANGER]: 'error',
  [ModalType.INFO]: 'info'
} as const;

const MODAL_BUTTON_CLASSES = {
  [ModalType.WARNING]: 'confirm-btn btn-warning',
  [ModalType.DANGER]: 'confirm-btn btn-danger',
  [ModalType.INFO]: 'confirm-btn btn-info'
} as const;

@Component({
  selector: 'app-user-confirm-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './user-confirm-modal.component.html',
  styleUrls: ['./user-confirm-modal.component.css']
})
export class UserConfirmModalComponent {
  // INYECCIÓN DE SERVICIOS:
  // No se requieren servicios externos para este componente

  // INPUTS:
  /** Estado de apertura del modal */
  readonly isOpen = input.required<boolean>();

  /** Datos de configuración del modal */
  readonly data = input.required<ConfirmModalData>();

  /** Estado de carga para deshabilitar interacciones */
  readonly loading = input<boolean>(false);

  // OUTPUTS:
  /** Evento emitido cuando se confirma la acción */
  readonly confirmed = output<void>();

  /** Evento emitido cuando se cancela la acción */
  readonly cancelled = output<void>();

  // SIGNALS PRIVADOS:
  private readonly _isSubmitting = signal<boolean>(false);

  // VALORES COMPUTADOS:
  /** Clases CSS dinámicas para el modal */
  readonly modalClass = computed(() => ({
    'modal-open': this.isOpen(),
    'modal-loading': this.loading(),
    'modal-submitting': this._isSubmitting()
  }));

  /** Clase CSS para el icono según el tipo */
  readonly iconClass = computed(() => {
    const type = this.data()?.type || ModalType.INFO;
    return `icon-${type}`;
  });

  /** Clase CSS para el botón de confirmación */
  readonly confirmButtonClass = computed(() => {
    const type = this.data()?.type || ModalType.INFO;
    return MODAL_BUTTON_CLASSES[type];
  });

  /** Icono a mostrar en el modal */
  readonly modalIcon = computed(() => {
    const data = this.data();
    if (data?.icon) return data.icon;

    const type = data?.type || ModalType.INFO;
    return MODAL_ICONS[type];
  });

  /** Estado de deshabilitación para botones */
  readonly isDisabled = computed(() => this.loading() || this._isSubmitting());

  // EFECTOS:
  constructor() {
    // Sincronizar estado de envío con loading
    effect(() => {
      if (this.loading()) {
        this._isSubmitting.set(true);
      } else {
        this._isSubmitting.set(false);
      }
    });
  }

  // MÉTODOS PÚBLICOS:
  /**
   * Maneja la confirmación de la acción
   * Solo permite confirmar si no está en estado de carga
   */
  onConfirm(): void {
    if (!this.isDisabled()) {
      this._isSubmitting.set(true);
      this.confirmed.emit();
    }
  }

  /**
   * Maneja la cancelación de la acción
   * Solo permite cancelar si no está en estado de carga
   */
  onCancel(): void {
    if (!this.isDisabled()) {
      this.cancelled.emit();
    }
  }

}
