import { Injectable, signal, computed } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ReactionRequest,
  ReactionResponse,
  ReactionType
} from '../models';
import {
  PaginatedResponse,
  ApiResponse
} from '../models/common';
import { BaseCrudService, BaseListParams } from './base-crud.service';

/**
 * Parámetros para listas de reacciones paginadas.
 * Extiende BaseListParams para funcionalidad de ordenamiento.
 */
export interface ReactionListParams extends BaseListParams {
  sort?: 'newest' | 'oldest';
}

/**
 * Respuesta de la API para operaciones de reacciones.
 * Extiende la interfaz común ApiResponse.
 */
export type ReactionApiResponse = ApiResponse;

/**
 * Resumen de reacciones por tipo.
 */
export interface ReactionsSummary {
  [key: string]: number;
}

// REACTION SERVICE: operaciones sobre reacciones (TS)
@Injectable({
  providedIn: 'root'
})
export class ReactionService extends BaseCrudService<
  ReactionResponse,
  ReactionRequest,
  ReactionRequest,
  ReactionListParams
> {

  protected readonly API_URL = `${environment.apiUrl}/reactions`;
  protected readonly entityName = 'reaction';

  /**
   * Obtiene el ID de una reacción.
   * @param reaction - Reacción
   * @returns ID de la reacción
   */
  protected getItemId(reaction: ReactionResponse): number {
    return reaction.id;
  }


  // MÉTODOS ESPECÍFICOS DE REACCIONES

  /**
   * Reacciona a un post (crea, actualiza o remueve reacción).
   * @param postId - ID del post
   * @param type - Tipo de reacción
   * @returns Observable con la reacción creada o mensaje de confirmación
   */
  reactToPost(postId: number, type: ReactionType): Observable<ReactionResponse | ReactionApiResponse> {
    this.setLoading(true);

    return this.http.post<ReactionResponse | ReactionApiResponse>(
      `${this.API_URL}/posts/${postId}/react`,
      null,
      { params: { type } }
    ).pipe(
      tap(response => {
        if ('id' in response) {
          // Es una reacción creada
          this._currentItem.set(response);
          this._items.update(reactions => [response, ...reactions]);
        }
        this.setLoading(false);
      }),
      catchError(error => {
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina la reacción de un post.
   * @param postId - ID del post
   * @returns Observable con la confirmación de eliminación
   */
  removeReaction(postId: number): Observable<ReactionApiResponse> {
    return this.http.delete<ReactionApiResponse>(`${this.API_URL}/posts/${postId}/react`)
      .pipe(
        tap(() => {
          // Remover la reacción del estado local
          this._items.update(reactions =>
            reactions.filter(reaction => reaction.postId !== postId)
          );
          this._currentItem.set(null);
        }),
        catchError(error => throwError(() => error))
      );
  }

  // CONSULTAS

  /**
   * Obtiene la reacción del usuario autenticado para un post.
   * @param postId - ID del post
   * @returns Observable con la reacción del usuario o null
   */
  getMyReaction(postId: number): Observable<ReactionResponse | null> {
    return this.http.get<ReactionResponse | null>(`${this.API_URL}/posts/${postId}/my-reaction`)
      .pipe(
        tap(reaction => {
          this._currentItem.set(reaction);
        }),
        catchError(error => throwError(() => error))
      );
  }

  // UTILIDADES PRIVADAS


  /**
   * Construye los parámetros HTTP para las consultas paginadas.
   * @param params - Parámetros de la consulta
   * @returns HttpParams configurados
   */
  private buildHttpParams(params: ReactionListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', params.page?.toString() || '0')
      .set('size', params.size?.toString() || '10');

    // Agregar ordenamiento si está presente
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    return httpParams;
  }
}
