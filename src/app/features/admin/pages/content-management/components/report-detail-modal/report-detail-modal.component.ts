// ADMIN: Report Detail Modal — Componente (detalles y confirmaciones)

import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ReportResponse as Report, ReportStatus } from '@core/models';
import { DateFormatPipe } from '@shared/pipes/date-format.pipe';

@Component({
  selector: 'app-report-detail-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, DateFormatPipe],
  templateUrl: './report-detail-modal.component.html',
  styleUrls: ['./report-detail-modal.component.css']
})
export class ReportDetailModalComponent {
  // Inputs
  readonly report = input.required<Report>();
  readonly visible = input<boolean>(false);

  // Outputs
  readonly onConfirm = output<{ action: string; reportId: number }>();
  readonly onClose = output<void>();

  // Signals para estado del modal
  private readonly _showConfirmDialog = signal<boolean>(false);
  private readonly _pendingAction = signal<string>('');

  // Computed values
  readonly showConfirmDialog = this._showConfirmDialog.asReadonly();
  readonly canResolve = computed(() => this.report().status === ReportStatus.PENDING);
  readonly canReject = computed(() => this.report().status === ReportStatus.PENDING);

  /**
   * Cierra el modal
   */
  closeModal(): void {
    this.onClose.emit();
  }

  /**
   * Previene la propagación del evento
   */
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  /**
   * Abre el diálogo de confirmación para resolver
   */
  confirmResolve(): void {
    this._pendingAction.set(ReportStatus.RESOLVED);
    this._showConfirmDialog.set(true);
  }

  /**
   * Abre el diálogo de confirmación para rechazar
   */
  confirmReject(): void {
    this._pendingAction.set(ReportStatus.REJECTED);
    this._showConfirmDialog.set(true);
  }

  /**
   * Confirma la acción
   */
  confirmAction(): void {
    this.onConfirm.emit({
      action: this._pendingAction(),
      reportId: this.report().id
    });
    this._showConfirmDialog.set(false);
    this._pendingAction.set('');
  }

  /**
   * Cancela la confirmación
   */
  cancelAction(): void {
    this._showConfirmDialog.set(false);
    this._pendingAction.set('');
  }

  /**
   * Obtiene el texto de la acción pendiente
   */
  getActionText(): string {
    return this._pendingAction() === ReportStatus.RESOLVED ? 'resolver' : 'rechazar';
  }

  /**
   * Obtiene el color de la acción
   */
  getActionColor(): string {
    return this._pendingAction() === ReportStatus.RESOLVED ? 'success' : 'warning';
  }
}
