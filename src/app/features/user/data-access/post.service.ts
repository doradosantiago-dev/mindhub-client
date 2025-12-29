import { Injectable, signal, computed } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  PostCreateRequest,
  PostResponse,
  PrivacyType
} from '../models';
import {
  PaginatedResponse,
  ApiResponse
} from '../models/common';
import { BaseCrudService, BaseListParams } from './base-crud.service';

/**
 * Parámetros para listas de posts paginadas.
 * Extiende BaseListParams para funcionalidad de búsqueda y ordenamiento.
 */
export interface PostListParams extends BaseListParams {
  sort?: 'newest' | 'oldest' | 'mostLiked' | 'mostCommented';
  privacy?: 'all' | 'public' | 'private';
  search?: string;
}

/**
 * Respuesta de la API para operaciones de posts.
 * Extiende la interfaz común ApiResponse.
 */
export type PostApiResponse = ApiResponse;

// POST SERVICE: operaciones relacionadas con posts (TS)
@Injectable({
  providedIn: 'root'
})
export class PostService extends BaseCrudService<
  PostResponse,
  PostCreateRequest,
  PostCreateRequest,
  PostListParams
> {

  protected readonly API_URL = `${environment.apiUrl}/posts`;
  protected readonly entityName = 'post';

  /**
   * Obtiene el ID de un post.
   * @param post - Post
   * @returns ID del post
   */
  protected getItemId(post: PostResponse): number {
    return post.id;
  }


  // MÉTODOS ESPECÍFICOS DE POSTS

  // FEEDS Y LISTADOS

  /**
   * Obtiene el feed personalizado del usuario autenticado.
   * @param params - Parámetros de paginación y filtrado
   * @returns Observable con lista paginada de posts del feed
   */
  getPersonalFeed(params: PostListParams = {}): Observable<PaginatedResponse<PostResponse>> {
    this._isLoading.set(true);

    const httpParams = this.buildHttpParams(params);

    return this.http.get<PaginatedResponse<PostResponse>>(
      `${this.API_URL}/feed`,
      { params: httpParams }
    ).pipe(
      tap(response => {
        this._items.set(response.content);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene los posts del usuario autenticado.
   * @param params - Parámetros de paginación y filtrado
   * @returns Observable con lista paginada de posts propios
   */
  getMyPosts(params: PostListParams = {}): Observable<PaginatedResponse<PostResponse>> {
    this._isLoading.set(true);

    const httpParams = this.buildHttpParams(params);

    return this.http.get<PaginatedResponse<PostResponse>>(
      `${this.API_URL}/me`,
      { params: httpParams }
    ).pipe(
      tap(response => {
        this._items.set(response.content);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene los posts de un usuario específico.
   * @param userId - ID del usuario
   * @param params - Parámetros de paginación y filtrado
   * @returns Observable con lista paginada de posts del usuario
   */
  getUserPosts(userId: number, params: PostListParams = {}): Observable<PaginatedResponse<PostResponse>> {
    this._isLoading.set(true);

    const httpParams = this.buildHttpParams(params);

    return this.http.get<PaginatedResponse<PostResponse>>(
      `${this.API_URL}/user/${userId}`,
      { params: httpParams }
    ).pipe(
      tap(response => {
        this._items.set(response.content);
        this._isLoading.set(false);
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
  private buildHttpParams(params: PostListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', params.page?.toString() || '0')
      .set('size', params.size?.toString() || '10');

    // Agregar ordenamiento si está presente - convertir al formato Spring Boot
    if (params.sort) {
      const sortMapping: Record<string, string> = {
        'newest': 'creationDate,desc',
        'oldest': 'creationDate,asc',
        'mostLiked': 'reactionCount,desc',
        'mostCommented': 'commentCount,desc'
      };
      const springSort = sortMapping[params.sort] || 'creationDate,desc';
      httpParams = httpParams.set('sort', springSort);
    }

    // Agregar filtro de privacidad si está presente
    if (params.privacy && params.privacy !== 'all') {
      httpParams = httpParams.set('privacy', params.privacy);
    }

    return httpParams;
  }
}
