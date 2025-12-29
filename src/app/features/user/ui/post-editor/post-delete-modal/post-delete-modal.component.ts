// MyPostDeleteModal component — modal para confirmar eliminación de publicaciones

import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PostResponse as Post } from '@core/models';
import { PostService } from '@core/services';
import { DateFormatPipe } from '@shared/pipes/date-format.pipe';

// INTERFACES Y TIPOS

/**
 * Opciones de confirmación para la eliminación
 */
interface DeleteConfirmationOptions {
  /** Texto del botón de confirmación */
  confirmText: string;
  /** Texto del botón de cancelación */
  cancelText: string;
  /** Mensaje de confirmación */
  message: string;
  /** Clase CSS para el botón de confirmación */
  confirmClass: string;
}

// COMPONENTE PRINCIPAL

@Component({
  selector: 'app-my-post-delete-modal',
  standalone: true,
  imports: [CommonModule, DateFormatPipe, MatIconModule],
  templateUrl: './my-post-delete-modal.component.html',
  styleUrls: ['./my-post-delete-modal.component.css']
})
export class MyPostDeleteModalComponent {

  // INYECCIONES DE DEPENDENCIAS

  private readonly postService = inject(PostService);

  // INPUTS Y OUTPUTS

  /** Post a eliminar */
  readonly post = input.required<Post>();

  /** Evento emitido cuando se elimina el post */
  readonly postDeleted = output<void>();

  /** Evento emitido cuando se cierra el modal */
  readonly modalClosed = output<void>();

  // SIGNALS PRIVADOS PARA ESTADO INTERNO

  /** Estado de carga interno */
  private readonly _loading = signal<boolean>(false);

  // SIGNALS PÚBLICOS (READONLY)

  /** Estado de carga público */
  readonly loading = this._loading.asReadonly();

  // VALORES COMPUTADOS

  /** Fecha del post (usar con DateFormatPipe en template) */
  readonly postDate = computed(() => this.post().creationDate);

  /** Opciones de confirmación */
  readonly confirmationOptions = computed<DeleteConfirmationOptions>(() => ({
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    message: '¿Estás seguro de que quieres eliminar esta publicación? Esta acción no se puede deshacer.',
    confirmClass: 'btn-danger'
  }));

  /** Título del modal */
  readonly modalTitle = computed(() => 'Eliminar publicación');

  // MÉTODOS PÚBLICOS

  /**
   * Confirma la eliminación del post
   */
  onConfirmDelete(): void {
    this._loading.set(true);

    this.postService.delete(this.post().id).subscribe({
      next: () => {
        this._loading.set(false);
        this.postDeleted.emit();
      },
      error: (error) => {
        this._loading.set(false);
        // Aquí podrías mostrar un toast de error
      }
    });
  }

  /**
   * Cancela la eliminación y cierra el modal
   */
  onCancel(): void {
    this.modalClosed.emit();
  }

  /**
   * Maneja el clic en el backdrop del modal
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  // MÉTODOS PRIVADOS

  /**
   * Maneja errores de carga de imagen
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.parentElement?.classList.add('image-error');
  }

  /**
   * Maneja la carga exitosa de imagen
   */
  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.parentElement?.classList.add('image-loaded');
  }
}
