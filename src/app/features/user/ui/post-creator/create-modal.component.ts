// CreatePostModal component — modal para crear publicaciones

import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { PostService, ErrorHandlerService } from '@core/services';
import { PrivacyType } from '@core/models';

// INTERFACES
interface CreatePostData {
  content: string;
  imageUrl?: string | undefined;
  privacyType: PrivacyType;
}

interface PrivacyOption {
  value: PrivacyType;
  label: string;
  icon: string;
  description: string;
}

// CONSTANTES
const CONTENT_MAX_LENGTH = 1000;
const CONTENT_MIN_LENGTH = 1;

@Component({
  selector: 'app-create-post-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-post-modal.component.html',
  styleUrls: ['./create-post-modal.component.css']
})
export class CreatePostModalComponent implements OnDestroy {
  // INYECCIÓN DE SERVICIOS
  private readonly dialogRef = inject(MatDialogRef<CreatePostModalComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly postService = inject(PostService);
  private readonly errorHandler = inject(ErrorHandlerService);

  // DESTROY SUBJECT
  private readonly destroy$ = new Subject<void>();

  // SIGNALS PRIVADOS
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // SIGNALS PÚBLICOS (READONLY)
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // FORMULARIO
  readonly postForm: FormGroup = this.fb.group({
    content: ['', [
      Validators.required,
      Validators.maxLength(CONTENT_MAX_LENGTH)
    ]],
    imageUrl: [''],
    privacyType: [PrivacyType.PUBLIC, [Validators.required]]
  });

  // OPCIONES DE PRIVACIDAD
  readonly privacyOptions: PrivacyOption[] = [
    {
      value: PrivacyType.PUBLIC,
      label: 'Público',
      icon: 'public',
      description: 'Visible para todos los usuarios'
    },
    {
      value: PrivacyType.PRIVATE,
      label: 'Privado',
      icon: 'lock',
      description: 'Solo visible para ti'
    }
  ];

  // VALORES COMPUTADOS
  readonly contentLength = computed(() => this.postForm.get('content')?.value?.length || 0);
  readonly remainingChars = computed(() => CONTENT_MAX_LENGTH - this.contentLength());
  readonly canSubmit = computed(() => this.postForm.valid && !this._loading());

  // GETTERS PARA ACCESO AL FORMULARIO
  get content(): AbstractControl | null {
    return this.postForm.get('content');
  }

  get imageUrl(): AbstractControl | null {
    return this.postForm.get('imageUrl');
  }

  get privacyType(): AbstractControl | null {
    return this.postForm.get('privacyType');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // MÉTODOS PÚBLICOS

  /**
   * Maneja el envío del formulario
   */
  onSubmit(): void {
    if (this.postForm.valid && !this._loading()) {
      this._error.set(null);
      this._loading.set(true);

      const postData: CreatePostData = {
        content: this.content?.value?.trim(),
        imageUrl: this.imageUrl?.value?.trim() || undefined,
        privacyType: this.privacyType?.value
      };

      this.postService.create(postData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (response) => {
          this._loading.set(false);
          this.dialogRef.close(response);
        },
        error: (error) => {
          this._loading.set(false);
          this._error.set(this.errorHandler.getPostErrorMessage(error));
        }
      });
    }
  }

  /**
   * Cancela la creación de la publicación
   */
  onCancel(): void {
    if (!this._loading()) {
      this.dialogRef.close();
    }
  }

  /**
   * Obtiene el icono de privacidad para el tipo actual
   */
  getPrivacyIcon(privacy: PrivacyType): string {
    const option = this.privacyOptions.find(opt => opt.value === privacy);
    if (option) {
      return option.icon;
    }
    // Fallback por defecto
    return privacy === PrivacyType.PRIVATE ? 'lock' : 'public';
  }

  /**
   * Obtiene la descripción de privacidad para el tipo actual
   */
  getPrivacyDescription(privacy: PrivacyType): string {
    const option = this.privacyOptions.find(opt => opt.value === privacy);
    return option?.description || '';
  }

  /**
   * Valida si el campo tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.postForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getFieldErrorMessage(fieldName: string): string {
    const field = this.postForm.get(fieldName);
    if (!field?.errors || !field?.touched) return '';

    const errors = field.errors;

    if (errors['required']) {
      return 'Este campo es requerido';
    }

    if (errors['minlength']) {
      return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    }

    if (errors['maxlength']) {
      return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    }

    return 'Campo inválido';
  }
}
