// ERROR INTERCEPTOR: manejo centralizado de errores HTTP (TS)

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../features/auth';
import { NotificationService } from '../../features/notification/data-access/notification.service';
import { environment } from '../../../environments/environment';

// Error interceptor funcional: captura y maneja errores HTTP
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const injector = inject(Injector);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Logging moderno con template literals y destructuring
      if (environment.debug) {
        const { url, method } = req;
        const { status, error: errorBody } = error;

        console.error(`HTTP Error [${status}] ${method} ${url}`, {
          error: errorBody,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
      }

      // Obtener NotificationService de forma lazy para evitar dependencia circular
      const notificationService = injector.get(NotificationService);

      // Manejo moderno con pattern matching
      const errorHandler = getErrorHandler(error.status);
      errorHandler(authService, router, notificationService, error);

      // Re-lanzar error con función arrow moderna
      return throwError(() => error);
    })
  );
};

/**
 * Factory function que retorna el handler apropiado para cada código de error.
 * Utiliza pattern matching moderno de TypeScript 5.9.
 */
const getErrorHandler = (status: number) => {
  const handlers = new Map<number, ErrorHandler>([
    [401, handleUnauthorizedError],
    [403, handleForbiddenError],
    [404, handleNotFoundError],
    [409, handleConflictError],
    [422, handleValidationError],
    [500, handleServerError],
    [0, handleNetworkError]
  ]);

  return handlers.get(status) ?? handleGenericError;
};

/**
 * Tipo para handlers de error con tipado estricto.
 */
type ErrorHandler = (
  authService: AuthService,
  router: Router,
  notificationService: NotificationService,
  error: HttpErrorResponse
) => void;

/**
 * Maneja errores 401 (no autorizado) - Ultra moderno.
 */
const handleUnauthorizedError: ErrorHandler = (authService, router) => {
  authService.logout();
  router.navigate(['/auth/login']);
};

/**
 * Maneja errores 403 (prohibido) - Ultra moderno.
 */
const handleForbiddenError: ErrorHandler = (_, router, notificationService, error) => {
  // Solo navegar a /unauthorized si no es un error de comentarios/recursos
  const url = error.url || '';
  if (!url.includes('/comments/') && !url.includes('/posts/')) {
    router.navigate(['/unauthorized']);
  }
  // Para errores de recursos específicos, solo logear
  if (environment.debug) {
    console.warn('Acceso prohibido a recurso:', url);
  }
};

/**
 * Maneja errores 404 (no encontrado) - Ultra moderno.
 */
const handleNotFoundError: ErrorHandler = () => {
  if (environment.debug) {
    console.warn('Recurso no encontrado');
  }
};

/**
 * Maneja errores 409 (conflicto) - Ultra moderno.
 */
const handleConflictError: ErrorHandler = () => {
  if (environment.debug) {
    console.warn('Conflicto detectado');
  }
};

/**
 * Maneja errores 422 (validación) - Ultra moderno.
 */
const handleValidationError: ErrorHandler = (_, __, ___, error) => {
  const message = error.error?.message ?? 'Los datos proporcionados no son válidos.';

  if (environment.debug) {
    console.warn('Error de validación:', message);
  }
};

/**
 * Maneja errores 500 (servidor) - Ultra moderno.
 */
const handleServerError: ErrorHandler = () => {
  if (environment.debug) {
    console.error('Error interno del servidor');
  }
};

/**
 * Maneja errores de red (status 0) - Ultra moderno.
 */
const handleNetworkError: ErrorHandler = () => {
  if (environment.debug) {
    console.error('Error de conexión de red');
  }
};

/**
 * Maneja errores genéricos - Ultra moderno.
 */
const handleGenericError: ErrorHandler = (_, __, ___, error) => {
  const message = error.error?.message ?? `Error ${error.status}: ${error.statusText}`;

  if (environment.debug) {
    console.error('Error genérico:', message);
  }
};
