// ADMIN: User Edit Modal — Componente (editar usuarios)

import { Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { User } from '../../../../../user/models';

// INTERFACES
export interface EditUserData {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profilePicture?: string;
  address?: string;
  biography?: string;
  privacyType: string;
  role: 'USER' | 'ADMIN';
}

@Component({
  selector: 'app-user-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './user-edit-modal.component.html',
  styleUrls: ['./user-edit-modal.component.css']
})
export class UserEditModalComponent {
  // INYECCIÓN DE SERVICIOS
  private readonly fb = inject(FormBuilder);

  // INPUTS
  readonly isOpen = input.required<boolean>();
  readonly user = input<User | null>(null);
  readonly loading = input<boolean>(false);

  // OUTPUTS
  readonly updated = output<EditUserData>();
  readonly cancelled = output<void>();

  // MODELOS PARA BINDING BIDIRECCIONAL
  readonly usernameModel = model<string>('');
  readonly emailModel = model<string>('');
  readonly firstNameModel = model<string>('');
  readonly lastNameModel = model<string>('');
  readonly phoneModel = model<string>('');
  readonly profilePictureModel = model<string>('');
  readonly addressModel = model<string>('');
  readonly biographyModel = model<string>('');
  readonly privacyTypeModel = model<string>('PRIVATE');
  readonly roleModel = model<'USER' | 'ADMIN'>('USER');

  // FORMULARIO REACTIVO
  readonly editForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]], // Admin puede modificar username
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    phone: [''],
    profilePicture: [''],
    address: [''],
    biography: [''],
    privacyType: ['PRIVATE'],
    role: ['USER', [Validators.required]]
  });

  // SIGNALS DE ESTADO
  private readonly _formErrors = signal<Record<string, string>>({});
  private readonly _isSubmitting = signal<boolean>(false);

  // VALORES COMPUTADOS
  readonly modalClass = computed(() => ({
    'modal-open': this.isOpen(),
    'modal-loading': this.loading(),
    'modal-submitting': this._isSubmitting()
  }));

  readonly isFormValid = computed(() => this.editForm.valid);
  readonly isFormDirty = computed(() => this.editForm.dirty);
  readonly hasUser = computed(() => this.user() !== null);
  readonly formErrors = this._formErrors.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();

  /**
   * Verifica si el usuario actual es administrador
   */
  readonly isCurrentUserAdmin = computed(() => {
    const currentUser = this.user();
    return currentUser?.role?.name === 'ADMIN';
  });

  // CONSTRUCTOR Y EFFECTS
  constructor() {
    // Effect para poblar el formulario cuando cambie el usuario
    effect(() => {
      const currentUser = this.user();
      if (currentUser && this.isOpen()) {
        this.populateForm(currentUser);
      }
    });

    // Effect para sincronizar modelos con el formulario
    effect(() => {
      this.syncModelsWithForm();
    });

    // Effect para establecer privacidad automáticamente cuando el rol es ADMIN
    effect(() => {
      const currentRole = this.roleModel();
      if (currentRole === 'ADMIN') {
        this.privacyTypeModel.set('PRIVATE');
        this.editForm.patchValue({ privacyType: 'PRIVATE' });
      }
    });
  }

  // MÉTODOS PÚBLICOS

  /**
   * Maneja el envío del formulario
   */
  onSubmit(): void {
    if (this.editForm.valid && !this.loading() && !this._isSubmitting() && this.user()) {
      this._isSubmitting.set(true);
      this._formErrors.set({});

      const formValue = this.editForm.value;
      const currentUser = this.user()!;

      const userData: EditUserData = {
        id: currentUser.id,
        username: formValue.username!,
        email: formValue.email!,
        firstName: formValue.firstName!,
        lastName: formValue.lastName!,
        phone: formValue.phone || undefined,
        profilePicture: formValue.profilePicture || undefined,
        address: formValue.address || undefined,
        biography: formValue.biography || undefined,
        privacyType: formValue.privacyType || 'PRIVATE',
        // Solo incluir el rol si el usuario actual NO es administrador
        role: currentUser.role?.name === 'ADMIN' ? currentUser.role.name : formValue.role as 'USER' | 'ADMIN'
      };

      this.updated.emit(userData);
      this._isSubmitting.set(false);
    }
  }

  /**
   * Maneja la cancelación del modal
   */
  onCancel(): void {
    if (!this.loading() && !this._isSubmitting()) {
      this.resetForm();
      this.cancelled.emit();
    }
  }

  /**
   * Valida un campo específico del formulario
   */
  validateField(fieldName: string): void {
    const control = this.editForm.get(fieldName);
    if (control && control.invalid && control.touched) {
      const errors = this.getFieldErrors(control, fieldName);
      this._formErrors.update(current => ({ ...current, [fieldName]: errors }));
    } else {
      this._formErrors.update(current => {
        const { [fieldName]: removed, ...rest } = current;
        return rest;
      });
    }
  }

  // MÉTODOS PRIVADOS

  /**
   * Pobla el formulario con los datos del usuario
   */
  private populateForm(user: User): void {
    this.editForm.patchValue({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      profilePicture: user.profilePicture || '',
      address: user.address || '',
      biography: user.biography || '',
      privacyType: user.privacyType || 'PRIVATE',
      role: user.role.name as 'USER' | 'ADMIN'
    });

    // Sincronizar modelos
    this.usernameModel.set(user.username);
    this.emailModel.set(user.email);
    this.firstNameModel.set(user.firstName);
    this.lastNameModel.set(user.lastName);
    this.phoneModel.set(user.phone || '');
    this.profilePictureModel.set(user.profilePicture || '');
    this.addressModel.set(user.address || '');
    this.biographyModel.set(user.biography || '');
    this.privacyTypeModel.set(user.privacyType || 'PRIVATE');
    this.roleModel.set(user.role.name as 'USER' | 'ADMIN');
  }

  /**
   * Sincroniza los modelos con el formulario
   */
  private syncModelsWithForm(): void {
    this.editForm.patchValue({
      username: this.usernameModel(),
      email: this.emailModel(),
      firstName: this.firstNameModel(),
      lastName: this.lastNameModel(),
      phone: this.phoneModel(),
      profilePicture: this.profilePictureModel(),
      address: this.addressModel(),
      biography: this.biographyModel(),
      privacyType: this.privacyTypeModel(),
      role: this.roleModel()
    });
  }

  /**
   * Resetea el formulario y los modelos
   */
  private resetForm(): void {
    this.editForm.reset();
    this._formErrors.set({});
    this._isSubmitting.set(false);

    // Resetear modelos
    this.usernameModel.set('');
    this.emailModel.set('');
    this.firstNameModel.set('');
    this.lastNameModel.set('');
    this.phoneModel.set('');
    this.profilePictureModel.set('');
    this.addressModel.set('');
    this.biographyModel.set('');
    this.privacyTypeModel.set('PRIVATE');
    this.roleModel.set('USER');
  }

  /**
   * Obtiene los errores de validación de un campo
   */
  private getFieldErrors(control: AbstractControl, fieldName: string): string {
    if (control.errors) {
      const errors = control.errors;

      if (errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      } else if (errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} debe tener al menos ${errors['minlength'].requiredLength} caracteres`;
      } else if (errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} no puede exceder ${errors['maxlength'].requiredLength} caracteres`;
      } else if (errors['email']) {
        return 'Ingresa un email válido';
      }
    }

    return 'Campo inválido';
  }

  /**
   * Obtiene la etiqueta legible de un campo
   */
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      username: 'Nombre de usuario',
      email: 'Email',
      firstName: 'Nombre',
      lastName: 'Apellido',
      phone: 'Teléfono',
      profilePicture: 'Imagen de perfil',
      address: 'Dirección',
      biography: 'Biografía',
      privacyType: 'Tipo de privacidad',
      role: 'Rol'
    };

    return labels[fieldName] || fieldName;
  }

  // GETTERS DEL FORMULARIO

  get username() { return this.editForm.get('username'); }
  get email() { return this.editForm.get('email'); }
  get firstName() { return this.editForm.get('firstName'); }
  get lastName() { return this.editForm.get('lastName'); }
  get phone() { return this.editForm.get('phone'); }
  get profilePicture() { return this.editForm.get('profilePicture'); }
  get address() { return this.editForm.get('address'); }
  get biography() { return this.editForm.get('biography'); }
  get privacyType() { return this.editForm.get('privacyType'); }
  get role() { return this.editForm.get('role'); }
}
