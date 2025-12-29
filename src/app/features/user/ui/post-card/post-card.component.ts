// MyPostCard component — tarjeta para mostrar y gestionar una publicación

import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PostResponse as Post } from '@core/models';
import { DateFormatPipe } from '@shared/pipes/date-format.pipe';
import { ChangeDetectionStrategy } from '@angular/core';

// COMPONENTE PRINCIPAL

@Component({
  selector: 'app-my-post-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    DateFormatPipe
  ],
  templateUrl: './my-post-card.component.html',
  styleUrls: ['./my-post-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyPostCardComponent {
  // INPUTS Y OUTPUTS

  /** Post a mostrar en la tarjeta */
  readonly post = input.required<Post>();

  /** Evento emitido cuando se solicita editar el post */
  readonly editPost = output<Post>();

  /** Evento emitido cuando se solicita eliminar el post */
  readonly deletePost = output<Post>();

  // SIGNALS PRIVADOS PARA ESTADO INTERNO

  /** Signal para controlar la expansión del texto */
  private readonly _isTextExpanded = signal<boolean>(false);

  // SIGNALS PÚBLICOS (READONLY)

  /** Estado público de expansión del texto (solo lectura) */
  readonly isTextExpanded = this._isTextExpanded.asReadonly();

  // VALORES COMPUTADOS

  /**
   * Fecha de creación del post
   * Usar en template con DateFormatPipe: {{ postDate() | dateFormat:'long' }}
   */
  readonly postDate = computed(() => this.post().creationDate);

  /**
   * Contenido del post con truncamiento inteligente
   * @returns Contenido completo o truncado según el estado de expansión
   */
  readonly displayContent = computed(() => {
    const content = this.post().content;
    const maxLength = 200;

    if (this.isTextExpanded()) {
      return content;
    }

    return content.length > maxLength
      ? `${content.substring(0, maxLength)}...`
      : content;
  });

  /**
   * Indica si se debe mostrar el botón "Leer más"
   * @returns true si el contenido excede la longitud máxima
   */
  readonly showReadMore = computed(() =>
    this.post().content.length > 200
  );

  /**
   * Indica si el post tiene imagen
   * @returns true si el post tiene URL de imagen
   */
  readonly hasImage = computed(() =>
    Boolean(this.post().imageUrl)
  );

  /**
   * Indica si el post es privado
   * @returns true si el tipo de privacidad es PRIVATE
   */
  readonly isPrivate = computed(() =>
    this.post().privacyType === 'PRIVATE'
  );

  /**
   * Indica si el contenido está expandido
   * @returns true si el texto está completamente visible
   */
  readonly isContentExpanded = computed(() =>
    this.isTextExpanded()
  );

  /**
   * Longitud del contenido del post
   * @returns Número de caracteres del contenido
   */
  readonly contentLength = computed(() =>
    this.post().content.length
  );

  /**
   * Indica si el contenido necesita truncamiento
   * @returns true si el contenido es más largo que el límite
   */
  readonly needsTruncation = computed(() =>
    this.contentLength() > 200
  );

  // MÉTODOS PÚBLICOS

  /**
   * Emite evento para editar el post
   * @emits editPost - Evento con el post a editar
   */
  onEditPost(): void {
    this.editPost.emit(this.post());
  }

  /**
   * Emite evento para eliminar el post
   * @emits deletePost - Evento con el post a eliminar
   */
  onDeletePost(): void {
    this.deletePost.emit(this.post());
  }

  /**
   * Alterna el estado de expansión del texto
   * Cambia entre mostrar el contenido completo o truncado
   */
  toggleTextExpansion(): void {
    this._isTextExpanded.set(!this.isTextExpanded());
  }

  // MÉTODOS PRIVADOS

  /**
   * Obtiene el texto del botón de expansión
   * @returns Texto apropiado según el estado actual
   */
  protected getExpansionButtonText(): string {
    return this.isTextExpanded() ? 'Ver menos' : 'Leer más';
  }

  /**
   * Obtiene el aria-label para el botón de expansión
   * @returns Descripción accesible del botón
   */
  protected getExpansionButtonAriaLabel(): string {
    return this.isTextExpanded()
      ? 'Contraer texto del post'
      : 'Expandir texto del post';
  }

  /**
   * Obtiene el aria-label para el botón de editar
   * @returns Descripción accesible del botón de editar
   */
  protected getEditButtonAriaLabel(): string {
    const author = this.post().author.firstName || 'Usuario';
    return `Editar post de ${author}`;
  }

  /**
   * Obtiene el aria-label para el botón de eliminar
   * @returns Descripción accesible del botón de eliminar
   */
  protected getDeleteButtonAriaLabel(): string {
    const author = this.post().author.firstName || 'Usuario';
    return `Eliminar post de ${author}`;
  }
}
