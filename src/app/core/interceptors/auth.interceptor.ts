import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../features/auth';

// AUTH INTERCEPTOR: añade token Authorization a peticiones HTTP
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Obtener el token del servicio de autenticación
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Solo modificar la petición si existe un token válido
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Continuar con la petición (modificada o no)
  return next(req);
};
