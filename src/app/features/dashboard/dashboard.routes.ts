/** Dashboard routes: navegación interna y lazy loading. */

import { Routes } from '@angular/router';
import { authGuard, adminGuard } from '../../core/guards';

export const DASHBOARD_ROUTES: Routes = [

  // LAYOUT DEL DASHBOARD
  {
    path: '',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    children: [

      // RUTA PRINCIPAL DEL DASHBOARD
      {
        path: '',
        loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
        title: 'Dashboard - MindHub',
        canActivate: [authGuard]
      },

      // RUTAS DE USUARIO
      {
        path: 'feed',
        loadComponent: () => import('../user/components/feed/feed.component').then(m => m.FeedComponent),
        title: 'Feed - MindHub',
        canActivate: [authGuard]
      },
      {
        path: 'followers',
        loadComponent: () => import('../user/components/followers/followers.component').then(m => m.FollowersComponent),
        title: 'Seguidores - MindHub',
        canActivate: [authGuard]
      },
      {
        path: 'user/:id',
        loadComponent: () => import('../user/components/user-feed/user-feed.component').then(m => m.UserFeedComponent),
        title: 'Perfil de Usuario - MindHub',
        canActivate: [authGuard]
      },
      // La sección de 'Mis Posts' se ha eliminado (routes limpiadas)
      {
        path: 'profile',
        loadComponent: () => import('../profile/components/profile.component').then(m => m.ProfileComponent),
        title: 'Configuración - MindHub',
        canActivate: [authGuard]
      },

      // RUTAS DE ADMINISTRACIÓN
      {
        path: 'admin/users',
        loadComponent: () => import('../admin/user-management/user-management.component').then(m => m.UserManagementComponent),
        title: 'Gestión de Usuarios - MindHub',
        canActivate: [adminGuard]
      },
      {
        path: 'admin/content',
        loadComponent: () => import('../admin/content-management/content-management.component').then(m => m.ContentManagementComponent),
        title: 'Gestión de Contenido - MindHub',
        canActivate: [adminGuard]
      }
    ]
  }
];
