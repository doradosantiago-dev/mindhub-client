import { Injectable, signal, computed } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, tap, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ReportRequest,
  ReportResponse,
  ReportStatus
} from '../models';
import {
  PaginatedResponse,
  ApiResponse
} from '../../../shared/common';
import { BaseCrudService, BaseListParams } from '../../../core/services';

/**
 * Parámetros para listas de reportes paginadas.
 * Extiende BaseListParams para funcionalidad de ordenamiento.
 */
export interface ReportListParams extends BaseListParams {
  status?: 'PENDING' | 'RESOLVED' | 'REJECTED';
  sort?: 'newest' | 'oldest' | 'priority';
}

/**
 * Respuesta de la API para operaciones de reportes.
 * Extiende la interfaz común ApiResponse.
 */
export type ReportApiResponse = ApiResponse;

/**
 * Estadísticas de reportes para el dashboard de administración.
 */
export interface ReportStatistics {
  reportesPendientes: number;
  reportesResueltos: number;
  reportesRechazados: number;
  totalReportes: number;
}

// REPORT SERVICE: gestión de reportes y estadísticas (TS)
@Injectable({
  providedIn: 'root'
})
export class ReportService extends BaseCrudService<
  ReportResponse,
  ReportRequest,
  ReportRequest,
  ReportListParams
> {

  protected readonly API_URL = `${environment.apiUrl}/reports`;
  protected readonly entityName = 'report';

  // Signals adicionales específicos de reportes
  private readonly _statistics = signal<ReportStatistics>({
    reportesPendientes: 0,
    reportesResueltos: 0,
    reportesRechazados: 0,
    totalReportes: 0
  });

  /**
   * Obtiene el ID de un reporte.
   * @param report - Reporte
   * @returns ID del reporte
   */
  protected getItemId(report: ReportResponse): number {
    return report.id;
  }


  // ADMINISTRACIÓN 

  /**
   * Resuelve un reporte (solo admin).
   * @param id - ID del reporte
   * @param reason - Razón de la resolución
   * @returns Observable con la confirmación de resolución
   */
  resolveReport(id: number, reason?: string): Observable<ReportApiResponse> {
    return this.http.put<ReportApiResponse>(`${this.API_URL}/${id}/resolve`, { reason })
      .pipe(
        tap(() => {
          // Actualizar el estado local del reporte
          this._items.update(reports =>
            reports.map(report =>
              report.id === id
                ? { ...report, status: ReportStatus.RESOLVED, reviewDate: new Date().toISOString().split('T')[0] }
                : report
            )
          );
        }),
        catchError(error => throwError(() => error))
      );
  }

  /**
   * Rechaza un reporte (solo admin).
   * @param id - ID del reporte
   * @param reason - Razón del rechazo
   * @returns Observable con la confirmación de rechazo
   */
  rejectReport(id: number, reason?: string): Observable<ReportApiResponse> {
    return this.http.put<ReportApiResponse>(`${this.API_URL}/${id}/reject`, { reason })
      .pipe(
        tap(() => {
          // Actualizar el estado local del reporte
          this._items.update(reports =>
            reports.map(report =>
              report.id === id
                ? { ...report, status: ReportStatus.REJECTED, reviewDate: new Date().toISOString().split('T')[0] }
                : report
            )
          );
        }),
        catchError(error => throwError(() => error))
      );
  }

  // ESTADÍSTICAS

  /**
   * Obtiene todas las estadísticas de reportes desde el dashboard de admin.
   * @returns Observable con las estadísticas de reportes
   */
  getReportsStatistics(): Observable<ReportStatistics> {
    this._isLoading.set(true);

    return this.http.get<Omit<ReportStatistics, 'totalReportes'>>(`${environment.apiUrl}/admin/dashboard`)
      .pipe(
        map(stats => {
          const statistics: ReportStatistics = {
            ...stats,
            totalReportes: stats.reportesPendientes + stats.reportesResueltos + stats.reportesRechazados
          };
          this._statistics.set(statistics);
          this._isLoading.set(false);
          return statistics;
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  // UTILIDADES PRIVADAS


  /**
   * Construye los parámetros HTTP para las consultas paginadas.
   * @param params - Parámetros de la consulta
   * @returns HttpParams configurados
   */
  private buildHttpParams(params: ReportListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', params.page?.toString() || '0')
      .set('size', params.size?.toString() || '10');

    // Agregar filtro de estado si está presente
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    // Agregar ordenamiento si está presente
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    return httpParams;
  }
}
