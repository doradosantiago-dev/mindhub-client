// ADMIN: User List — Componente (lista de usuarios)

import { Component, computed, input, output, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { User } from '@core/models';
import { DateFormatPipe } from '@shared/pipes';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, DateFormatPipe],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent {
  // Services
  private readonly router = inject(Router);

  // Inputs
  readonly users = input.required<User[]>();
  readonly loading = input.required<boolean>();
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly isLoadingPage = input<boolean>(false);
  readonly isTransitioning = input<boolean>(false);
  @Input() activeAdminCount: number = 0;
  @Input() currentUserId: number | null = null;

  // Outputs
  readonly userActivated = output<number>();
  readonly userDeactivated = output<number>();
  readonly userDeleted = output<number>();
  readonly userEdited = output<User>();

  // Computed values
  readonly hasUsers = computed(() => this.users().length > 0);

  // Math utility for template
  readonly Math = Math;

  // Methods
  activateUser(userId: number): void {
    this.userActivated.emit(userId);
  }

  deactivateUser(userId: number): void {
    this.userDeactivated.emit(userId);
  }

  deleteUser(userId: number): void {
    this.userDeleted.emit(userId);
  }

  editUser(user: User): void {
    this.userEdited.emit(user);
  }

  getUserDisplayName(user: User): string {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    return fullName || user.username;
  }

  getUserAvatar(user: User): string {
    return user.profilePicture || '/images/avatars/default-avatar.png';
  }

  getPrivacyLabel(privacyType: string): string {
    switch (privacyType) {
      case 'PUBLIC':
        return 'Público';
      case 'PRIVATE':
        return 'Privado';
      default:
        return 'Desconocido';
    }
  }

  getPrivacyIcon(privacyType: string): string {
    switch (privacyType) {
      case 'PUBLIC':
        return 'public';
      case 'PRIVATE':
        return 'lock';
      default:
        return 'help';
    }
  }

  // Métodos de validación
  canDeleteUser(user: User): boolean {
    // No se puede eliminar el último admin
    if (user.role.name === 'ADMIN') {
      // Use global count (may include admins on other pages)
      return this.activeAdminCount > 1;
    }
    return true;
  }

  // No se puede desactivar un admin
  canDeactivateUser(user: User): boolean {
    return user.role.name !== 'ADMIN';
  }

  getDeleteTooltip(user: User): string {
    if (user.role.name === 'ADMIN') {
      if (this.activeAdminCount <= 1) {
        return 'No se puede eliminar el último administrador del sistema';
      }
    }
    return 'Eliminar usuario';
  }

  getDeactivateTooltip(user: User): string {
    if (user.role.name === 'ADMIN') {
      return 'No se puede desactivar un administrador';
    }
    return 'Desactivar usuario';
  }

  /**
   * Verifica si el usuario es el admin actualmente logueado
   */
  isCurrentUser(user: User): boolean {
    return this.currentUserId !== null && user.id === this.currentUserId;
  }

  /**
   * Navega al perfil del usuario
   */
  viewProfile(): void {
    this.router.navigate(['/dashboard/profile']);
  }
}
