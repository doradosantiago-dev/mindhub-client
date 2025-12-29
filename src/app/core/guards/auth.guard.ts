import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../features/auth/data-access/auth.service';

// AUTH GUARD: protege rutas que requieren autenticación
export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar si está autenticado
  if (authService.checkAuthenticationStatus()) {
    // Permite acceso al Dashboard
    return true;
  }

  // Usuario NO autenticado, redirigir al Login
  router.navigate(['/auth/login']);
  return false;
};
