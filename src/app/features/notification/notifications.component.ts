/** Notifications: panel, estados y acciones rápidas. */

import { Component, input, output, signal, inject, effect, OnDestroy, HostListener, runInInjectionContext, Injector, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { AuthService, ErrorHandlerService } from '@core/services';
import { NotificationService } from '@core/services';
import { NotificationResponse } from '@core/models';
import { DateFormatPipe } from '@shared/pipes';

// Interfaces y tipos

/**
 * Interfaz para opciones de paginación
 */
interface PaginationOptions {
  /** Número de página (base 0) */
  page: number;
  /** Tamaño de la página */
  size: number;
}

/**p
 * Interfaz para iconos de notificaciones
 */
interface NotificationIconMap {
  /** Tipo de notificación */
  type: string;
  /** Nombre del icono de Material Design */
  icon: string;
}

// Componente principal

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, MatIconModule, DateFormatPipe],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnDestroy {
  // ============================================================================
  // INYECCIONES DE DEPENDENCIAS
  // ============================================================================

  /** Servicio de notificaciones */
  private readonly notificationService = inject(NotificationService);

  /** Servicio de autenticación */
  private readonly authService = inject(AuthService);

  /** Servicio de manejo de errores */
  private readonly errorHandler = inject(ErrorHandlerService);

  /** Injector para contexto de inyección */
  private readonly injector = inject(Injector);

  // ===== DESTROY SUBJECT =====
  private readonly destroy$ = new Subject<void>();

  // ============================================================================
  // INPUTS REQUERIDOS
  // ============================================================================

  /** Controla la visibilidad del panel de notificaciones */
  readonly isOpen = input<boolean>(false);

  // ============================================================================
  // OUTPUTS
  // ============================================================================

  /** Evento emitido cuando se cierra el panel */
  readonly closed = output<void>();

  // ============================================================================
  // SIGNALS PRIVADOS PARA ESTADO INTERNO
  // ============================================================================

  /** Estado consolidado del componente */
  private readonly _state = signal<{
    notifications: NotificationResponse[];
    unreadCount: number;
  }>({
    notifications: [],
    unreadCount: 0
  });

  // ============================================================================
  // SIGNALS PÚBLICOS (READONLY)
  // ============================================================================

  /** Notificaciones del usuario (solo lectura) */
  readonly notifications = computed(() => this._state().notifications);

  /** Contador de notificaciones no leídas (solo lectura) */
  readonly unreadCount = computed(() => this._state().unreadCount);

  // ============================================================================
  // CONSTANTES
  // ============================================================================

  /** Opciones de paginación por defecto */
  private readonly DEFAULT_PAGINATION: PaginationOptions = { page: 0, size: 50 };

  /** Mapeo de tipos de notificación a iconos */
  private readonly NOTIFICATION_ICONS: NotificationIconMap[] = [
    { type: 'COMMENT', icon: 'mode_comment' },
    { type: 'REACTION', icon: 'favorite' },
    { type: 'FOLLOW', icon: 'person_add_alt' },
    { type: 'REPORT', icon: 'campaign' },
    { type: 'ADMIN_ACTION', icon: 'gavel' }
  ];

  // ============================================================================
  // CONSTRUCTOR Y CICLO DE VIDA
  // ============================================================================

  constructor() {
    this.loadNotifications();
    this.setupEffects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS
  // ============================================================================

  /**
   * Marca una notificación específica como leída
   * @param id - ID de la notificación a marcar como leída
   */
  markAsRead(id: number): void {
    this.notificationService.markAsRead(id).subscribe({
      next: () => {
        this.loadNotifications();
        this.closed.emit();
      },
      error: (error) => {
        // Error manejado silenciosamente
      }
    });
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.loadNotifications();
        this.closed.emit();
      },
      error: (error) => {
        // Error manejado silenciosamente
      }
    });
  }

  /**
   * Cierra el panel de notificaciones
   */
  closePanel(): void {
    this.closed.emit();
  }

  /**
   * Obtiene el icono apropiado para un tipo de notificación
   * @param type - Tipo de notificación
   * @param title - Título de la notificación (para detectar acciones admin específicas)
   * @returns Nombre del icono de Material Design
   */
  getNotificationIcon(type: string, title?: string): string {
    // Si es ADMIN_ACTION, detectar el tipo específico por el título
    if (type === 'ADMIN_ACTION' && title) {
      // Para ADMIN: nuevo reporte y nuevo usuario
      if (title.includes('Nuevo reporte')) return 'campaign';
      if (title.includes('Nuevo usuario registrado')) return 'person_add';
      // Para USUARIO: respuestas del admin sobre sus reportes, posts o cuenta
      if (title.includes('eliminada')) return 'delete_forever';
      if (title.includes('Reporte revisado')) return 'verified';
      if (title.includes('resuelto')) return 'task_alt';
      if (title.includes('rechazado')) return 'block';
      if (title.includes('desactivada')) return 'no_accounts';
      if (title.includes('activada')) return 'how_to_reg';
      if (title.includes('actualizados')) return 'manage_accounts';
    }

    const iconMap = this.NOTIFICATION_ICONS.find(item => item.type === type);
    return iconMap ? iconMap.icon : 'notifications';
  }

  /**
   * Obtiene la clase CSS específica para el tipo de notificación
   * @param type - Tipo de notificación
   * @param title - Título de la notificación (para detectar acciones admin específicas)
   * @returns Clase CSS para aplicar color específico
   */
  getNotificationClass(type: string, title?: string): string {
    // Si es ADMIN_ACTION, detectar el tipo específico por el título
    if (type === 'ADMIN_ACTION' && title) {
      if (title.includes('Nuevo reporte')) return 'notification-admin-report';
      if (title.includes('eliminada')) return 'notification-admin-delete';
      if (title.includes('Reporte revisado')) return 'notification-admin-reviewed';
      if (title.includes('resuelto')) return 'notification-admin-resolved';
      if (title.includes('rechazado')) return 'notification-admin-rejected';
      if (title.includes('desactivada')) return 'notification-admin-deactivated';
      if (title.includes('activada')) return 'notification-admin-activated';
      if (title.includes('actualizados')) return 'notification-admin-updated';
    }

    const classMap: Record<string, string> = {
      'COMMENT': 'notification-comment',
      'REACTION': 'notification-reaction',
      'FOLLOW': 'notification-follow',
      'ADMIN_ACTION': 'notification-admin'
    };
    return classMap[type] || '';
  }  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Configura los efectos reactivos del componente
   */
  private setupEffects(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        if (this.isOpen()) {
          this.loadNotifications();
        }
      });
    });
  }

  /**
   * Carga las notificaciones del usuario
   */
  private loadNotifications(): void {
    if (!this.authService.checkAuthenticationStatus()) {
      return;
    }

    this.notificationService.getMyNotifications(this.DEFAULT_PAGINATION).subscribe({
      next: (response) => {
        const unreadNotifications = response.content.filter(n => !n.read);
        this._state.update(s => ({
          ...s,
          notifications: unreadNotifications,
          unreadCount: unreadNotifications.length
        }));
      },
      error: (error) => {
        this.loadUnreadNotifications();
      }
    });
  }

  /**
   * Carga solo las notificaciones no leídas como fallback
   */
  private loadUnreadNotifications(): void {
    this.notificationService.getUnreadNotifications(this.DEFAULT_PAGINATION).subscribe({
      next: (response) => {
        this._state.update(s => ({
          ...s,
          notifications: response.content,
          unreadCount: response.content.length
        }));
      },
      error: (error) => {
        this._state.update(s => ({ ...s, notifications: [], unreadCount: 0 }));
      }
    });
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  /**
   * Maneja clics fuera del panel para cerrarlo automáticamente
   * @param event - Evento de clic del documento
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notifications-panel') && this.isOpen()) {
      this.closePanel();
    }
  }
}
