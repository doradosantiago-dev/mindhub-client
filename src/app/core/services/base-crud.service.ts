import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { ApiResponse, PaginatedResponse, SortableListParams } from '../../shared/common';

/**
 * Parámetros base para listados con paginación y ordenamiento.
 */
export interface BaseListParams extends SortableListParams {
  sort?: string;
}
// BASE CRUD SERVICE: servicio base genérico para CRUD (TS)
@Injectable()
export abstract class BaseCrudService<
  T,
  TCreate,
  TUpdate,
  TListParams extends BaseListParams = BaseListParams
> {
  protected readonly http = inject(HttpClient);

  // Signals privados para el estado interno
  protected readonly _isLoading = signal<boolean>(false);
  protected readonly _currentItem = signal<T | null>(null);
  protected readonly _items = signal<T[]>([]);

  // Signals públicos readonly para componentes
  readonly isLoading = this._isLoading.asReadonly();
  readonly currentItem = this._currentItem.asReadonly();
  readonly items = this._items.asReadonly();

  // Computed values para estado combinado
  readonly state = computed(() => ({
    currentItem: this._currentItem(),
    items: this._items(),
    isLoading: this._isLoading()
  }));

  // Computed values adicionales
  readonly hasItems = computed(() => this._items().length > 0);
  readonly hasCurrentItem = computed(() => this._currentItem() !== null);
  readonly itemsCount = computed(() => this._items().length);

  /**
   * URL base de la API. Debe ser implementada por cada servicio específico.
   */
  protected abstract readonly API_URL: string;

  /**
   * Nombre de la entidad para logging y debugging.
   */
  protected abstract readonly entityName: string;

  // MÉTODOS CRUD GENÉRICOS

  /**
   * Crea una nueva entidad.
   * @param request - Datos de la entidad a crear
   * @returns Observable con la entidad creada
   */
  create(request: TCreate): Observable<T> {
    this._isLoading.set(true);

    return this.http.post<T>(this.API_URL, request)
      .pipe(
        tap(item => {
          this._items.update(items => [item, ...items]);
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene una entidad específica por su ID.
   * @param id - ID de la entidad
   * @returns Observable con la entidad
   */
  getById(id: number): Observable<T> {
    this._isLoading.set(true);

    return this.http.get<T>(`${this.API_URL}/${id}`)
      .pipe(
        tap(item => {
          this._currentItem.set(item);
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Actualiza una entidad existente.
   * @param id - ID de la entidad a actualizar
   * @param request - Nuevos datos de la entidad
   * @returns Observable con la entidad actualizada
   */
  update(id: number, request: TUpdate): Observable<T> {
    this._isLoading.set(true);

    return this.http.put<T>(`${this.API_URL}/${id}`, request)
      .pipe(
        tap(updatedItem => {
          this._currentItem.set(updatedItem);
          this._items.update(items =>
            items.map(item => this.getItemId(item) === id ? updatedItem : item)
          );
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Elimina una entidad del sistema.
   * @param id - ID de la entidad a eliminar
   * @returns Observable con la confirmación de eliminación
   */
  delete(id: number): Observable<ApiResponse> {
    this._isLoading.set(true);

    return this.http.delete<ApiResponse>(`${this.API_URL}/${id}`)
      .pipe(
        tap(() => {
          this._items.update(items => items.filter(item => this.getItemId(item) !== id));
          if (this._currentItem() && this.getItemId(this._currentItem()!) === id) {
            this._currentItem.set(null);
          }
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene una lista paginada de entidades.
   * @param params - Parámetros de paginación y filtrado
   * @returns Observable con lista paginada
   */
  getList(params?: TListParams): Observable<PaginatedResponse<T>> {
    this._isLoading.set(true);

    let httpParams = new HttpParams();
    if (params) {
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
      if (params.sort) httpParams = httpParams.set('sort', params.sort);
    }

    return this.http.get<PaginatedResponse<T>>(this.API_URL, { params: httpParams })
      .pipe(
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

  // MÉTODOS AUXILIARES


  /**
   * Obtiene el ID de una entidad.
   * Debe ser implementado por cada servicio específico.
   * @param item - Entidad
   * @returns ID de la entidad
   */
  protected abstract getItemId(item: T): number;

  /**
   * Limpia el estado del servicio.
   */
  clearState(): void {
    this._currentItem.set(null);
    this._items.set([]);
    this._isLoading.set(false);
  }

  /**
   * Establece el estado de carga.
   * @param loading - Estado de carga
   */
  setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }
}
