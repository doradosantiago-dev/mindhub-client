/** User Search Results: lista de usuarios, estados y selección. */

import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { User } from '../../../../../features/user/models';

/** Componente standalone: visualización y selección de usuarios. */
@Component({
  selector: 'app-user-search-results',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.css']
})
export class UserSearchResultsComponent {
  // INPUTS REQUERIDOS

  /** Lista de usuarios encontrados en la búsqueda */
  readonly searchResults = input.required<User[]>();

  /** Indica si se está realizando una búsqueda */
  readonly isSearching = input.required<boolean>();

  /** Consulta de búsqueda actual */
  readonly searchQuery = input.required<string>();

  /** Controla la visibilidad del componente de resultados */
  readonly showResults = input.required<boolean>();

  // OUTPUTS

  /** Evento emitido cuando se selecciona un usuario */
  readonly userSelected = output<User>();

  // VALORES COMPUTADOS

  /** Computa si hay resultados de búsqueda disponibles */
  readonly hasResults = computed(() => this.searchResults().length > 0);

  /** Computa si se debe mostrar el estado de "sin resultados" */
  readonly shouldShowNoResults = computed(() =>
    this.searchQuery().length >= 2 && !this.hasResults() && !this.isSearching()
  );

  /** Computa si se debe mostrar el estado vacío */
  readonly shouldShowEmptyState = computed(() =>
    !this.isSearching() && !this.hasResults() && this.searchQuery().length < 2
  );

  // MÉTODOS PÚBLICOS

  /**
   * Selecciona un usuario y emite el evento correspondiente.
   * 
   * @param user - Usuario seleccionado para la acción
   * 
   */
  selectUser(user: User): void {
    this.userSelected.emit(user);
  }

  /**
   * Maneja errores de carga de imagen de perfil.
   * Establece una imagen por defecto cuando falla la carga
   * de la imagen del usuario.
   * 
   * @param event - Evento de error de la imagen HTML
   * 
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/default-avatar.png';
  }
}
