// Sidebar standalone: menú lateral con items computados por rol
import { Component, computed, inject, signal, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/services';
import { UserConfirmModalComponent, type ConfirmModalData } from '@features/admin/user-management/components/user-confirm-modal/user-confirm-modal.component';

// Tipos
/** Interfaz para elementos del menú del sidebar */
interface MenuItem {
  /** Etiqueta visible del elemento del menú */
  label: string;
  /** Nombre del icono SVG a mostrar */
  icon: string;
  /** Ruta de navegación */
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, UserConfirmModalComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  // Inyecciones
  /** Servicio de autenticación */
  private readonly authService = inject(AuthService);

  /** Servicio de navegación */
  readonly router = inject(Router);

  // State (signals)
  /** Signal: estado colapsado del sidebar */
  private readonly _isCollapsed = signal<boolean>(false);

  /** Estado colapsado (readonly) */
  readonly isCollapsed = this._isCollapsed.asReadonly();

  /** Signal: estado del modal de confirmación de logout */
  readonly showLogoutModal = signal<boolean>(false);

  /** Signal: datos del modal de confirmación */
  readonly logoutModalData = signal<ConfirmModalData>({
    title: 'Cerrar Sesión',
    message: '¿Estás seguro de que deseas cerrar sesión?',
    confirmText: 'Cerrar Sesión',
    cancelText: 'Cancelar',
    type: 'warning',
    icon: 'logout'
  });

  // Computed values: menú según rol
  readonly menuItems = computed((): MenuItem[] => {
    const user = this.authService.currentUser();
    const isAdmin = user?.role?.name === 'ADMIN';

    if (isAdmin) {
      return this.getAdminMenuItems();
    } else {
      return this.getUserMenuItems();
    }
  });

  // Métodos públicos
  /** Inicialización del componente */
  ngOnInit(): void {
    // Inicialización del componente si es necesaria
  }

  /**
   * Alterna el estado colapsado del sidebar
   */
  toggleSidebar(): void {
    this._isCollapsed.update(collapsed => !collapsed);
  }

  /**
   * Abre el modal de confirmación de logout
   */
  logout(): void {
    this.showLogoutModal.set(true);
  }

  /**
   * Confirma y ejecuta el cierre de sesión
   */
  confirmLogout(): void {
    this.showLogoutModal.set(false);
    this.authService.logout();
    this.router.navigate(['/']);
  }

  /**
   * Cancela el cierre de sesión
   */
  cancelLogout(): void {
    this.showLogoutModal.set(false);
  }

  // Métodos privados
  /** Retorna los elementos del menú para administradores */
  private getAdminMenuItems(): MenuItem[] {
    return [
      {
        label: 'Dashboard Admin',
        icon: 'dashboard',
        route: '/dashboard'
      },
      {
        label: 'Gestión Usuarios',
        icon: 'users',
        route: '/dashboard/admin/users'
      },
      {
        label: 'Gestión Reportes',
        icon: 'content',
        route: '/dashboard/admin/content'
      },
      {
        label: 'Configuración',
        icon: 'settings',
        route: '/dashboard/profile'
      }
    ];
  }

  /** Retorna los elementos del menú para usuarios normales */
  private getUserMenuItems(): MenuItem[] {
    return [
      {
        label: 'Dashboard',
        icon: 'dashboard',
        route: '/dashboard'
      },
      {
        label: 'Feed',
        icon: 'feed',
        route: '/dashboard/feed'
      },
      {
        label: 'Gestionar seguidores',
        icon: 'followers',
        route: '/dashboard/followers'
      },
      {
        label: 'Configuración',
        icon: 'settings',
        route: '/dashboard/profile'
      }
    ];
  }
}
