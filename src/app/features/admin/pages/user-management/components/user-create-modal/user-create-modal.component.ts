// USER CREATE MODAL: Componente para crear usuarios (TS)

import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * Interfaz para los datos de creación de usuario
 */
export interface CreateUserData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

@Component({
  selector: 'app-user-create-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './user-create-modal.component.html',
  styleUrls: ['./user-create-modal.component.css']
})
export class UserCreateModalComponent {
  private readonly fb = inject(FormBuilder);

  // Inputs
  readonly isOpen = input.required<boolean>();
  readonly loading = input<boolean>(false);

  // Outputs
  readonly created = output<CreateUserData>();
  readonly cancelled = output<void>();

  // Form
  readonly createForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  // Signal para observar cambios en el formulario
  private readonly formStatusSignal = toSignal(this.createForm.statusChanges, { initialValue: 'INVALID' });
  private readonly formValueSignal = toSignal(this.createForm.valueChanges, { initialValue: null });

  // COMPUTED SIGNALS PARA VALIDACIÓN
  readonly formValidation = computed(() => {
    this.formStatusSignal();
    this.formValueSignal();

    const formValid = this.createForm.valid;
    const passwordValue = this.createForm.get('password')?.value;
    const confirmPasswordValue = this.createForm.get('confirmPassword')?.value;
    const passwordsMatch = passwordValue === confirmPasswordValue;
    const confirmPasswordTouched = this.createForm.get('confirmPassword')?.touched;

    return {
      isValid: formValid && passwordsMatch,
      hasPasswordMismatch: !passwordsMatch && confirmPasswordTouched,
      isFormDirty: this.createForm.dirty
    };
  });

  // Computed signal directo para la validación del formulario
  readonly isFormValid = computed(() => {
    this.formStatusSignal();
    this.formValueSignal();

    const formValid = this.createForm.valid;
    const passwordValue = this.createForm.get('password')?.value;
    const confirmPasswordValue = this.createForm.get('confirmPassword')?.value;
    const passwordsMatch = passwordValue === confirmPasswordValue;

    return formValid && passwordsMatch;
  });

  readonly modalClass = computed(() => ({
    'modal-open': this.isOpen(),
    'modal-loading': this.loading()
  }));

  readonly isFormDirty = computed(() => {
    this.formValueSignal();
    return this.createForm.dirty;
  });

  // Métodos públicos
  onSubmit(): void {
    if (this.loading()) {
      return;
    }

    if (!this.createForm.valid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const formValue = this.createForm.value;

    // Verificar que las contraseñas coincidan
    if (formValue.password !== formValue.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    const userData: CreateUserData = {
      username: formValue.username!,
      email: formValue.email!,
      firstName: formValue.firstName!,
      lastName: formValue.lastName!,
      password: formValue.password!
    };

    this.created.emit(userData);
    this.resetForm();
  }

  onCancel(): void {
    if (!this.loading()) {
      this.resetForm();
      this.cancelled.emit();
    }
  }

  private resetForm(): void {
    this.createForm.reset();
    this.createForm.markAsUntouched();
    this.createForm.markAsPristine();
  }

  // GETTERS PARA ACCESO RÁPIDO A LOS CONTROLES DEL FORMULARIO
  get username() { return this.createForm.get('username'); }
  get email() { return this.createForm.get('email'); }
  get firstName() { return this.createForm.get('firstName'); }
  get lastName() { return this.createForm.get('lastName'); }
  get password() { return this.createForm.get('password'); }
  get confirmPassword() { return this.createForm.get('confirmPassword'); }
}
