import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards';


export const routes: Routes = [
    // Ruta principal (landing)
    {
        path: '',
        loadComponent: () => import('./public').then(m => m.LandingComponent),
        title: 'MindHub - Tu Red Social Inteligente'
    },

    // Redirección: /landing -> /
    {
        path: 'landing',
        redirectTo: '',
        pathMatch: 'full'
    },

    // Rutas de autenticación (solo no autenticados)
    {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
        title: 'Autenticación - MindHub',
        canActivate: [guestGuard]
    },

    // Dashboard (requiere autenticación)
    {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
        title: 'Dashboard - MindHub',
        canActivate: [authGuard]
    },

    // Redirección: /home -> /dashboard
    {
        path: 'home',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },

    // Ruta de acceso no autorizado
    {
        path: 'unauthorized',
        loadComponent: () => import('./public').then(m => m.UnauthorizedComponent),
        title: 'Acceso No Autorizado - MindHub'
    },

    // Ruta para página no encontrada
    {
        path: '**',
        loadComponent: () => import('./public').then(m => m.NotFoundComponent),
        title: 'Página No Encontrada - MindHub'
    }
];
