import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, tap, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  User,
  UserUpdateRequest,
  AdminUserUpdateRequest,
  UserProfileRequest,
  UserRegisterRequest,
  PrivacyType
} from '../models';
import {
  PaginatedResponse,
  ApiResponse,
  SortableListParams,
  SearchableListParams
} from '../models/common';
import { AuthService } from './auth.service';

/**
 * Parámetros para búsqueda de usuarios.
 * Extiende SearchableListParams para funcionalidad de búsqueda.
 */
export interface UserSearchParams extends SearchableListParams {
  privacyType?: PrivacyType;
}

/**
 * Parámetros para listas de usuarios paginadas.
 * Extiende SortableListParams para funcionalidad de ordenamiento.
 */
export interface UserListParams extends SortableListParams {
  sort?: 'newest' | 'oldest' | 'name' | 'email';
  privacyType?: PrivacyType;
  active?: boolean;
}

/**
 * Respuesta de la API para operaciones de usuarios.
 * Extiende la interfaz común ApiResponse.
 */
export type UserApiResponse = ApiResponse;

/**
 * Respuesta de búsqueda de usuarios.
 * Extiende la interfaz común de paginación con query adicional.
 */
export interface UserSearchResponse extends PaginatedResponse<User> {
  query: string;
}

// USER SERVICE: operaciones relacionadas con usuarios (TS)
@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly API_URL = `${environment.apiUrl}/users`;

  // Signals privados para el estado interno
  private readonly _isLoading = signal<boolean>(false);
  private readonly _currentUser = signal<User | null>(null);
  private readonly _users = signal<User[]>([]);
  private readonly _searchResults = signal<User[]>([]);

  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  // USUARIO ACTUAL

  /**
   * Obtiene el usuario actual con perfil completo.
   * @returns Observable con el usuario actual
   */
  getCurrentUser(): Observable<User> {
    this._isLoading.set(true);

    return this.http.get<User>(`${this.API_URL}/me`)
      .pipe(
        tap(user => {
          this._currentUser.set(user);
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Actualiza el usuario actual.
   * @param request - Datos del usuario a actualizar
   * @returns Observable con el usuario actualizado
   */
  updateCurrentUser(request: UserUpdateRequest): Observable<User> {
    this._isLoading.set(true);

    return this.http.put<User>(`${this.API_URL}/me`, request)
      .pipe(
        tap(user => {
          this._currentUser.set(user);
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Elimina el usuario actual.
   * @returns Observable con la confirmación de eliminación
   */
  deleteCurrentUser(): Observable<UserApiResponse> {
    return this.http.delete<UserApiResponse>(`${this.API_URL}/me`)
      .pipe(
        tap(() => {
          this._currentUser.set(null);
        }),
        catchError(error => throwError(() => error))
      );
  }

  // USUARIOS ESPECÍFICOS

  /**
   * Obtiene un usuario por ID.
   * @param id - ID del usuario
   * @returns Observable con el usuario encontrado
   */
  getUserById(id: number): Observable<User> {
    this._isLoading.set(true);

    return this.http.get<User>(`${this.API_URL}/${id}`)
      .pipe(
        tap(user => {
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Actualiza un usuario por ID (solo admin o propio usuario).
   * @param id - ID del usuario
   * @param request - Datos del usuario a actualizar
   * @returns Observable con el usuario actualizado
   */
  updateUser(id: number, request: UserUpdateRequest): Observable<User> {
    this._isLoading.set(true);

    return this.http.put<User>(`${this.API_URL}/${id}`, request)
      .pipe(
        tap(user => {
          // Actualizar en la lista local si existe
          this._users.update(users =>
            users.map(u => u.id === id ? user : u)
          );
          // Si el usuario actualizado coincide con el usuario autenticado,
          // sincronizar estado de autenticación y localStorage para que la
          // UI (header, dashboard, perfil) muestre los datos nuevos.
          const current = this.auth.getCurrentUser();
          if (current && current.id === user.id) {
            this.auth.updateCurrentUser(user);
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
   * Actualiza un usuario como administrador.
   * @param id - ID del usuario
   * @param request - Datos del usuario a actualizar
   * @returns Observable con el usuario actualizado
   */
  updateUserAsAdmin(id: number, request: AdminUserUpdateRequest): Observable<User> {
    this._isLoading.set(true);

    return this.http.put<any>(`${this.API_URL}/${id}/admin`, request)
      .pipe(
        tap(response => {
          // La respuesta puede ser { user, token?, message } o solo User
          const user = response.user || response;
          const token = response.token;

          // Actualizar en la lista local si existe
          this._users.update(users =>
            users.map(u => u.id === id ? user : u)
          );

          // Si el admin actualiza su propio usuario, sincronizar AuthService
          const current = this.auth.getCurrentUser();
          if (current && current.id === user.id) {
            // Si hay nuevo token (cambio de username), actualizar token también
            if (token) {
              localStorage.setItem('token', token);
              localStorage.setItem('user', JSON.stringify(user));
              // Programar recarga después de un pequeño delay para permitir que se guarde el orden
              setTimeout(() => {
                window.location.reload();
              }, 100);
            } else {
              this.auth.updateCurrentUser(user);
            }
          }
          this._isLoading.set(false);
        }),
        map(response => response.user || response),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Elimina un usuario por ID (solo admin).
   * @param id - ID del usuario
   * @returns Observable con la confirmación de eliminación
   */
  deleteUser(id: number): Observable<UserApiResponse> {
    return this.http.delete<UserApiResponse>(`${this.API_URL}/${id}`)
      .pipe(
        tap(() => {
          // Remover de la lista local
          this._users.update(users => users.filter(u => u.id !== id));
        }),
        catchError(error => throwError(() => error))
      );
  }

  // BÚSQUEDA Y LISTADO

  /**
   * Busca usuarios públicos.
   * @param params - Parámetros de búsqueda
   * @returns Observable con los resultados de búsqueda
   */
  searchUsers(params: UserSearchParams): Observable<UserSearchResponse> {
    this._isLoading.set(true);

    const httpParams = this.buildSearchParams(params);

    return this.http.get<UserSearchResponse>(
      `${this.API_URL}/search`,
      { params: httpParams }
    ).pipe(
      tap(response => {
        this._searchResults.set(response.content);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene todos los usuarios (solo admin).
   * @param params - Parámetros de paginación y filtros
   * @returns Observable con lista paginada de usuarios
   */
  getAllUsers(params: UserListParams = {}): Observable<PaginatedResponse<User>> {
    this._isLoading.set(true);

    const httpParams = this.buildListParams(params);

    return this.http.get<PaginatedResponse<User>>(
      this.API_URL,
      { params: httpParams }
    ).pipe(
      tap(response => {
        this._users.set(response.content);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Busca usuarios desde el panel de administración (sin restricción de privacidad).
   * @param params - Parámetros de búsqueda
   * @returns Observable con los resultados de búsqueda
   */
  searchAllUsers(params: UserSearchParams): Observable<PaginatedResponse<User>> {
    this._isLoading.set(true);

    let httpParams = new HttpParams()
      .set('page', params.page?.toString() || '0')
      .set('size', params.size?.toString() || '10');

    // Agregar query solo si está presente
    if (params.query && params.query.trim()) {
      httpParams = httpParams.set('query', params.query.trim());
    }

    return this.http.get<PaginatedResponse<User>>(
      `${environment.apiUrl}/admin/users`,
      { params: httpParams }
    ).pipe(
      tap(response => {
        this._users.set(response.content);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  // PERFIL DE USUARIO

  /**
   * Obtiene el perfil del usuario actual.
   * @returns Observable con el perfil del usuario actual
   */
  getCurrentUserProfile(): Observable<User> {
    this._isLoading.set(true);

    return this.http.get<User>(`${this.API_URL}/me/profile`)
      .pipe(
        tap(user => {
          this._currentUser.set(user);
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Actualiza el perfil del usuario actual.
   * @param request - Datos del perfil a actualizar
   * @returns Observable con el usuario actualizado
   */
  updateCurrentUserProfile(request: UserProfileRequest): Observable<User> {
    this._isLoading.set(true);

    return this.http.put<User>(`${this.API_URL}/me/profile`, request)
      .pipe(
        tap(user => {
          this._currentUser.set(user);
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  // ADMINISTRACIÓN

  /**
   * Activa un usuario (solo admin).
   * @param id - ID del usuario
   * @returns Observable con la confirmación de activación
   */
  activateUser(id: number): Observable<UserApiResponse> {
    return this.http.put<UserApiResponse>(`${this.API_URL}/${id}/activate`, {})
      .pipe(
        tap(() => {
          // Actualizar estado en la lista local
          this._users.update(users =>
            users.map(u => u.id === id ? { ...u, active: true } : u)
          );
        }),
        catchError(error => throwError(() => error))
      );
  }

  /**
   * Obtiene el número de administradores activos en el sistema.
   * @returns Observable con el conteo de administradores activos
   */
  getActiveAdminCount(): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/admins/count`)
      .pipe(
        catchError(error => throwError(() => error))
      );
  }

  /**
   * Desactiva un usuario (solo admin).
   * @param id - ID del usuario
   * @returns Observable con la confirmación de desactivación
   */
  deactivateUser(id: number): Observable<UserApiResponse> {
    return this.http.put<UserApiResponse>(`${this.API_URL}/${id}/deactivate`, {})
      .pipe(
        tap(() => {
          // Actualizar estado en la lista local
          this._users.update(users =>
            users.map(u => u.id === id ? { ...u, active: false } : u)
          );
        }),
        catchError(error => throwError(() => error))
      );
  }

  /**
   * Crea un usuario administrador (solo admin).
   * @param userData - Datos del usuario administrador a crear
   * @returns Observable con el usuario creado
   */
  createAdminUser(userData: UserRegisterRequest): Observable<User> {
    this._isLoading.set(true);

    return this.http.post<User>(`${this.API_URL}/admin`, userData)
      .pipe(
        tap(user => {
          this._users.update(users => [user, ...users]);
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
   * Construye los parámetros HTTP para las consultas de búsqueda.
   * @param params - Parámetros de búsqueda
   * @returns HttpParams configurados
   */
  private buildSearchParams(params: UserSearchParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', params.page?.toString() || '0')
      .set('size', params.size?.toString() || '10');

    // Agregar query solo si está presente
    if (params.query) {
      httpParams = httpParams.set('query', params.query);
    }

    // Agregar filtro de privacidad si está presente
    if (params.privacyType) {
      httpParams = httpParams.set('privacyType', params.privacyType);
    }

    return httpParams;
  }

  /**
   * Construye los parámetros HTTP para las consultas de listado.
   * @param params - Parámetros de listado
   * @returns HttpParams configurados
   */
  private buildListParams(params: UserListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', params.page?.toString() || '0')
      .set('size', params.size?.toString() || '10');

    // Agregar ordenamiento si está presente
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    // Agregar filtro de privacidad si está presente
    if (params.privacyType) {
      httpParams = httpParams.set('privacyType', params.privacyType);
    }

    // Agregar filtro de estado activo si está presente
    if (params.active !== undefined) {
      httpParams = httpParams.set('active', params.active.toString());
    }

    return httpParams;
  }
}
