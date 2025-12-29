// ADMIN: User Management — Componente (gestión de usuarios)

import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, Subject, of, catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { AuthService, UserService, ErrorHandlerService, type UserListParams } from '@core/services';
import { AdminUserUpdateRequest, PrivacyType, User, UserRegisterRequest } from '@core/models';
import { HttpErrorResponse } from '@angular/common/http';
import { FooterComponent, PaginationComponent } from '@shared/components';
import { MatIconModule } from '@angular/material/icon';
import { UserListComponent } from './components/user-list/user-list.component';
import { UserConfirmModalComponent, type ConfirmModalData } from './components/user-confirm-modal/user-confirm-modal.component';
import { UserCreateModalComponent, type CreateUserData } from './components/user-create-modal/user-create-modal.component';
import { UserEditModalComponent, type EditUserData } from './components/user-edit-modal/user-edit-modal.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    PaginationComponent,
    MatIconModule,
    UserListComponent,
    UserConfirmModalComponent,
    UserCreateModalComponent,
    UserEditModalComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnDestroy {
  // INYECCIÓN DE SERVICIOS
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandlerService);

  // DESTROY SUBJECT
  private readonly destroy$ = new Subject<void>();

  // SEARCH SUBJECT con debounce
  private readonly searchSubject$ = new Subject<string>();

  // SIGNAL DE ESTADO CONSOLIDADO
  private readonly _state = signal<{
    users: User[];
    loading: boolean;
    isLoadingPage: boolean;
    isTransitioning: boolean;
    error: string | null;
    success: string | null;
    currentPage: number;
    totalPages: number;
    totalElements: number;
    pageSize: number;
    searchQuery: string;
  }>({
    users: [],
    loading: false,
    isLoadingPage: false,
    isTransitioning: false,
    error: null,
    success: null,
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    pageSize: 5,
    searchQuery: ''
  });

  // SIGNALS COMPUTADOS PARA ACCESO
  readonly users = computed(() => this._state().users);
  readonly loading = computed(() => this._state().loading);
  readonly isLoadingPage = computed(() => this._state().isLoadingPage);
  readonly isTransitioning = computed(() => this._state().isTransitioning);
  readonly error = computed(() => this._state().error);
  readonly success = computed(() => this._state().success);
  readonly currentPage = computed(() => this._state().currentPage);
  readonly totalPages = computed(() => this._state().totalPages);
  readonly totalElements = computed(() => this._state().totalElements);
  readonly pageSize = computed(() => this._state().pageSize);
  readonly searchQuery = computed(() => this._state().searchQuery);

  // Cuenta de administradores activos (global)
  private readonly _adminCount = signal<number>(0);
  readonly adminCount = computed(() => this._adminCount());

  // ID del usuario actual logueado
  readonly currentUserId = computed(() => this.authService.getCurrentUser()?.id ?? null);

  // SIGNAL DE ESTADO DE MODALES
  private readonly _modalState = signal<{
    showCreate: boolean;
    showEdit: boolean;
    showConfirm: boolean;
    confirmData: ConfirmModalData | null;
    editingUser: User | null;
    loading: boolean;
  }>({
    showCreate: false,
    showEdit: false,
    showConfirm: false,
    confirmData: null,
    editingUser: null,
    loading: false
  });

  // SIGNALS DE MODALES COMPUTADOS
  readonly showCreateModal = computed(() => this._modalState().showCreate);
  readonly showEditModal = computed(() => this._modalState().showEdit);
  readonly showConfirmModal = computed(() => this._modalState().showConfirm);
  readonly confirmModalData = computed(() => this._modalState().confirmData);
  readonly editingUser = computed(() => this._modalState().editingUser);
  readonly modalLoading = computed(() => this._modalState().loading);

  // VALORES COMPUTADOS
  readonly hasNextPage = computed(() => this._state().currentPage < this._state().totalPages - 1);
  readonly hasPreviousPage = computed(() => this._state().currentPage > 0);

  // LIFECYCLE HOOKS
  constructor() {
    this.loadUsers();
    // cargar conteo de admins global para habilitar/deshabilitar borrar
    this.refreshAdminCount();
    // Configurar debounce para búsqueda
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // MÉTODOS PÚBLICOS

  /**
   * Carga la lista de usuarios con paginación y transiciones suaves
   */
  loadUsers(): void {
    this._state.update(state => ({ ...state, loading: true, error: null }));

    const params: UserListParams = {
      page: this._state().currentPage,
      size: this._state().pageSize
    };

    this.userService.getAllUsers(params).pipe(
      finalize(() => this._state.update(state => ({ ...state, loading: false })))
    ).subscribe({
      next: (response) => {
        this._state.update(state => ({
          ...state,
          users: response.content,
          totalPages: response.totalPages,
          totalElements: response.totalElements
        }));
        // refrescar conteo global de admins tras actualizar la lista
        this.refreshAdminCount();
      },
      error: (error) => {
        const errorMessage = this.errorHandler.getUserErrorMessage(error);
        this._state.update(state => ({ ...state, error: errorMessage }));
      }
    });
  }

  /**
   * Carga usuarios con transición suave para paginación - patrón dashboard
   */
  private loadUsersWithTransition(page: number): void {
    this._state.update(state => ({ ...state, error: null }));

    const params: UserListParams = {
      page,
      size: this._state().pageSize
    };

    this.userService.getAllUsers(params).pipe(
      finalize(() => {
        setTimeout(() => {
          this._state.update(state => ({
            ...state,
            isLoadingPage: false,
            isTransitioning: false
          }));
        }, 300);
      }),
      catchError(error => {
        const errorMessage = this.errorHandler.getUserErrorMessage(error);
        this._state.update(state => ({
          ...state,
          error: errorMessage,
          isLoadingPage: false,
          isTransitioning: false
        }));
        return of({ content: [], totalPages: 0, totalElements: 0 });
      })
    ).subscribe({
      next: (response) => {
        this._state.update(state => ({
          ...state,
          users: response.content,
          totalPages: response.totalPages,
          totalElements: response.totalElements
        }));
      }
    });
  }

  /**
   * Busca usuarios por nombre o apellidos (se llama desde el input)
   */
  searchUsers(query: string): void {
    const cleaned = (query ?? '').trim();
    // Solo actualizar searchQuery para mostrar en el input
    this._state.update(state => ({ ...state, searchQuery: cleaned }));
    // Emitir al subject para activar debounce
    this.searchSubject$.next(cleaned);
  }

  /**
   * Configura el debounce para la búsqueda
   */
  private setupSearchDebounce(): void {
    this.searchSubject$.pipe(
      debounceTime(300), // Esperar 300ms después de la última pulsación
      distinctUntilChanged(), // Solo si el valor cambió
      takeUntil(this.destroy$),
      switchMap(query => {
        // Actualizar estado de loading y currentPage
        this._state.update(state => ({ ...state, currentPage: 0, loading: true }));

        if (query) {
          return this.userService.searchAllUsers({ query, page: 0, size: this._state().pageSize }).pipe(
            finalize(() => this._state.update(state => ({ ...state, loading: false }))),
            catchError(error => {
              const errorMessage = this.errorHandler.getUserErrorMessage(error);
              this._state.update(state => ({ ...state, error: errorMessage, loading: false }));
              return of({ content: [], totalPages: 0, totalElements: 0 });
            })
          );
        } else {
          // Si la búsqueda está vacía, cargar todos los usuarios
          const params: UserListParams = {
            page: 0,
            size: this._state().pageSize
          };
          return this.userService.getAllUsers(params).pipe(
            finalize(() => this._state.update(state => ({ ...state, loading: false }))),
            catchError(error => {
              const errorMessage = this.errorHandler.getUserErrorMessage(error);
              this._state.update(state => ({ ...state, error: errorMessage, loading: false }));
              return of({ content: [], totalPages: 0, totalElements: 0 });
            })
          );
        }
      })
    ).subscribe(response => {
      this._state.update(state => ({
        ...state,
        users: response.content,
        totalPages: response.totalPages,
        totalElements: response.totalElements
      }));
    });
  }

  /**
   * Limpia la búsqueda y recarga usuarios
   */
  clearSearch(): void {
    this._state.update(state => ({ ...state, searchQuery: '', currentPage: 0 }));
    this.loadUsers();
  }

  /**
   * Va a la página anterior con transición suave - patrón dashboard
   */
  previousPage(): void {
    if (!this.hasPreviousPage() || this._state().isLoadingPage) {
      return;
    }

    const newPage = this._state().currentPage - 1;
    this._state.update(state => ({
      ...state,
      isTransitioning: true,
      isLoadingPage: true,
      currentPage: newPage
    }));

    this.loadUsersWithTransition(newPage);
  }

  /**
   * Va a la página siguiente con transición suave - patrón dashboard
   */
  nextPage(): void {
    if (!this.hasNextPage() || this._state().isLoadingPage) {
      return;
    }

    const newPage = this._state().currentPage + 1;
    this._state.update(state => ({
      ...state,
      isTransitioning: true,
      isLoadingPage: true,
      currentPage: newPage
    }));

    this.loadUsersWithTransition(newPage);
  }

  /**
   * Va a una página específica con transición suave - patrón dashboard
   */
  goToPage(page: number): void {
    const state = this._state();
    if (page < 0 || page >= state.totalPages || page === state.currentPage || state.isLoadingPage) {
      return;
    }

    this._state.update(state => ({
      ...state,
      isTransitioning: true,
      isLoadingPage: true,
      currentPage: page
    }));

    this.loadUsersWithTransition(page);
  }



  /**
   * Abre el modal de creación de usuario
   */
  openCreateModal(): void {
    this._modalState.update(state => ({ ...state, showCreate: true }));
  }

  /**
   * Cierra el modal de creación de usuario
   */
  closeCreateModal(): void {
    this._modalState.update(state => ({ ...state, showCreate: false }));
  }

  /**
   * Abre el modal de edición de usuario
   */
  openEditModal(user: User): void {
    this._modalState.update(state => ({ ...state, editingUser: user, showEdit: true }));
  }

  /**
   * Cierra el modal de edición de usuario
   */
  closeEditModal(): void {
    this._modalState.update(state => ({ ...state, showEdit: false, editingUser: null }));
  }

  /**
   * Abre el modal de confirmación
   */
  openConfirmModal(data: ConfirmModalData): void {
    this._modalState.update(state => ({ ...state, confirmData: data, showConfirm: true }));
  }

  /**
   * Cierra el modal de confirmación
   */
  closeConfirmModal(): void {
    this._modalState.update(state => ({ ...state, showConfirm: false, confirmData: null }));
  }

  /**
   * Maneja la creación de un nuevo usuario
   */
  onCreateUser(userData: CreateUserData): void {
    this._modalState.update(state => ({ ...state, loading: true }));

    const adminUserData: UserRegisterRequest = {
      username: userData.username,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      privacyType: PrivacyType.PRIVATE
    };

    this.userService.createAdminUser(adminUserData).subscribe({
      next: () => {
        // Cerrar modal y resetear loading al mismo tiempo para evitar flash visual
        this._modalState.update(state => ({ ...state, showCreate: false, loading: false }));
        this.loadUsers();
        this.refreshAdminCount();
      },
      error: (error: HttpErrorResponse) => {
        this._modalState.update(state => ({ ...state, loading: false }));
        const errorMessage = this.errorHandler.getUserErrorMessage(error);
        this._state.update(state => ({ ...state, error: errorMessage }));
      }
    });
  }

  /**
   * Maneja la actualización de un usuario
   */
  onUpdateUser(userData: EditUserData): void {
    this._modalState.update(state => ({ ...state, loading: true }));

    const updateRequest: AdminUserUpdateRequest = {
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone || undefined,
      profilePicture: userData.profilePicture || undefined,
      address: userData.address || undefined,
      biography: userData.biography || undefined,
      privacyType: userData.privacyType as PrivacyType,
      roleName: userData.role
    };

    this.userService.updateUserAsAdmin(userData.id, updateRequest).subscribe({
      next: (updatedUser) => {
        this.closeEditModal();
        this._modalState.update(state => ({ ...state, loading: false }));

        // Actualizar el usuario en memoria manteniendo su posición en la lista
        const updatedUsers = this._state().users.map(u => u.id === userData.id ? updatedUser : u);

        this._state.update(state => ({
          ...state,
          users: updatedUsers
        }));

        // Si el usuario actualizado es el mismo que la sesión actual,
        // sincronizar AuthService (el token ya se actualizó automáticamente en UserService)
        const current = this.authService.getCurrentUser();
        if (current && current.id === userData.id) {
          this.authService.updateCurrentUser(updatedUser);
        }

        // Refrescar conteo de admins por si cambió el rol
        this.refreshAdminCount();
      },
      error: (error: HttpErrorResponse) => {
        this._modalState.update(state => ({ ...state, loading: false }));
        const errorMessage = this.errorHandler.getUserErrorMessage(error);
        this._state.update(state => ({ ...state, error: errorMessage }));
      }
    });
  }

  /**
   * Maneja la activación de un usuario
   */
  onUserActivated(userId: number): void {
    this._modalState.update(state => ({ ...state, loading: true }));

    this.userService.activateUser(userId).subscribe({
      next: () => {
        this._modalState.update(state => ({ ...state, loading: false }));

        // Actualizar el usuario activado en memoria para mantener su posición
        const updatedUsers = this._state().users.map(u => u.id === userId ? { ...u, active: true } : u);

        this._state.update(state => ({
          ...state,
          users: updatedUsers
        }));

        this.refreshAdminCount();
      },
      error: (error) => {
        this._modalState.update(state => ({ ...state, loading: false }));
        const errorMessage = this.errorHandler.getUserErrorMessage(error);
        this._state.update(state => ({ ...state, error: errorMessage }));
      }
    });
  }

  /**
   * Maneja la desactivación de un usuario
   */
  onUserDeactivated(userId: number): void {
    this._modalState.update(state => ({ ...state, loading: true }));

    this.userService.deactivateUser(userId).subscribe({
      next: () => {
        this._modalState.update(state => ({ ...state, loading: false }));

        // Actualizar el usuario desactivado en memoria para mantener su posición en la lista
        const updatedUsers = this._state().users.map(u => u.id === userId ? { ...u, active: false } : u);

        this._state.update(state => ({
          ...state,
          users: updatedUsers
        }));

        this.refreshAdminCount();
      },
      error: (error) => {
        this._modalState.update(state => ({ ...state, loading: false }));
        const errorMessage = this.errorHandler.getUserErrorMessage(error);
        this._state.update(state => ({ ...state, error: errorMessage }));
      }
    });
  }

  /**
   * Maneja la solicitud de eliminación (abre modal de confirmación)
   */
  onUserDeleted(userId: number): void {
    const user = this._state().users.find(u => u.id === userId);
    if (!user) return;

    const confirmData: ConfirmModalData = {
      title: 'Confirmar Eliminación',
      message: `¿Estás seguro de que deseas eliminar al usuario "${user.firstName} ${user.lastName}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar Usuario',
      cancelText: 'Cancelar',
      type: 'danger',
      userId: userId
    };

    this.openConfirmModal(confirmData);
  }

  /**
   * Ejecuta la eliminación del usuario (llamado desde confirmación)
   */
  private executeUserDeletion(userId: number): void {
    this._modalState.update(state => ({ ...state, loading: true }));

    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this._modalState.update(state => ({ ...state, loading: false }));
        this.loadUsers();
        // la recarga será iniciada por loadUsers(), pero la llamamos de nuevo por precaución
        this.refreshAdminCount();
      },
      error: (error) => {
        this._modalState.update(state => ({ ...state, loading: false }));
        const errorMessage = this.errorHandler.getUserErrorMessage(error);
        this._state.update(state => ({ ...state, error: errorMessage }));
      }
    });
  }

  /**
   * Maneja la edición de un usuario
   */
  onUserEdited(user: User): void {
    this.openEditModal(user);
  }

  /**
   * Ejecuta la acción confirmada
   */
  onConfirmAction(): void {
    const data = this._modalState().confirmData;
    if (!data || !data.userId) return;

    switch (data.type) {
      case 'danger':
        this.executeUserDeletion(data.userId);
        break;
      case 'info':
        this.onUserActivated(data.userId);
        break;
      case 'warning':
        this.onUserDeactivated(data.userId);
        break;
    }

    this.closeConfirmModal();
  }

  // MÉTODOS PRIVADOS
  /**
   * Limpia el mensaje de éxito después de un delay
   */
  private clearSuccessMessage(): void {
    setTimeout(() => this._state.update(state => ({ ...state, success: null })), 5000);
  }

  /**
   * Guarda el orden de IDs de usuarios para una página en localStorage
   */
  private saveUsersOrder(page: number, users: User[]): void {
    try {
      const key = `userManagement.order.page.${page}`;
      const ids = users.map(u => u.id);
      localStorage.setItem(key, JSON.stringify(ids));
    } catch (error) {
      // Silenciar fallos de localStorage
    }
  }

  /**
   * Aplica el orden guardado (si existe) a la lista de usuarios devuelta por el backend.
   * Mantiene usuarios nuevos al final.
   */
  private applySavedOrder(page: number, users: User[]): User[] {
    try {
      const key = `userManagement.order.page.${page}`;
      const raw = localStorage.getItem(key);


      if (!raw) {
        return users;
      }

      const ids: number[] = JSON.parse(raw);

      const map = new Map<number, User>();
      users.forEach(u => map.set(u.id, u));

      const ordered: User[] = [];
      ids.forEach(id => {
        const u = map.get(id);
        if (u) {
          ordered.push(u);
          map.delete(id);
        }
      });

      // Añadir usuarios que no estaban en el orden guardado (nuevos)
      map.forEach(u => ordered.push(u));

      return ordered;
    } catch (error) {
      return users;
    }
  }  /**
   * Refresca el conteo global de administradores activos desde el backend
   * y actualiza la señal interna.
   */
  private refreshAdminCount(): void {
    this.userService.getActiveAdminCount().subscribe({
      next: (count) => this._adminCount.set(count),
      error: () => this._adminCount.set(0)
    });
  }
}
