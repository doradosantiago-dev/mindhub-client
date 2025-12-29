// ADMIN: Report Actions — Componente (resolver / rechazar reportes)

import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ReportResponse as Report } from '@core/models';

@Component({
  selector: 'app-report-actions',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './report-actions.component.html',
  styleUrls: ['./report-actions.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportActionsComponent {
  // INPUTS
  readonly report = input.required<Report>();
  readonly loading = input<boolean>(false);
  // OUTPUTS
  readonly onResolve = output<number>();
  readonly onReject = output<number>();
  // SIGNALS DE ESTADO
  private readonly _resolving = signal<boolean>(false);
  private readonly _rejecting = signal<boolean>(false);
  // SIGNALS COMPUTADOS
  readonly resolving = this._resolving.asReadonly();
  readonly rejecting = this._rejecting.asReadonly();
  // MÉTODOS PÚBLICOS

  /**
   * Maneja la acción de resolver reporte
   * Emite el ID del reporte para su resolución
   */
  handleResolve(): void {
    if (this.resolving() || this.rejecting()) return;

    this._resolving.set(true);
    this.onResolve.emit(this.report().id);

    // Resetear estado después de un delay para feedback visual
    setTimeout(() => this._resolving.set(false), 2000);
  }

  /**
   * Maneja la acción de rechazar reporte
   * Emite el ID del reporte para su rechazo
   */
  handleReject(): void {
    if (this.resolving() || this.rejecting()) return;

    this._rejecting.set(true);
    this.onReject.emit(this.report().id);

    // Resetear estado después de un delay para feedback visual
    setTimeout(() => this._rejecting.set(false), 2000);
  }

  // MÉTODOS DE VALIDACIÓN

  /**
   * Verifica si el reporte puede ser resuelto
   * Solo reportes pendientes pueden ser resueltos
   */
  canResolve(): boolean {
    return this.report().status === 'PENDING';
  }

  /**
   * Verifica si el reporte puede ser rechazado
   * Solo reportes pendientes pueden ser rechazados
   */
  canReject(): boolean {
    return this.report().status === 'PENDING';
  }
}
