import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth';

// ADMIN GUARD: protege rutas administrativas (redirige si no autorizado)
export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar si NO está autenticado
  if (!authService.checkAuthenticationStatus()) {
    router.navigate(['/auth/login']);
    return false;
  }

  // Verificar rol de administrador
  if (authService.isAdmin()) {
    // Permite acceso al admin Dashboard
    return true;
  }

  // Usuario autenticado pero NO es admin (Usuario normal)
  router.navigate(['/unauthorized']);
  // No permite acceso al admin Dashboard
  return false;
};
