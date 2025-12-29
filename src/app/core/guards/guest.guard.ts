import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../features/auth';

/**
 * GUEST GUARD: Protege rutas que solo usuarios NO autenticados deben ver
 * 
 * @returns true si usuario NO está autenticado, false y redirige si lo está
 */
export const guestGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    // Verificar si está autenticado
    if (authService.checkAuthenticationStatus()) {
      // Redirigir al Dashboard, no permite ver login/Register
      router.navigate(['/dashboard']);
      return false;
    }
  } catch (error) {
    // Si hay error al validar el token (ej: username cambió), hacer logout
    authService.logout();
  }

  // Usuario NO autenticado, permite ver login/Register
  return true;
};
