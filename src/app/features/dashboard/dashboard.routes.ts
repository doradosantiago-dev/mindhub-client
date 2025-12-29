/** Dashboard routes: navegación interna y lazy loading. */

import { Routes } from '@angular/router';
import { authGuard, adminGuard } from '../../core/guards';

export const DASHBOARD_ROUTES: Routes = [

  // LAYOUT DEL DASHBOARD
  {
    path: '',
    loadComponent: () => import('./dashboard.component').then(m => m.DashboardComponent),
    children: [

      // RUTA PRINCIPAL DEL DASHBOARD
      {
        path: '',
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
        title: 'Dashboard - MindHub',
        canActivate: [authGuard]
      },

      // RUTAS DE USUARIO
      {
        path: 'feed',
        loadComponent: () => import('../user/ui/feed/feed.component').then(m => m.FeedComponent),
        title: 'Feed - MindHub',
        canActivate: [authGuard]
      },
      {
        path: 'followers',
        loadComponent: () => import('../user/ui/followers/followers.component').then(m => m.FollowersComponent),
        title: 'Seguidores - MindHub',
        canActivate: [authGuard]
      },
      {
        path: 'user/:id',
        loadComponent: () => import('../user/ui/user-search/user-search.component').then(m => m.UserFeedComponent),
        title: 'Perfil de Usuario - MindHub',
        canActivate: [authGuard]
      },
      // La sección de 'Mis Posts' se ha eliminado (routes limpiadas)
      {
        path: 'profile',
        loadComponent: () => import('../profile/profile.component').then(m => m.ProfileComponent),
        title: 'Configuración - MindHub',
        canActivate: [authGuard]
      },

      // RUTAS DE ADMINISTRACIÓN
      {
        path: 'admin/users',
        loadComponent: () => import('../admin/pages/user-management/user-management.component').then(m => m.UserManagementComponent),
        title: 'Gestión de Usuarios - MindHub',
        canActivate: [adminGuard]
      },
      {
        path: 'admin/content',
        loadComponent: () => import('../admin/pages/content-management/report-management.component').then(m => m.ContentManagementComponent),
        title: 'Gestión de Contenido - MindHub',
        canActivate: [adminGuard]
      }
    ]
  }
];
