import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  User,
  ReportResponse,
  AdminActionResponse,
  NotificationResponse
} from '../models';
import {
  PaginatedResponse,
  SearchableListParams
} from '../../../shared/common';

/**
 * Parámetros para listas administrativas paginadas.
 * Extiende SearchableListParams para funcionalidad de búsqueda.
 */
export interface AdminListParams extends SearchableListParams {
  status?: string;
}

/**
 * Estadísticas del dashboard administrativo.
 * Alineadas con el backend.
 */
export interface DashboardStats {
  totalUsuarios: number;
  usuariosActivos: number;
  usuariosInactivos: number;
  totalPosts: number;
  reportesPendientes: number;
  reportesRechazados: number;
  reportesResueltos: number;
}

// ADMIN SERVICE: servicio para operaciones administrativas (TS)
@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private readonly API_URL = `${environment.apiUrl}/admin`;

  private readonly http = inject(HttpClient);

  // DASHBOARD

  /**
   * Obtiene estadísticas del dashboard administrativo.
   * @returns Observable con las estadísticas del sistema
   */
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.API_URL}/dashboard`)
      .pipe(
        catchError(error => throwError(() => error))
      );
  }

  // ACCIONES ADMINISTRATIVAS

  /**
   * Obtiene todas las acciones administrativas registradas.
   * @param params - Parámetros de paginación y filtrado
   * @returns Observable con lista paginada de acciones administrativas
   */
  getAdminActions(params: AdminListParams = {}): Observable<PaginatedResponse<AdminActionResponse>> {
    const httpParams = this.buildHttpParams(params);

    return this.http.get<PaginatedResponse<AdminActionResponse>>(
      `${this.API_URL}/actions`,
      { params: httpParams }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // REPORTES

  /**
   * Obtiene todos los reportes del sistema.
   * @param params - Parámetros de paginación y filtrado
   * @returns Observable con lista paginada de reportes
   */
  getAllReports(params: AdminListParams = {}): Observable<PaginatedResponse<ReportResponse>> {
    const httpParams = this.buildHttpParams(params);

    return this.http.get<PaginatedResponse<ReportResponse>>(
      `${this.API_URL}/reports`,
      { params: httpParams }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // MÉTODOS PRIVADOS
  /**
   * Construye los parámetros HTTP para las consultas paginadas.
   * @param params - Parámetros de la consulta
   * @returns HttpParams configurados
   */
  private buildHttpParams(params: AdminListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', params.page?.toString() || '0')
      .set('size', params.size?.toString() || '10');

    // Agregar filtro de estado si está presente
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    // Agregar filtro de búsqueda si está presente
    if (params.query) {
      httpParams = httpParams.set('search', params.query);
    }

    // Agregar parámetro de ordenamiento si está presente
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    return httpParams;
  }
}
