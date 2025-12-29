// Auth routes — lazy-loaded authentication routes

import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards';

export const AUTH_ROUTES: Routes = [

  // RUTA DE LOGIN (SOLO NO AUTENTICADOS)
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
    title: 'Iniciar Sesión - MindHub',
    canActivate: [guestGuard]
  },

  // RUTA DE REGISTRO (SOLO NO AUTENTICADOS)
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent),
    title: 'Registro - MindHub',
    canActivate: [guestGuard]
  },

  // RUTA POR DEFECTO
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
