// Followers component — gestión de seguidores y seguidos

import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FollowService } from '../../data-access/follow.service';
import { FollowResponse as Follow, UserWithFollow } from '../../models';
import { FooterComponent } from '@shared/components';
import { Router } from '@angular/router';

// INTERFACES Y TIPOS

/**
 * Opciones de las pestañas
 */
interface TabOption {
  /** Índice de la pestaña */
  index: number;
  /** Etiqueta de la pestaña */
  label: string;
  /** Icono de la pestaña */
  icon: string;
  /** Descripción de la pestaña */
  description: string;
}

// COMPONENTE PRINCIPAL

@Component({
  selector: 'app-followers',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FooterComponent
  ],
  templateUrl: './followers.component.html',
  styleUrls: ['./followers.component.css']
})
export class FollowersComponent implements OnInit {

  // INYECCIONES DE DEPENDENCIAS

  private readonly followService = inject(FollowService);
  private readonly router = inject(Router);

  // SIGNALS PRIVADOS PARA ESTADO INTERNO

  /** Estado consolidado del componente */
  private readonly _state = signal<{
    following: Follow[];
    followers: Follow[];
    loadingFollowing: boolean;
    loadingFollowers: boolean;
    error: string | null;
    selectedTab: number;
  }>({
    following: [],
    followers: [],
    loadingFollowing: false,
    loadingFollowers: false,
    error: null,
    selectedTab: 0
  });

  // SIGNALS PÚBLICOS (READONLY)

  /** Lista de usuarios seguidos (solo lectura) */
  readonly following = computed(() => this._state().following);

  /** Lista de seguidores (solo lectura) */
  readonly followers = computed(() => this._state().followers);

  /** Estado de carga para usuarios seguidos (solo lectura) */
  readonly loadingFollowing = computed(() => this._state().loadingFollowing);

  /** Estado de carga para seguidores (solo lectura) */
  readonly loadingFollowers = computed(() => this._state().loadingFollowers);

  /** Mensaje de error (solo lectura) */
  readonly error = computed(() => this._state().error);

  /** Pestaña seleccionada (solo lectura) */
  readonly selectedTab = computed(() => this._state().selectedTab);

  // VALORES COMPUTADOS

  /** Estado general de carga */
  readonly isLoading = computed(() =>
    this.loadingFollowing() || this.loadingFollowers()
  );

  /** Indica si hay usuarios seguidos */
  readonly hasFollowing = computed(() =>
    this.following().length > 0
  );

  /** Indica si hay seguidores */
  readonly hasFollowers = computed(() =>
    this.followers().length > 0
  );

  /** Opciones de las pestañas */
  readonly tabOptions = computed<TabOption[]>(() => [
    {
      index: 0,
      label: 'Siguiendo',
      icon: 'people',
      description: 'Usuarios que sigues'
    },
    {
      index: 1,
      label: 'Seguidores',
      icon: 'favorite',
      description: 'Usuarios que te siguen'
    }
  ]);

  /** Pestaña activa actual */
  readonly activeTab = computed(() =>
    this.tabOptions().find(tab => tab.index === this.selectedTab())
  );

  // LIFECYCLE HOOKS

  ngOnInit(): void {
    this.loadFollowing();
    this.loadFollowers();
  }

  // MÉTODOS PÚBLICOS

  /**
   * Carga la lista de usuarios seguidos
   */
  loadFollowing(): void {
    this._state.update(s => ({ ...s, loadingFollowing: true, error: null }));

    this.followService.getMyFollowing().subscribe({
      next: (response) => {
        this._state.update(s => ({ ...s, following: response.content, loadingFollowing: false }));
      },
      error: () => {
        this._state.update(s => ({ ...s, error: 'Error al cargar usuarios seguidos', loadingFollowing: false }));
      }
    });
  }

  /**
   * Carga la lista de seguidores
   */
  loadFollowers(): void {
    this._state.update(s => ({ ...s, loadingFollowers: true, error: null }));

    this.followService.getMyFollowers().subscribe({
      next: (response) => {
        this._state.update(s => ({ ...s, followers: response.content, loadingFollowers: false }));
      },
      error: () => {
        this._state.update(s => ({ ...s, error: 'Error al cargar seguidores', loadingFollowers: false }));
      }
    });
  }

  /**
   * Maneja el cambio de pestaña
   */
  onTabChange(index: number): void {
    this._state.update(s => ({ ...s, selectedTab: index }));
  }

  /**
   * Deja de seguir a un usuario
   */
  unfollowUser(followedId: number): void {
    this.followService.unfollowUser(followedId).subscribe({
      next: () => {
        this._state.update(s => ({
          ...s,
          following: s.following.filter(follow => follow.followedId !== followedId)
        }));
      },
      error: () => {
        this._state.update(s => ({ ...s, error: 'Error al dejar de seguir usuario' }));
      }
    });
  }

  // MÉTODOS PRIVADOS

  /**
   * Obtiene el nombre de visualización del usuario
   */
  getUserDisplayName(follow: Follow): string {
    return follow.followedName;
  }

  /**
   * Maneja errores de carga de imagen
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/default-avatar.png';
  }

  /**
   * Navega al perfil de usuario (ruta /dashboard/user/:id)
   */
  openProfile(userId: number | string | undefined): void {
    if (!userId) return;
    this.router.navigate(['/dashboard/user', userId]);
  }
}
