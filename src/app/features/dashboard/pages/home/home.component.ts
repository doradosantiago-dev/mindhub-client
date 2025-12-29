/** Home: resumen del dashboard — estadísticas, actividad y métricas. */

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AuthService, FollowService, NotificationService, PostService } from '@core/services';
import { FooterComponent, PaginationComponent } from '@shared/components';
import { DateFormatPipe } from '@shared/pipes/date-format.pipe';
import { MatIconModule } from '@angular/material/icon';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { NotificationResponse, NotificationType, PostResponse } from '@core/models';

// INTERFACES

/** Estadísticas del dashboard */
interface DashboardStat {
  label: string;
  value: number;
  icon: string;
  color: string;
}

/** Ítem de actividad reciente */
interface ActivityItem {
  id: string | number;
  icon: string;
  text: string;
  time: string;
}

/** Estadísticas del usuario */
interface UserStats {
  postsCount: number;
  followersCount: number;
  likesCount: number;
}

/** Estadísticas del administrador */
interface AdminStats {
  totalUsuarios: number;
  usuariosActivos: number;
  usuariosInactivos: number;
  totalPosts: number;
  reportesPendientes: number;
  reportesRechazados: number;
  reportesResueltos: number;
}

/** Acción administrativa */
interface AdminAction {
  actionType: string;
  actionDate: string;
  affectedUserFirstName?: string;
  affectedUserLastName?: string;
  affectedUserUsername?: string;
  entityId?: number;
  description?: string;
}

