import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  FollowRequest,
  FollowResponse,
  FollowStatsResponse
} from '../models';
import {
  PaginatedResponse,
  ApiResponse
} from '../../../shared/common';
import { BaseCrudService, BaseListParams } from '../../../core/services';

/**
 * Parámetros para listas de seguimientos paginadas.
 * Extiende BaseListParams para funcionalidad de ordenamiento.
 */
export interface FollowListParams extends BaseListParams {
  sort?: 'newest' | 'oldest' | 'username';
}

/**
 * Respuesta de la API para operaciones de seguimiento.
 * Extiende la interfaz común ApiResponse.
 */
export type FollowApiResponse = ApiResponse;

// FOLLOW SERVICE: gestión de follows y estadísticas (TS)
@Injectable({
  providedIn: 'root'
})
export class FollowService extends BaseCrudService<
  FollowResponse,
  FollowRequest,
  FollowRequest,
  FollowListParams
> {

  protected readonly API_URL = `${environment.apiUrl}/follows`;
  protected readonly entityName = 'follow';

  /**
   * Obtiene el ID de un seguimiento.
   * @param follow - Seguimiento
   * @returns ID del seguimiento
   */
  protected getItemId(follow: FollowResponse): number {
    return follow.id;
  }

  // ACCIONES DE SEGUIMIENTO

  /**
   * Seguir a un usuario específico.
   * @param request - Datos del seguimiento a crear
   * @returns Observable con la relación de seguimiento creada
   */
  followUser(request: FollowRequest): Observable<FollowResponse> {
    return this.create(request);
  }

  /**
   * Dejar de seguir a un usuario.
   * @param userId - ID del usuario a dejar de seguir
   * @returns Observable con la confirmación de la acción
   */
  unfollowUser(userId: number): Observable<FollowApiResponse> {
    return this.delete(userId);
  }

  /**
   * Verificar si el usuario autenticado sigue a otro usuario.
   * @param userId - ID del usuario a verificar
   * @returns Observable con true si lo sigue, false en caso contrario
   */
  checkFollow(userId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.API_URL}/check/${userId}`)
      .pipe(
        catchError(error => throwError(() => error))
      );
  }

  // LISTADOS DE USUARIOS

  /**
   * Obtener seguidores de un usuario específico.
   * @param userId - ID del usuario
   * @param params - Parámetros de paginación y ordenamiento
   * @returns Observable con lista paginada de seguidores
   */
  getFollowers(userId: number, params: FollowListParams = {}): Observable<PaginatedResponse<FollowResponse>> {
    const httpParams = this.buildHttpParams(params);

    return this.http.get<PaginatedResponse<FollowResponse>>(
      `${this.API_URL}/${userId}/followers`,
      { params: httpParams }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // MIS SEGUIDORES Y SEGUIDOS

  /**
   * Obtener seguidores del usuario autenticado.
   * @param params - Parámetros de paginación y ordenamiento
   * @returns Observable con lista paginada de seguidores propios
   */
  getMyFollowers(params: FollowListParams = {}): Observable<PaginatedResponse<FollowResponse>> {
    const httpParams = this.buildHttpParams(params);

    return this.http.get<PaginatedResponse<FollowResponse>>(
      `${this.API_URL}/my-followers`,
      { params: httpParams }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Obtener usuarios que sigue el usuario autenticado.
   * @param params - Parámetros de paginación y ordenamiento
   * @returns Observable con lista paginada de usuarios seguidos propios
   */
  getMyFollowing(params: FollowListParams = {}): Observable<PaginatedResponse<FollowResponse>> {
    const httpParams = this.buildHttpParams(params);

    return this.http.get<PaginatedResponse<FollowResponse>>(
      `${this.API_URL}/my-following`,
      { params: httpParams }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // UTILIDADES PRIVADAS

  /**
   * Construye los parámetros HTTP para las consultas paginadas.
   * @param params - Parámetros de la consulta
   * @returns HttpParams configurados
   */
  private buildHttpParams(params: FollowListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', params.page?.toString() || '0')
      .set('size', params.size?.toString() || '20');

    // Agregar ordenamiento si está presente
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    return httpParams;
  }
}
