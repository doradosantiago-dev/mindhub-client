/** Header: navegación, búsqueda, notificaciones y chatbot. */

import { Component, computed, effect, inject, Injector, OnDestroy, OnInit, signal, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, interval, Subject, switchMap, takeUntil } from 'rxjs';
import { AuthService, ChatBotService, NotificationService, UserService } from '@core/services';
import { NotificationResponse, User } from '@core/models';
import { UserSearchResultsComponent } from '@features/user-search-results';
import { ChatbotComponent } from '@features/chatbot';
import { NotificationsComponent } from '@features/notifications';
import { SearchUser } from '@core/models';

/* Interfaces y tipos */
/** Estado de notificaciones */
interface NotificationState {
  unreadCount: number;
  notifications: NotificationResponse[];
}

/* Constantes de configuración */
/** Tiempo de debounce (ms) */
const SEARCH_DEBOUNCE_TIME = 300;

/** Longitud mínima para búsqueda */
const MIN_SEARCH_LENGTH = 2;

/** Máx. resultados de búsqueda */
const MAX_SEARCH_RESULTS = 5;

/** Intervalo de actualización de notificaciones (ms) */
const NOTIFICATION_UPDATE_INTERVAL = 30000;

/** Retraso para ocultar resultados de búsqueda (ms) */
const SEARCH_BLUR_DELAY = 150;