/**
 * Componente Home del Dashboard
 * 
 * Este componente muestra un resumen del dashboard del usuario, 
 * incluyendo estadísticas clave, actividad reciente y métricas administrativas.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FooterComponent, PaginationComponent, MatIconModule, DateFormatPipe],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  // INYECCIÓN DE SERVICIOS
  private readonly authService = inject(AuthService);
  private readonly postService = inject(PostService);
  private readonly followService = inject(FollowService);
  private readonly notificationService = inject(NotificationService);
  private readonly adminService = inject(AdminService);

  // SIGNAL DE ESTADO CONSOLIDADO
  private readonly _state = signal<{
    isLoading: boolean;
    isLoadingActivity: boolean;
    isTransitioning: boolean;
    error: string | null;
    userStats: UserStats;
    adminStats: AdminStats;
    recentActivity: ActivityItem[];
    currentPage: number;
    totalPages: number;
    totalElements: number;
    pageSize: number;
  }>({
    isLoading: false,
    isLoadingActivity: false,
    isTransitioning: false,
    error: null,
    userStats: {
      postsCount: 0,
      followersCount: 0,
      likesCount: 0
    },
    adminStats: {
      totalUsuarios: 0,
      usuariosActivos: 0,
      usuariosInactivos: 0,
      totalPosts: 0,
      reportesPendientes: 0,
      reportesRechazados: 0,
      reportesResueltos: 0
    },
    recentActivity: [],
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    pageSize: 5
  });

  // SIGNALS DE LECTURA COMPUTADOS
  readonly isLoading = computed(() => this._state().isLoading);
  readonly isLoadingActivity = computed(() => this._state().isLoadingActivity);
  readonly isTransitioning = computed(() => this._state().isTransitioning);
  readonly error = computed(() => this._state().error);
  readonly userStats = computed(() => this._state().userStats);
  readonly adminStats = computed(() => this._state().adminStats);
  readonly recentActivity = computed(() => this._state().recentActivity);
  readonly currentPage = computed(() => this._state().currentPage);
  readonly totalPages = computed(() => this._state().totalPages);
  readonly totalElements = computed(() => this._state().totalElements);
  readonly pageSize = computed(() => this._state().pageSize);

  // VALORES COMPUTADOS
  readonly currentUser = computed(() => this.authService.currentUser());

  readonly isAdmin = computed(() => {
    const user = this.currentUser();
    return user?.role?.name === 'ADMIN';
  });

  readonly hasNextPage = computed(() => this._state().currentPage < this._state().totalPages - 1);
  readonly hasPreviousPage = computed(() => this._state().currentPage > 0);

  readonly socialStats = computed((): DashboardStat[] => {
    if (this.isAdmin()) {
      const stats = this._state().adminStats;
      return [
        { label: 'Total Usuarios', value: stats.totalUsuarios, icon: 'people', color: '#1e3a8a' },
        { label: 'Usuarios Activos', value: stats.usuariosActivos, icon: 'person', color: '#1d4ed8' },
        { label: 'Usuarios Inactivos', value: stats.usuariosInactivos, icon: 'person_off', color: '#3b82f6' },
        { label: 'Reportes Pendientes', value: stats.reportesPendientes, icon: 'flag', color: 'var(--emerald-800)' },
        { label: 'Reportes Rechazados', value: stats.reportesRechazados, icon: 'block', color: 'var(--emerald-600)' },
        { label: 'Reportes Resueltos', value: stats.reportesResueltos, icon: 'task_alt', color: 'var(--emerald-500)' }
      ];
    } else {
      const stats = this._state().userStats;
      return [
        { label: 'Posts', value: stats.postsCount, icon: 'edit_note', color: '#3b82f6' },
        { label: 'Seguidores', value: stats.followersCount, icon: 'group_add', color: '#10b981' },
        { label: 'Likes recibidos', value: stats.likesCount, icon: 'thumb_up', color: '#f59e0b' }
      ];
    }
  });

  readonly userDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Usuario';
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    return fullName || user.username || 'Usuario';
  });

  readonly userAvatar = computed(() => {
    const user = this.currentUser();

    // Si es admin y no tiene imagen, usar avatar de admin
    if (user?.role?.name === 'ADMIN' && (!user.profilePicture || user.profilePicture === '/assets/default-avatar.png')) {
      return '/admin-avatar.png';
    }

    // Si tiene imagen personalizada, usarla
    if (user?.profilePicture) {
      return user.profilePicture;
    }

    // Avatar por defecto para usuarios normales
    return '/assets/default-avatar.png';
  });

  // CONSTANTES PRIVADAS
  private readonly ACTIVITY_ICONS: Record<NotificationType, string> = {
    [NotificationType.COMMENT]: 'chat_bubble',
    [NotificationType.REACTION]: 'favorite',
    [NotificationType.REPORT]: 'campaign',
    [NotificationType.ADMIN_ACTION]: 'settings'
  };

  private readonly ADMIN_ACTIVITY_ICONS: Record<string, string> = {
    'ACTIVATE_USER': 'person_add',
    'DEACTIVATE_USER': 'person_off',
    'UPDATE_USER': 'edit_note',
    'DELETE_USER': 'person_remove',
    'DELETE_POST': 'delete_sweep',
    'RESOLVE_REPORT': 'task_alt',
    'REJECT_REPORT': 'cancel_presentation',
    'CREATE_ADMIN': 'admin_panel_settings',
    'DELETE_ADMIN': 'admin_panel_settings_off'
  };

  private readonly ADMIN_ACTIVITY_TEXTS: Record<string, (action: AdminAction) => string> = {
    'ACTIVATE_USER': (action) => `Cuenta de ${this.getDisplayName(action)} reactivada`,
    'DEACTIVATE_USER': (action) => `Cuenta de ${this.getDisplayName(action)} suspendida`,
    'UPDATE_USER': (action) => `Perfil de ${this.getDisplayName(action)} actualizado`,
    'DELETE_USER': (action) => `Cuenta de ${this.getDisplayName(action)} eliminada`,
    'DELETE_POST': (action) => {
      const displayName = this.getDisplayName(action);
      return `Publicación de ${displayName} eliminada`;
    },
    'RESOLVE_REPORT': (action) => {
      const displayName = this.getDisplayName(action);
      // Extraer solo la razón del reporte, ignorando el resto del description
      const reason = action.description?.match(/Razón: ([^-]+)/)?.[1]?.trim() || 'violación de normas';
      return `Reporte resuelto: publicación de ${displayName} removida por ${reason}`;
    },
    'REJECT_REPORT': (action) => {
      const displayName = this.getDisplayName(action);
      // Extraer solo la razón del reporte
      const reason = action.description?.match(/Razón: ([^-]+)/)?.[1]?.trim() || 'motivo del reporte';
      return `Reporte rechazado: publicación de ${displayName} no será eliminada por ${reason}`;
    },
    'CREATE_ADMIN': (action) => `Nuevo administrador ${this.getDisplayName(action)}`,
    'DELETE_ADMIN': (action) => `Administrador ${this.getDisplayName(action)} removido`
  };

  // LIFECYCLE HOOKS
  ngOnInit(): void {
    this.loadDashboardData();
  }

  // MÉTODOS PÚBLICOS

  /**
   * Refresca los datos del dashboard
   */
  refreshData(): void {
    this.loadDashboardData();
  }

  /**
   * Actualiza el dashboard con datos frescos
   */
  refreshDashboard(): void {
    this._state.update(state => ({ ...state, currentPage: 0 }));
    this.loadDashboardData();
  }

  /**
   * Maneja errores de carga de imágenes
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/favicon.ico';
  }

  // MÉTODOS PRIVADOS

  /**
   * Carga los datos del dashboard según el tipo de usuario
   */
  private loadDashboardData(): void {
    this._state.update(state => ({ ...state, isLoading: true, error: null }));

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this._state.update(state => ({
        ...state,
        error: 'No se pudo obtener la información del usuario',
        isLoading: false
      }));
      return;
    }

    if (currentUser.role?.name === 'ADMIN') {
      this.loadAdminData();
    } else {
      this.loadUserData(currentUser.id);
    }
  }

  /**
   * Carga datos específicos para administradores
   */
  private loadAdminData(): void {
    const currentPage = this._state().currentPage;
    const pageSize = this._state().pageSize;

    // Cargar estadísticas de admin
    this.adminService.getDashboardStats().pipe(
      catchError(() => of(this.getEmptyAdminStats())),
      finalize(() => this._state.update(state => ({ ...state, isLoading: false })))
    ).subscribe({
      next: (adminStats) => {
        this._state.update(state => ({ ...state, adminStats }));
        // Cargar actividades con paginación suave
        this.loadAdminActivityWithTransition(currentPage);
      },
      error: () => {
        this._state.update(state => ({
          ...state,
          error: 'Error al cargar los datos del dashboard de administración'
        }));
      }
    });
  }

  /**
   * Carga datos específicos para usuarios regulares
   */
  private loadUserData(userId: number): void {
    const currentPage = this._state().currentPage;
    const pageSize = this._state().pageSize;

    forkJoin({
      userPosts: this.postService.getMyPosts({ page: 0, size: 1000 }).pipe(
        catchError(() => of({ content: [], totalElements: 0, totalPages: 0 }))
      ),
      followers: this.followService.getFollowers(userId, { page: 0, size: 1 }).pipe(
        catchError(() => of({ content: [], totalElements: 0, totalPages: 0 }))
      ),
      notifications: this.notificationService.getMyNotifications({ page: currentPage, size: pageSize }).pipe(
        catchError(() => of({ content: [], totalElements: 0, totalPages: 0 }))
      )
    }).pipe(
      finalize(() => this._state.update(state => ({ ...state, isLoading: false })))
    ).subscribe({
      next: (data) => {
        this._state.update(state => ({
          ...state,
          userStats: {
            postsCount: data.userPosts.totalElements,
            followersCount: data.followers.totalElements,
            likesCount: this.calculateTotalLikes(data.userPosts.content)
          },
          recentActivity: this.formatRecentActivity(data.notifications.content),
          totalPages: data.notifications.totalPages,
          totalElements: data.notifications.totalElements
        }));
      },
      error: () => {
        this._state.update(state => ({
          ...state,
          error: 'Error al cargar los datos del dashboard'
        }));
      }
    });
  }

  /**
   * Retorna estadísticas vacías para administradores
   */
  private getEmptyAdminStats(): AdminStats {
    return {
      totalUsuarios: 0,
      usuariosActivos: 0,
      usuariosInactivos: 0,
      totalPosts: 0,
      reportesPendientes: 0,
      reportesRechazados: 0,
      reportesResueltos: 0
    };
  }

  /**
   * Calcula el total de likes de los posts del usuario
   */
  private calculateTotalLikes(posts: PostResponse[]): number {
    return posts.reduce((total, post) => total + (post.likeCount || 0), 0);
  }

  /**
   * Formatea la actividad reciente de notificaciones
   */
  private formatRecentActivity(notifications: NotificationResponse[]): ActivityItem[] {
    return notifications.map(notification => ({
      id: notification.id,
      icon: this.getActivityIconForNotification(notification),
      text: notification.message,
      time: notification.creationDate
    }));
  }

  /**
   * Formatea la actividad administrativa
   */
  private formatAdminActivity(adminActions: AdminAction[]): ActivityItem[] {
    return adminActions.map((action, index) => ({
      id: action.entityId || `${action.actionType}-${action.actionDate}-${index}`,
      icon: this.getAdminActivityIcon(action.actionType),
      text: this.getAdminActivityText(action),
      time: action.actionDate
    }));
  }

  /**
   * Obtiene el nombre de visualización de un usuario
   */
  private getDisplayName(action: AdminAction): string {
    const fullName = `${action.affectedUserFirstName || ''} ${action.affectedUserLastName || ''}`.trim();
    const username = action.affectedUserUsername;

    // Si no hay ningún dato del usuario (acciones antiguas sin información guardada)
    if (!username && !fullName) {
      return 'Usuario eliminado';
    }

    // Si hay username, mostrarlo con el nombre completo si existe
    return fullName ? `${fullName} (@${username})` : `@${username}`;
  }

  /**
   * Obtiene el icono para un tipo de actividad
   */
  private getActivityIcon(type: NotificationType): string {
    return this.ACTIVITY_ICONS[type] || 'person';
  }

  /**
   * Obtiene el icono apropiado para una notificación específica
   */
  private getActivityIconForNotification(notification: NotificationResponse): string {
    // Si es ADMIN_ACTION, detectar el tipo específico por el título
    if (notification.notificationType === NotificationType.ADMIN_ACTION && notification.title) {
      if (notification.title.includes('Nuevo reporte')) return 'campaign';
      if (notification.title.includes('Nuevo usuario registrado')) return 'person_add';
    }
    return this.getActivityIcon(notification.notificationType);
  }

  /**
   * Obtiene el icono para una acción administrativa
   */
  private getAdminActivityIcon(actionType: string): string {
    return this.ADMIN_ACTIVITY_ICONS[actionType] || 'settings';
  }

  /**
   * Obtiene el texto para una acción administrativa
   */
  private getAdminActivityText(action: AdminAction): string {
    const textGenerator = this.ADMIN_ACTIVITY_TEXTS[action.actionType];
    return textGenerator ? textGenerator(action) : `Acción administrativa: ${action.actionType}`;
  }

  // MÉTODOS DE PAGINACIÓN

  /**
   * Va a la página anterior
   */
  previousPage(): void {
    const state = this._state();
    if (!this.hasPreviousPage() || state.isLoadingActivity) {
      return;
    }

    const newPage = state.currentPage - 1;
    this._state.update(s => ({
      ...s,
      isTransitioning: true,
      isLoadingActivity: true,
      currentPage: newPage
    }));

    this.loadActivityPage(newPage);
  }

  /**
   * Va a la página siguiente
   */
  nextPage(): void {
    const state = this._state();
    if (!this.hasNextPage() || state.isLoadingActivity) {
      return;
    }

    const newPage = state.currentPage + 1;
    this._state.update(s => ({
      ...s,
      isTransitioning: true,
      isLoadingActivity: true,
      currentPage: newPage
    }));

    this.loadActivityPage(newPage);
  }

  /**
   * Va a una página específica
   */
  goToPage(page: number): void {
    const state = this._state();
    if (page < 0 || page >= state.totalPages || page === state.currentPage || state.isLoadingActivity) {
      return;
    }

    this._state.update(s => ({
      ...s,
      isTransitioning: true,
      isLoadingActivity: true,
      currentPage: page
    }));

    this.loadActivityPage(page);
  }

  /**
   * Carga la página de actividad según el tipo de usuario
   */
  private loadActivityPage(page: number): void {
    if (this.isAdmin()) {
      this.loadAdminActivityWithTransition(page);
    } else {
      this.loadUserActivityWithTransition(page);
    }
  }

  /**
   * Carga las acciones administrativas para una página específica con transiciones suaves
   */
  private loadAdminActivityWithTransition(page: number): void {
    if (!this.isAdmin()) {
      return;
    }

    this.adminService.getAdminActions({ page, size: this._state().pageSize, sort: 'actionDate,DESC' }).pipe(
      finalize(() => {
        // Delay para suavizar la transición
        setTimeout(() => {
          this._state.update(s => ({
            ...s,
            isLoadingActivity: false,
            isTransitioning: false
          }));
        }, 300);
      }),
      catchError(error => {
        this._state.update(s => ({
          ...s,
          isLoadingActivity: false,
          isTransitioning: false
        }));
        return of({ content: [], totalPages: 0, totalElements: 0 });
      })
    ).subscribe(response => {
      this._state.update(s => ({
        ...s,
        recentActivity: this.formatAdminActivity(response.content),
        totalPages: response.totalPages,
        totalElements: response.totalElements
      }));
    });
  }

  /**
   * Carga las notificaciones del usuario para una página específica con transiciones suaves
   */
  private loadUserActivityWithTransition(page: number): void {
    if (this.isAdmin()) {
      return;
    }

    this.notificationService.getMyNotifications({ page, size: this._state().pageSize }).pipe(
      finalize(() => {
        setTimeout(() => {
          this._state.update(s => ({
            ...s,
            isLoadingActivity: false,
            isTransitioning: false
          }));
        }, 300);
      }),
      catchError(error => {
        this._state.update(s => ({
          ...s,
          isLoadingActivity: false,
          isTransitioning: false
        }));
        return of({ content: [], totalPages: 0, totalElements: 0 });
      })
    ).subscribe(response => {
      this._state.update(s => ({
        ...s,
        recentActivity: this.formatRecentActivity(response.content),
        totalPages: response.totalPages,
        totalElements: response.totalElements
      }));
    });
  }
}
