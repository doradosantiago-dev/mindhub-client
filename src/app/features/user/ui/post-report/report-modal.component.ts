// ReportModal component — modal para reportar publicaciones

import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

// INTERFACES Y TIPOS

/**
 * Datos de entrada para el modal de reporte
 */
export interface ReportModalData {
  /** ID del post a reportar */
  postId: number;
  /** Contenido del post para mostrar en el modal */
  postContent: string;
}

/**
 * Resultado del modal de reporte
 */
export interface ReportModalResult {
  /** ID del post reportado */
  postId: number;
  /** Motivo del reporte */
  reason: string;
  /** Descripción adicional del reporte */
  description: string;
}

// COMPONENTE PRINCIPAL

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule
  ],
  templateUrl: './report-modal.component.html',
  styleUrls: ['./report-modal.component.css']
})
export class ReportModalComponent {
  // INYECCIONES DE DEPENDENCIAS

  /** Referencia al diálogo para cerrar el modal */
  private readonly dialogRef = inject<MatDialogRef<ReportModalComponent>>(MatDialogRef);

  /** Datos de entrada del modal */
  protected readonly data = inject<ReportModalData>(MAT_DIALOG_DATA);

  // SIGNALS PRIVADOS PARA ESTADO INTERNO

  /** Estado consolidado del formulario */
  private readonly _state = signal<{
    reason: string;
    description: string;
    isSubmitting: boolean;
  }>({
    reason: '',
    description: '',
    isSubmitting: false
  });

  // SIGNALS PÚBLICOS (READONLY)

  /** Motivo del reporte (solo lectura) */
  readonly reason = computed(() => this._state().reason);

  /** Descripción del reporte (solo lectura) */
  readonly description = computed(() => this._state().description);

  /** Estado de envío (solo lectura) */
  readonly isSubmitting = computed(() => this._state().isSubmitting);

  // VALORES COMPUTADOS

  /**
   * Indica si se puede enviar el reporte
   * @returns true si el formulario es válido y no se está enviando
   */
  readonly canSubmit = computed(() => {
    const reason = this._state().reason;
    return reason && reason.trim().length > 0 && !this._state().isSubmitting;
  });

  /**
   * Longitud actual del motivo del reporte
   * @returns Número de caracteres del motivo
   */
  readonly reasonLength = computed(() => this._state().reason.length);

  /**
   * Longitud actual de la descripción del reporte
   * @returns Número de caracteres de la descripción
   */
  readonly descriptionLength = computed(() => this._state().description.length);

  // MÉTODOS PÚBLICOS

  /**
   * Cancela el reporte y cierra el modal
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Envía el reporte si es válido
   */
  onSubmit(): void {
    if (!this.canSubmit()) return;

    this._state.update(s => ({ ...s, isSubmitting: true }));

    const result: ReportModalResult = {
      postId: this.data.postId,
      reason: this._state().reason.trim(),
      description: this._state().description.trim() || 'Sin descripción adicional'
    };

    this.dialogRef.close(result);
  }

  // MÉTODOS PRIVADOS

  /**
   * Actualiza el motivo del reporte
   * @param value - Nuevo valor del motivo
   */
  protected updateReason(value: string): void {
    this._state.update(s => ({ ...s, reason: value }));
  }

  /**
   * Actualiza la descripción del reporte
   * @param value - Nueva descripción
   */
  protected updateDescription(value: string): void {
    this._state.update(s => ({ ...s, description: value }));
  }
}
