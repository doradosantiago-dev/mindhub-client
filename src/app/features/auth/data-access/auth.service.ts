import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  UserLoginRequest,
  UserRegisterRequest,
  AuthResponse,
  TokenValidationResponse
} from '../models';
import { User, UserUpdateRequest, UserProfileRequest, AdminUserUpdateRequest } from '../../user/models';

// AUTH SERVICE: gestión de autenticación y sesión (TS)
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;

  // Signals privados para el estado interno
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isAuthenticated = signal<boolean>(false);
  private readonly _isLoading = signal<boolean>(false);

  // Signals públicos readonly para componentes
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  // Computed values para estado combinado
  readonly authState = computed(() => ({
    user: this._currentUser(),
    isAuthenticated: this._isAuthenticated()
  }));

  // Computed values adicionales
  readonly isAdmin = computed(() => this._currentUser()?.role?.name === 'ADMIN');
  readonly isUser = computed(() => this._currentUser()?.role?.name === 'USER');
  readonly hasUser = computed(() => this._currentUser() !== null);

  private readonly http = inject(HttpClient);

  constructor() {
    this.loadUserFromStorage();
  }

  /**
   * Inicia sesión del usuario.
   * @param credentials - Credenciales de login
   * @returns Observable con la respuesta de autenticación
   */
  login(credentials: UserLoginRequest): Observable<AuthResponse> {
    this._isLoading.set(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => {
          this.setAuthData(response.token, response.user);
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Registra un nuevo usuario.
   * @param userData - Datos del usuario a registrar
   * @returns Observable con el usuario creado
   */
  register(userData: UserRegisterRequest): Observable<User> {
    this._isLoading.set(true);

    return this.http.post<User>(`${this.API_URL}/register`, userData)
      .pipe(
        tap(() => this._isLoading.set(false)),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Actualiza información del usuario autenticado.
   * @param userData - Datos a actualizar
   * @returns Observable con el usuario actualizado
   */
  updateUser(userData: UserUpdateRequest): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/user`, userData)
      .pipe(
        tap(user => {
          this.updateCurrentUser(user);
        }),
        catchError(error => throwError(() => error))
      );
  }

  /**
   * Actualiza el perfil del usuario autenticado.
   * @param profileData - Datos del perfil a actualizar
   * @returns Observable con el usuario actualizado
   */
  updateUserProfile(profileData: UserProfileRequest): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/user/profile`, profileData)
      .pipe(
        tap(user => {
          this.updateCurrentUser(user);
        }),
        catchError(error => throwError(() => error))
      );
  }

  /**
   * Actualiza un usuario como administrador.
   * @param userId - ID del usuario a actualizar
   * @param userData - Datos a actualizar
   * @returns Observable con el usuario actualizado o con nuevo token si cambió username
   */
  adminUpdateUser(userId: number, userData: AdminUserUpdateRequest): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/admin/user/${userId}`, userData)
      .pipe(
        tap(response => {
          // Si el backend devolvió un nuevo token (cambio de username del admin)
          if (response.token) {
            this.setAuthData(response.token, response.user);
          } else if (response.user) {
            // Si solo devolvió el usuario, actualizar solo el usuario
            this.updateCurrentUser(response.user);
          }
        }),
        catchError(error => throwError(() => error))
      );
  }

  /**
   * Cierra la sesión del usuario.
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
  }

  /**
   * Verifica si el usuario está autenticado (método síncrono).
   * @returns true si está autenticado, false en caso contrario
   */
  checkAuthenticationStatus(): boolean {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user && this.isTokenValid(token));
  }

  /**
   * Obtiene el usuario actual (signal).
   * @returns Usuario actual o null
   */
  getCurrentUser(): User | null {
    return this._currentUser();
  }

  /**
   * Obtiene el token de autenticación.
   * @returns Token o null
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Verifica si el usuario tiene un rol específico.
   * @param role - Rol a verificar
   * @returns true si tiene el rol, false en caso contrario
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role?.name === role;
  }


  /**
   * Actualiza el usuario actual en el estado.
   * @param user - Usuario actualizado
   */
  updateCurrentUser(user: User): void {
    this._currentUser.set(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * Establece los datos de autenticación.
   * @param token - Token JWT
   * @param user - Usuario autenticado
   */
  private setAuthData(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this._currentUser.set(user);
    this._isAuthenticated.set(true);
  }

  /**
   * Carga el usuario desde el almacenamiento local.
   */
  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (userStr && token && this.isTokenValid(token)) {
      try {
        const user: User = JSON.parse(userStr);
        this._currentUser.set(user);
        this._isAuthenticated.set(true);
      } catch {
        this.logout();
      }
    }
  }

  /**
   * Verifica si un token JWT es válido.
   * @param token - Token a validar
   * @returns true si es válido, false en caso contrario
   */
  private isTokenValid(token: string): boolean {
    try {
      const payload = JSON.parse(this.decodeToken(token));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  /**
   * Decodifica un token JWT.
   * @param token - Token a decodificar
   * @returns Payload decodificado
   */
  private decodeToken(token: string): string {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return jsonPayload;
  }
}
