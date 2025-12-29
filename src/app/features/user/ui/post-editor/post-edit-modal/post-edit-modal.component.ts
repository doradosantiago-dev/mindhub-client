// MyPostEditModal component — modal para editar una publicación

import { Component, input, output, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PostResponse as Post, PrivacyType, PostCreateRequest } from '../../../models';
import { PostService } from '../../../data-access/post.service';

// INTERFACES Y TIPOS

/**
 * Opción de privacidad para el selector
 */
interface PrivacyOption {
  /** Valor del tipo de privacidad */
  value: PrivacyType;
  /** Etiqueta legible para el usuario */
  label: string;
}

// COMPONENTE PRINCIPAL

@Component({
  selector: 'app-my-post-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './post-edit-modal.component.html',
  styleUrls: ['./post-edit-modal.component.css']
})
export class MyPostEditModalComponent implements OnInit {
  // INYECCIONES DE DEPENDENCIAS

  private readonly fb = inject(FormBuilder);
  private readonly postService = inject(PostService);

  // INPUTS Y OUTPUTS

  /** Post a editar (puede venir por input o por MAT_DIALOG_DATA) */
  readonly post = input<Post | undefined>();

  /** Datos inyectados por el diálogo (fallback si no se pasa input) */
  private readonly dialogData = inject(MAT_DIALOG_DATA, { optional: true }) as { post?: Post } | null;

  /** Evento emitido cuando el post se actualiza exitosamente */
  readonly postUpdated = output<void>();

  /** Evento emitido cuando se cierra el modal */
  readonly modalClosed = output<void>();

  // SIGNALS PRIVADOS PARA ESTADO INTERNO

  /** Signal para controlar el estado de carga */
  private readonly _loading = signal<boolean>(false);

  /** Signal para controlar la visibilidad del modal */
  private readonly _showModal = signal<boolean>(true);

  // SIGNALS PÚBLICOS (READONLY)

  /** Estado de carga del formulario */
  readonly loading = this._loading.asReadonly();

  /** Estado de visibilidad del modal */
  readonly showModal = this._showModal.asReadonly();

  // VALORES COMPUTADOS

  /** Indica si el formulario es válido y no está cargando */
  readonly isFormValid = computed(() =>
    this.editForm?.valid && !this.loading()
  );

  /** Opciones de privacidad disponibles */
  readonly privacyOptions = computed((): PrivacyOption[] => [
    { value: PrivacyType.PUBLIC, label: 'Público' },
    { value: PrivacyType.PRIVATE, label: 'Privado' }
  ]);

  // PROPIEDADES DEL FORMULARIO

  /** Formulario reactivo para editar el post */
  editForm!: FormGroup;

  // LIFECYCLE HOOKS

  ngOnInit(): void {
    this.initForm();
  }

  // MÉTODOS PÚBLICOS

  /**
   * Guarda los cambios del post editado
   * Valida el formulario y envía la actualización al servicio
   */
  onSave(): void {
    if (this.editForm?.valid) {
      this._loading.set(true);

      const updateData: PostCreateRequest = {
        content: this.contentControl?.value,
        imageUrl: this.imageControl?.value || undefined,
        privacyType: this.privacyControl?.value
      };

      const currentPost = this.post?.() ?? this.dialogData?.post;
      const postId = currentPost?.id;

      if (!postId) {
        this._loading.set(false);
        return;
      }

      this.postService.update(postId, updateData).subscribe({
        next: () => {
          this._loading.set(false);
          this.postUpdated.emit();
        },
        error: (error) => {
          this._loading.set(false);
        }
      });
    }
  }

  /**
   * Cierra el modal y emite evento de cierre
   */
  onCancel(): void {
    this.modalClosed.emit();
  }

  /**
   * Maneja el clic en el backdrop del modal
   * @param event - Evento del clic
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  // MÉTODOS PRIVADOS

  /**
   * Inicializa el formulario reactivo con los valores del post
   */
  private initForm(): void {
    const p = this.post?.() ?? this.dialogData?.post;

    this.editForm = this.fb.group({
      content: [
        p?.content ?? '',
        [Validators.required]
      ],
      imageUrl: [
        p?.imageUrl ?? '',
        [Validators.pattern('https?://.+')]
      ],
      privacyType: [
        p?.privacyType ?? PrivacyType.PUBLIC,
        Validators.required
      ]
    });
  }

  // GETTERS DEL FORMULARIO

  /** Control del campo contenido */
  get contentControl() {
    return this.editForm?.get('content');
  }

  /** Control del campo URL de imagen */
  get imageControl() {
    return this.editForm?.get('imageUrl');
  }

  /** Control del campo tipo de privacidad */
  get privacyControl() {
    return this.editForm?.get('privacyType');
  }
}
