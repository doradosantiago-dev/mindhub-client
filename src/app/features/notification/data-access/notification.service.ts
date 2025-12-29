import { Injectable, signal, computed } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { NotificationResponse } from './notification-response.interface';
import {
  PaginatedResponse,
  ApiResponse
} from '../../../shared/common';
import { BaseCrudService, BaseListParams } from '../../../core/services';

/**
 * Parámetros para listas de notificaciones paginadas.
 * Extiende BaseListParams para funcionalidad de ordenamiento.
 */
export interface NotificationListParams extends BaseListParams {
  type?: 'all' | 'unread' | 'read';
  sort?: 'newest' | 'oldest';
}

/**
 * Respuesta de la API para operaciones de notificaciones.
 * Extiende la interfaz común ApiResponse.
 */
export type NotificationApiResponse = ApiResponse;

/**
 * Conteo de notificaciones no leídas.
 */
export interface UnreadCountResponse {
  count: number;
}

// NOTIFICATION SERVICE: gestión de notificaciones (TS)
@Injectable({
  providedIn: 'root'
})
export class NotificationService extends BaseCrudService<
  NotificationResponse,
  any, // No hay creación de notificaciones desde el frontend
  any, // No hay actualización de notificaciones desde el frontend
  NotificationListParams
> {

  protected readonly API_URL = `${environment.apiUrl}/notifications`;
  protected readonly entityName = 'notification';

  // Signals adicionales específicos de notificaciones
  private readonly _unreadCount = signal<number>(0);

  // Computed values para estado combinado específico de notificaciones
  readonly notificationState = computed(() => ({
    unreadCount: this._unreadCount(),
    notifications: this._items(),
    isLoading: this._isLoading()
  }));

  /**
   * Obtiene el ID de una notificación.
   * @param notification - Notificación
   * @returns ID de la notificación
   */
  protected getItemId(notification: NotificationResponse): number {
    return notification.id;
  }

  constructor() {
    super();
    this.loadInitialData();
  }

  // MÉTODOS ESPECÍFICOS DE NOTIFICACIONES

  /**
   * Obtiene las notificaciones del usuario autenticado.
   * @param params - Parámetros de paginación y filtrado
   * @returns Observable con lista paginada de notificaciones
   */
  getMyNotifications(params: NotificationListParams = {}): Observable<PaginatedResponse<NotificationResponse>> {
    this.setLoading(true);

    const httpParams = this.buildHttpParams(params);

    return this.http.get<PaginatedResponse<NotificationResponse>>(
      this.API_URL,
      { params: httpParams }
    ).pipe(
      tap(response => {
        this._items.set(response.content);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene las notificaciones no leídas del usuario autenticado.
   * @param params - Parámetros de paginación
   * @returns Observable con lista paginada de notificaciones no leídas
   */
  getUnreadNotifications(params: NotificationListParams = {}): Observable<PaginatedResponse<NotificationResponse>> {
    this._isLoading.set(true);

    const httpParams = this.buildHttpParams(params);

    return this.http.get<PaginatedResponse<NotificationResponse>>(
      `${this.API_URL}/unread`,
      { params: httpParams }
    ).pipe(
      tap(response => {
        this._items.set(response.content);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene el conteo de notificaciones no leídas.
   * @returns Observable con el conteo de notificaciones no leídas
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.API_URL}/unread/count`)
      .pipe(
        tap(response => {
          this._unreadCount.set(response.count);
        }),
        catchError(error => throwError(() => error))
      );
  }

  // GESTIÓN DE ESTADO

  /**
   * Marca una notificación específica como leída.
   * @param id - ID de la notificación
   * @returns Observable con la confirmación de la acción
   */
  markAsRead(id: number): Observable<NotificationApiResponse> {
    return this.http.put<NotificationApiResponse>(`${this.API_URL}/${id}/read`, {})
      .pipe(
        tap(() => {
          // Actualizar el estado local
          this._items.update(notifications =>
            notifications.map(notification =>
              notification.id === id
                ? { ...notification, read: true, readDate: new Date().toISOString() }
                : notification
            )
          );

          // Actualizar el contador de no leídas
          const unreadCount = this._items().filter(n => !n.read).length;
          this._unreadCount.set(unreadCount);

        }),
        catchError(error => throwError(() => error))
      );
  }

  /**
   * Marca todas las notificaciones como leídas.
   * @returns Observable con la confirmación de la acción
   */
  markAllAsRead(): Observable<NotificationApiResponse> {
    return this.http.put<NotificationApiResponse>(`${this.API_URL}/read-all`, {})
      .pipe(
        tap(() => {
          // Actualizar el estado local
          this._items.update(notifications =>
            notifications.map(notification => ({
              ...notification,
              read: true,
              readDate: new Date().toISOString()
            }))
          );
          this._unreadCount.set(0);
        }),
        catchError(error => throwError(() => error))
      );
  }

  // UTILIDADES PRIVADAS

  /**
   * Carga datos iniciales del servicio.
   */
  private loadInitialData(): void {
    this.getUnreadCount().subscribe();
  }


  /**
   * Construye los parámetros HTTP para las consultas paginadas.
   * @param params - Parámetros de la consulta
   * @returns HttpParams configurados
   */
  private buildHttpParams(params: NotificationListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', params.page?.toString() || '0')
      .set('size', params.size?.toString() || '10');

    // Agregar tipo de filtro si está presente
    if (params.type && params.type !== 'all') {
      httpParams = httpParams.set('type', params.type);
    }

    // Agregar ordenamiento si está presente
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    return httpParams;
  }
}
