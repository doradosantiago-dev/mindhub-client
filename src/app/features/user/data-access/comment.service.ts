import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CommentRequest, CommentResponse } from '../models';
import {
  PaginatedResponse,
  ApiResponse,
} from '../../../shared/common';
import { BaseCrudService, BaseListParams } from '../../../core/services';

/**
 * Parámetros para listas de comentarios paginadas.
 * Extiende BaseListParams para funcionalidad de ordenamiento.
 */
export interface CommentListParams extends BaseListParams {
  sort?: 'newest' | 'oldest' | 'mostLiked';
}

/**
 * Respuesta de la API para operaciones de comentarios.
 * Extiende la interfaz común ApiResponse.
 */
export type CommentApiResponse = ApiResponse;

// COMMENT SERVICE: operaciones relacionadas con comentarios (TS)
@Injectable({
  providedIn: 'root'
})
export class CommentService extends BaseCrudService<
  CommentResponse,
  CommentRequest,
  CommentRequest,
  CommentListParams
> {

  protected readonly API_URL = `${environment.apiUrl}/comments`;
  protected readonly entityName = 'comment';

  /**
   * Obtiene el ID de un comentario.
   * @param comment - Comentario
   * @returns ID del comentario
   */
  protected getItemId(comment: CommentResponse): number {
    return comment.id;
  }

  // MÉTODOS ESPECÍFICOS DE COMENTARIOS

  // LISTADOS Y BÚSQUEDAS

  /**
   * Obtiene los comentarios de un post específico con paginación.
   * @param postId - ID del post
   * @param params - Parámetros de paginación y ordenamiento
   * @returns Observable con lista paginada de comentarios
   */
  getPostComments(postId: number, params: CommentListParams = {}): Observable<PaginatedResponse<CommentResponse>> {
    const httpParams = this.buildHttpParams(params);

    return this.http.get<PaginatedResponse<CommentResponse>>(
      `${this.API_URL}/post/${postId}`,
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
  private buildHttpParams(params: CommentListParams): HttpParams {
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