/** Componente Header: navegación, búsqueda, notificaciones y chatbot. */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    ChatbotComponent,
    UserSearchResultsComponent,
    NotificationsComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  /* Inyección de dependencias */
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly chatbotService = inject(ChatBotService);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);

  /* Subjects y streams RxJS */
  /** Subject para destrucción limpia de suscripciones */
  private readonly destroy$ = new Subject<void>();

  /** Subject para manejo de búsqueda con debounce */
  private readonly searchSubject = new Subject<string>();

  /* Signals privados */

  /** Signal para la consulta de búsqueda actual */
  private readonly _searchQuery = signal<string>('');

  /** Signal para los resultados de búsqueda */
  private readonly _searchResults = signal<User[]>([]);

  /** Signal para el estado de búsqueda */
  private readonly _isSearching = signal<boolean>(false);

  /** Signal para mostrar/ocultar resultados */
  private readonly _showResults = signal<boolean>(false);

  /** Signal para el contador de notificaciones no leídas */
  private readonly _notificationCount = signal<number>(0);

  /** Signal para mostrar/ocultar panel de notificaciones */
  private readonly _showNotifications = signal<boolean>(false);

  /* Signals públicos (readonly) */

  /** Consulta de búsqueda actual (readonly) */
  readonly searchQuery = this._searchQuery.asReadonly();

  /** Resultados de búsqueda (readonly) */
  readonly searchResults = this._searchResults.asReadonly();

  /** Estado de búsqueda (readonly) */
  readonly isSearching = this._isSearching.asReadonly();

  /** Visibilidad de resultados (readonly) */
  readonly showResults = this._showResults.asReadonly();

  /** Contador de notificaciones (readonly) */
  readonly notificationCount = this._notificationCount.asReadonly();

  /** Visibilidad del panel de notificaciones (readonly) */
  readonly showNotifications = this._showNotifications.asReadonly();

  /** Estado del chatbot (readonly) */
  readonly isChatbotOpen = this.chatbotService.isOpen;

  /* Valores computados */

  /** Indica si el usuario actual es administrador */
  readonly isAdmin = computed(() => this.authService.isAdmin());

  /** Indica si el usuario está autenticado */
  readonly isAuthenticated = computed(() => this.authService.checkAuthenticationStatus());

  /** Indica si se debe mostrar la búsqueda (no admin) */
  readonly showSearch = computed(() => !this.isAdmin());

  /** Indica si hay resultados de búsqueda */
  readonly hasSearchResults = computed(() => this._searchResults().length > 0);

  /** Indica si se pueden mostrar los resultados */
  readonly canShowResults = computed(() =>
    this._showResults() && this._searchQuery().trim().length >= MIN_SEARCH_LENGTH
  );

  /* Métodos públicos */

  /**
   * Navega al dashboard principal de la aplicación.
   */
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Maneja los cambios en el campo de búsqueda.
   * Implementa debounce automático para optimizar rendimiento.
   * 
   * @param event - Evento de cambio del input
   */
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value.trim();

    this._searchQuery.set(query);

    if (!query) {
      this.clearSearchResults();
    } else {
      this.searchSubject.next(query);
    }
  }

  /**
   * Maneja el foco en el campo de búsqueda.
   * Muestra resultados si hay una consulta válida y resultados disponibles.
   */
  onSearchFocus(): void {
    const query = this._searchQuery();
    if (query.length >= MIN_SEARCH_LENGTH && this._searchResults().length > 0) {
      this._showResults.set(true);
    }
  }

  /**
   * Maneja la pérdida de foco en el campo de búsqueda.
   * Oculta resultados con un retraso para permitir clics en resultados.
   */
  onSearchBlur(): void {
    setTimeout(() => {
      this._showResults.set(false);
    }, SEARCH_BLUR_DELAY);
  }

  /**
   * Maneja la selección de un usuario en los resultados de búsqueda.
   * Navega al perfil del usuario y limpia la búsqueda.
   * 
   * @param user - Usuario seleccionado
   */
  onUserSelected(user: SearchUser): void {
    this.router.navigate(['/dashboard/user', user.id]);
    this.clearSearchResults();
  }

  /**
   * Ejecuta la búsqueda manual.
   * Útil para búsquedas por teclado (Enter).
   */
  performSearch(): void {
    const query = this._searchQuery();
    if (query.trim()) {
      this.searchSubject.next(query);
    } else {
      this.clearSearchResults();
    }
  }

  /**
   * Abre o cierra el chatbot.
   * Alterna el estado del servicio de chatbot.
   */
  openChatbot(): void {
    this.chatbotService.toggleChatbot();
  }

  /**
   * Alterna la visibilidad del panel de notificaciones.
   * Carga el contador si se está abriendo.
   */
  toggleNotifications(): void {
    if (!this._showNotifications()) {
      this.loadNotificationCount();
    }
    this._showNotifications.update(show => !show);
  }

  /**
   * Cierra el panel de notificaciones.
   * Recarga el contador para mantener sincronización.
   */
  closeNotifications(): void {
    this._showNotifications.set(false);
    this.loadNotificationCount();
  }

  /**
   * Marca todas las notificaciones como leídas.
   * Actualiza el contador después de la operación.
   */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.loadNotificationCount(),
      error: (error) => {
      }
    });
  }

  /* Métodos privados */

  /**
   * Configura la búsqueda con debounce y manejo de resultados.
   * Implementa optimización de rendimiento y manejo de errores.
   */
  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(SEARCH_DEBOUNCE_TIME),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.trim().length < MIN_SEARCH_LENGTH) {
          this.clearSearchResults();
          return [];
        }

        this._isSearching.set(true);
        this._showResults.set(true);

        return this.userService.searchUsers({
          query,
          page: 0,
          size: MAX_SEARCH_RESULTS
        });
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this._searchResults.set(response.content || []);
        this._isSearching.set(false);

        if (!response.content || response.content.length === 0) {
          this._showResults.set(false);
        }
      },
      error: (error) => {
        this._isSearching.set(false);
        this.clearSearchResults();
      }
    });
  }

  /**
   * Configura el sistema de notificaciones.
   * Inicia el contador y configura actualizaciones periódicas.
   */
  private setupNotifications(): void {
    this.loadNotificationCount();

    interval(NOTIFICATION_UPDATE_INTERVAL).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadNotificationCount();
    });
  }

  /**
   * Carga el contador de notificaciones no leídas.
   * Implementa fallback en caso de error del endpoint principal.
   */
  private loadNotificationCount(): void {
    if (this.authService.checkAuthenticationStatus()) {
      this.notificationService.getUnreadCount().pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (response) => {
          this._notificationCount.set(response.count);
        },
        error: (error) => {
          this.loadNotificationCountFallback();
        }
      });
    } else {
      this._notificationCount.set(0);
    }
  }

  /**
   * Método fallback para cargar notificaciones.
   * Se ejecuta si el endpoint principal falla.
   */
  private loadNotificationCountFallback(): void {
    this.notificationService.getMyNotifications({ page: 0, size: 50 }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        const unreadCount = response.content.filter(n => !n.read).length;
        this._notificationCount.set(unreadCount);
      },
      error: (error) => {
        this._notificationCount.set(0);
      }
    });
  }

  /**
   * Configura el listener para cambios en el estado de notificaciones.
   * Mantiene sincronizado el contador con el servicio usando signals.
   */
  private setupNotificationListener(): void {
    // Usar runInInjectionContext para poder usar effect() dentro de ngOnInit
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const state = this.notificationService.notificationState();
        this._notificationCount.set(state.unreadCount);
      });
    });
  }

  /**
   * Limpia los resultados de búsqueda y oculta el panel.
   * Resetea el estado de búsqueda a valores iniciales.
   */
  private clearSearchResults(): void {
    this._searchResults.set([]);
    this._showResults.set(false);
  }

  /* Lifecycle hooks */

  /**
   * Inicializa el componente.
   * Configura búsqueda, notificaciones y listeners.
   */
  ngOnInit(): void {
    this.setupSearch();
    this.setupNotifications();
    this.setupNotificationListener();
  }

  /**
   * Limpia recursos al destruir el componente.
   * Cancela suscripciones y streams activos.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
