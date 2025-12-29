// Profile component — primary UI for user profile

import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth';
import { UserService } from '../user/data-access/user.service';
import { ErrorHandlerService } from '../../core/services';
import { HeaderComponent } from '@shared/components';
import { SidebarComponent } from '@shared/components';
import { FooterComponent } from '@shared/components';
import { DateFormatPipe } from '@shared/pipes/date-format.pipe';
import { catchError, finalize, tap, throwError, switchMap, EMPTY } from 'rxjs';
import { User } from '../user/models';

// INTERFACES

/**
 * Interfaz para los datos del formulario de perfil
 */
interface ProfileFormData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  biography: string;
  address: string;
  birthDate: string;
  occupation: string;
  interests: string;
  website: string;
  location: string;
  socialMedia: string;
  education: string;
  company: string;
  privacyType: string;
}

/**
 * Tipos para las secciones del perfil
 */
type ProfileSection = {
  readonly title: string;
  readonly icon: string;
  readonly fields: ProfileField[];
};

/**
 * Tipos para los campos del perfil
 */
type ProfileField = {
  readonly key: keyof User | string;
  readonly label: string;
  readonly value: string | null;
  readonly type: 'text' | 'email' | 'phone' | 'date' | 'textarea' | 'url' | 'select';
  readonly required?: boolean;
  readonly editable?: boolean;
  readonly options?: { value: string; label: string }[];
};

/**
 * Componente de perfil de usuario
 * 
 * Este componente implementa un sistema completo de gestión de perfil
 * utilizando Angular 20 con signals modernos, formularios reactivos
 * y patrones de diseño limpios.
 * 
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    SidebarComponent,
    FooterComponent,
    MatIconModule,
    DateFormatPipe
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlerService);

  // Signal de estado consolidado
  private readonly _state = signal<{
    isLoading: boolean;
    isEditing: boolean;
    errorMessage: string | null;
    userProfile: User | null;
    showDeleteConfirm: boolean;
    currentUser: User | null;
  }>({
    isLoading: false,
    isEditing: false,
    errorMessage: null,
    userProfile: null,
    showDeleteConfirm: false,
    currentUser: this.authService.getCurrentUser()
  });

  // Signals computados para acceso específico
  readonly isLoading = computed(() => this._state().isLoading);
  readonly isEditing = computed(() => this._state().isEditing);
  readonly errorMessage = computed(() => this._state().errorMessage);
  readonly userProfile = computed(() => this._state().userProfile);
  readonly showDeleteConfirm = computed(() => this._state().showDeleteConfirm);
  readonly currentUser = computed(() => this._state().currentUser);
  readonly isAdmin = computed(() => this._state().currentUser?.role?.name === 'ADMIN');

  // Signals de configuración

  /** Campos de solo lectura que no se pueden editar */
  readonly readonlyFields = signal(['username', 'role', 'active', 'registrationDate', 'lastActivityDate']);

  /** Reglas de validación para el formulario */
  readonly validationRules = signal({
    minNameLength: 2,
    maxNameLength: 50
  });

  // Formulario reactivo

  /**
   * Formulario reactivo para la edición del perfil
   * 
   * Contiene todos los campos editables del perfil con validaciones
   * apropiadas para cada tipo de dato.
   */
  readonly profileForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    biography: [''],
    address: [''],
    birthDate: [''],
    occupation: [''],
    interests: [''],
    website: [''],
    location: [''],
    socialMedia: [''],
    education: [''],
    company: [''],
    privacyType: ['PRIVATE', [Validators.required]]
  });


  // Computed values

  /**
   * Secciones del perfil computadas dinámicamente
   * 
   * Genera las secciones del perfil basándose en el usuario actual
   * y su perfil cargado, organizando la información de forma lógica.
   */
  readonly profileSections = computed((): ProfileSection[] => {
    const user = this._state().currentUser;
    const profile = this._state().userProfile;

    if (!user) return [];

    return [
      this.createPersonalInfoSection(user, profile),
      this.createProfessionalInfoSection(profile),
      this.createSocialInfoSection(profile),
      this.createAccountInfoSection(user)
    ];
  });


  // Constructor e inicialización

  /**
   * Constructor del componente
   * 
   * Configura los efectos reactivos y carga el perfil del usuario
   * al inicializar el componente.
   */
  constructor() {
    this.setupEffects();
    this.loadUserProfile();
  }


  // Métodos públicos

  /**
   * Recarga el perfil del usuario
   * 
   * Útil para refrescar la información después de actualizaciones
   * o cuando se detectan cambios en el backend.
   */
  reloadProfile(): void {
    this.loadUserProfile();
  }

  /**
   * Alterna entre modo de visualización y edición
   * 
   * Si está en modo edición, cancela los cambios y vuelve a la vista.
   * Si está en modo visualización, habilita la edición.
   */
  toggleEditMode(): void {
    if (this._state().isEditing) {
      this.cancelEdit();
    } else {
      this._state.update(s => ({ ...s, isEditing: true }));
    }
  }

  /**
   * Guarda los cambios del perfil
   * 
   * Valida el formulario y envía las actualizaciones tanto del usuario
   * como del perfil extendido al backend.
   * 
   * @throws Error si el formulario es inválido o no hay usuario autenticado
   */
  saveProfile(): void {
    if (this.profileForm.invalid || this._state().isLoading) return;

    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));

    const formData = this.profileForm.value;
    const currentUser = this._state().currentUser;

    if (!currentUser?.id) {
      this.handleError('No se pudo obtener la información del usuario');
      return;
    }

    this.updateUserProfile(formData, currentUser);
  }

  /**
   * Navega al dashboard correspondiente
   * 
   * Redirige al usuario al dashboard de administrador si es admin,
   * o al dashboard regular si es usuario normal.
   */
  goToDashboard(): void {
    // Evitar navegar si hay una carga en curso
    if (this.isLoading()) return;

    // Para admins y usuarios normales, la ruta es '/dashboard'
    // Las rutas de admin están anidadas dentro del dashboard
    const route = '/dashboard';

    this.router.navigateByUrl(route)
      .then(success => {
        if (!success) {
          this.router.navigate([route]).catch(err => {
            // Error de navegación manejado
          });
        }
      })
      .catch(err => {
        // Último recurso: usar navigate
        this.router.navigate([route]).catch(() => { });
      });
  }

  /**
   * Obtiene el valor de un campo del perfil
   * 
   * @param field - Campo del perfil a consultar
   * @returns Valor del campo en modo edición o visualización
   */
  getFieldValue(field: ProfileField): string {
    if (this.readonlyFields().includes(field.key)) {
      return field.value || '';
    }

    return this.isEditing()
      ? this.profileForm.get(field.key)?.value || ''
      : field.value || '';
  }

  /**
   * Verifica si un campo del formulario es inválido
   * 
   * @param fieldKey - Clave del campo a validar
   * @returns true si el campo es inválido y ha sido tocado
   */
  isFieldInvalid(fieldKey: string): boolean {
    const control = this.profileForm.get(fieldKey);
    return control?.invalid && control?.touched || false;
  }

  /**
   * Muestra el modal de confirmación de eliminación
   */
  showDeleteConfirmation(): void {
    this._state.update(s => ({ ...s, showDeleteConfirm: true }));
  }

  /**
   * Cancela la eliminación de cuenta
   */
  cancelDelete(): void {
    this._state.update(s => ({ ...s, showDeleteConfirm: false }));
  }

  /**
   * Elimina la cuenta del usuario permanentemente
   * 
   * Proceso irreversible que elimina todos los datos del usuario
   * y lo redirige a la página principal.
   */
  deleteAccount(): void {
    if (this._state().isLoading) return;

    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));

    // Si el usuario es admin comprobamos cuántos admins activos hay antes
    // de permitir la eliminación. Si es el último admin mostramos un
    // mensaje claro y abortamos la operación.
    const deleteFlow$ = this.isAdmin()
      ? this.userService.getActiveAdminCount().pipe(
        switchMap((count) => {
          if (count <= 1) {
            this.handleError('No puedes eliminar tu cuenta porque eres el último administrador. Crea otro administrador o contacta con soporte.');
            return EMPTY;
          }

          return this.userService.deleteCurrentUser();
        })
      )
      : this.userService.deleteCurrentUser();

    deleteFlow$
      .subscribe({
        next: () => {
          // Eliminación exitosa: limpiar sesión y redirigir inmediatamente
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Redirigir usando replace para evitar que quede en el historial
          window.location.replace('/');
        },
        error: (error) => {
          // Si hay error mostramos mensaje genérico
          this.handleError('Error al eliminar la cuenta');
          this._state.update(s => ({ ...s, isLoading: false, showDeleteConfirm: false }));
        }
      });
  }

  /**
   * Maneja errores de carga de imagen de perfil
   * 
   * Oculta la imagen fallida y muestra el placeholder
   * cuando una imagen de perfil no puede cargarse.
   * 
   * @param event - Evento de error de la imagen
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const placeholder = img.parentElement?.querySelector('.avatar-placeholder') as HTMLElement;
    if (placeholder) {
      placeholder.style.display = 'flex';
    }
  }


  // Métodos privados

  /**
   * Configura los efectos reactivos del componente
   */
  private setupEffects(): void {
    effect(() => {
      // Evitar actualizar el mismo signal sin cambios: solo limpiar el mensaje
      // de error cuando realmente exista uno. De lo contrario `update` crea
      // un nuevo objeto y vuelve a disparar el efecto provocando un bucle
      // infinito y el bloqueo de la app al activar el modo edición.
      const state = this._state();
      if (state.isEditing && state.errorMessage !== null) {
        this._state.update(s => ({ ...s, errorMessage: null }));
      }
    });

    // Sincronizar currentUser interno con el signal de AuthService para que
    // cambios en la sesión (por ejemplo actualizaciones desde gestión de usuarios)
    // se reflejen inmediatamente en este componente.
    effect(() => {
      const cu = this.authService.currentUser();
      const prev = this._state().currentUser;
      // Also update when profilePicture changes so avatar updates without reload
      if (!prev || prev.id !== cu?.id || prev.firstName !== cu?.firstName || prev.lastName !== cu?.lastName || prev.profilePicture !== cu?.profilePicture) {
        this._state.update(s => ({ ...s, currentUser: cu }));
      }
    });
  }

  /**
   * Carga el perfil del usuario desde el backend
   * 
   * Obtiene la información extendida del perfil y actualiza
   * el formulario con los datos actuales.
   */
  private loadUserProfile(): void {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));

    const currentUser = this._state().currentUser;
    if (!currentUser?.id) {
      this.handleError('No se pudo obtener la información del usuario');
      return;
    }

    this.userService.getCurrentUser()
      .pipe(
        tap((profile) => {
          this._state.update(s => ({ ...s, userProfile: profile }));
          this.populateForm();
        }),
        catchError((error) => {
          this.handleError('Error al cargar el perfil del usuario');
          return throwError(() => error);
        }),
        finalize(() => this._state.update(s => ({ ...s, isLoading: false })))
      )
      .subscribe();
  }

  /**
   * Pobla el formulario con los datos del usuario
   * 
   * Actualiza todos los campos del formulario con la información
   * actual del usuario y su perfil extendido.
   */
  private populateForm(): void {
    const user = this._state().currentUser;
    const profile = this._state().userProfile;

    if (!user || !profile) return;

    this.profileForm.patchValue({
      username: user.username || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      biography: user.biography || '',
      address: user.address || '',
      birthDate: profile.birthDate || '',
      occupation: profile.occupation || '',
      interests: profile.interests || '',
      website: profile.website || '',
      location: profile.location || '',
      socialMedia: profile.socialMedia || '',
      education: profile.education || '',
      company: profile.company || ''
    });
  }

  /**
   * Cancela el modo de edición
   * 
   * Restaura los valores originales del formulario y
   * desactiva el modo de edición.
   */
  private cancelEdit(): void {
    this.populateForm();
    this._state.update(s => ({ ...s, isEditing: false }));
  }

  /**
   * Actualiza el perfil del usuario en el backend
   * 
   * Envía las actualizaciones tanto del usuario básico como
   * del perfil extendido en secuencia.
   * 
   * @param formData - Datos del formulario a enviar
   * @param currentUser - Usuario actual autenticado
   */
  private updateUserProfile(formData: ProfileFormData, currentUser: User): void {
    const profileUpdateData = {
      birthDate: formData.birthDate,
      occupation: formData.occupation,
      interests: formData.interests,
      website: formData.website,
      location: formData.location,
      socialMedia: formData.socialMedia,
      education: formData.education,
      company: formData.company
    };

    // Si el usuario es admin, usar el endpoint de admin que permite modificar username
    if (currentUser.role?.name === 'ADMIN') {
      const adminUpdateData = {
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        profilePicture: currentUser.profilePicture || undefined,
        address: formData.address || undefined,
        biography: formData.biography || undefined,
        privacyType: formData.privacyType as any,
        roleName: currentUser.role.name
      };

      this.userService.updateUserAsAdmin(currentUser.id, adminUpdateData)
        .pipe(
          switchMap((updatedUser) => {
            this.authService.updateCurrentUser(updatedUser);
            this._state.update(s => ({ ...s, currentUser: updatedUser }));
            return this.userService.updateCurrentUserProfile(profileUpdateData);
          }),
          tap(() => {
            this._state.update(s => ({ ...s, isEditing: false, errorMessage: null }));
            this.loadUserProfile();
          }),
          catchError((error) => {
            this.handleError('Error al actualizar el perfil. Por favor intenta de nuevo.');
            // No propagamos el error para evitar problemas con la sesión
            return EMPTY;
          }),
          finalize(() => this._state.update(s => ({ ...s, isLoading: false })))
        )
        .subscribe();
    } else {
      // Para usuarios normales, usar el endpoint regular
      const userUpdateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        biography: formData.biography,
        address: formData.address,
        privacyType: formData.privacyType as any
      };

      this.userService.updateCurrentUser(userUpdateData)
        .pipe(
          switchMap((updatedUser) => {
            this.authService.updateCurrentUser(updatedUser);
            this._state.update(s => ({ ...s, currentUser: updatedUser }));
            return this.userService.updateCurrentUserProfile(profileUpdateData);
          }),
          tap(() => {
            this._state.update(s => ({ ...s, isEditing: false, errorMessage: null }));
            this.loadUserProfile();
          }),
          catchError((error) => {
            this.handleError('Error al actualizar el perfil');
            return throwError(() => error);
          }),
          finalize(() => this._state.update(s => ({ ...s, isLoading: false })))
        )
        .subscribe();
    }
  }

  /**
   * Maneja errores de forma centralizada
   * 
   * Establece el mensaje de error y desactiva el estado de carga.
   * 
   * @param message - Mensaje de error a mostrar
   */
  private handleError(message: string): void {
    this._state.update(s => ({ ...s, errorMessage: message, isLoading: false }));
  }


  // Métodos para crear secciones del perfil

  /**
   * Crea la sección de información personal
   * 
   * @param user - Usuario autenticado
   * @param profile - Perfil extendido del usuario
   * @returns Sección configurada con campos personales
   */
  private createPersonalInfoSection(user: User, profile: User | null): ProfileSection {
    // Los administradores pueden editar su username
    const canEditUsername = user.role?.name === 'ADMIN';

    return {
      title: 'Información Personal',
      icon: 'badge',
      fields: [
        { key: 'firstName', label: 'Nombre', value: user.firstName || '', type: 'text', required: true, editable: true },
        { key: 'lastName', label: 'Apellidos', value: user.lastName || '', type: 'text', required: true, editable: true },
        { key: 'username', label: 'Nombre de usuario', value: user.username || '', type: 'text', required: true, editable: canEditUsername },
        { key: 'birthDate', label: 'Fecha de nacimiento', value: profile?.birthDate || '', type: 'date', editable: true },
        { key: 'phone', label: 'Teléfono', value: user.phone || '', type: 'phone', editable: true },
        { key: 'email', label: 'Correo electrónico', value: user.email || '', type: 'email', required: true, editable: true }
      ]
    };
  }

  /**
   * Crea la sección de información profesional
   * 
   * @param profile - Perfil extendido del usuario
   * @returns Sección configurada con campos profesionales
   */
  private createProfessionalInfoSection(profile: User | null): ProfileSection {
    return {
      title: 'Información Profesional',
      icon: 'business_center',
      fields: [
        { key: 'occupation', label: 'Ocupación', value: profile?.occupation || '', type: 'text', editable: true },
        { key: 'company', label: 'Empresa', value: profile?.company || '', type: 'text', editable: true },
        { key: 'education', label: 'Nivel educativo', value: profile?.education || '', type: 'text', editable: true },
        { key: 'website', label: 'Sitio web profesional', value: profile?.website || '', type: 'url', editable: true }
      ]
    };
  }

  /**
   * Crea la sección de información social
   * 
   * @param profile - Perfil extendido del usuario
   * @returns Sección configurada con campos sociales
   */
  private createSocialInfoSection(profile: User | null): ProfileSection {
    return {
      title: 'Información Social y Ubicación',
      icon: 'groups',
      fields: [
        { key: 'location', label: 'Ciudad/País', value: profile?.location || '', type: 'text', editable: true },
        { key: 'address', label: 'Dirección', value: profile?.address || '', type: 'text', editable: true },
        { key: 'socialMedia', label: 'Redes sociales', value: profile?.socialMedia || '', type: 'text', editable: true },
        { key: 'interests', label: 'Intereses y hobbies', value: profile?.interests || '', type: 'textarea', editable: true },
        { key: 'biography', label: 'Biografía', value: profile?.biography || '', type: 'textarea', editable: true }
      ]
    };
  }

  /**
   * Crea la sección de información de cuenta
   * 
   * @param user - Usuario autenticado
   * @returns Sección configurada con campos de cuenta
   */
  private createAccountInfoSection(user: User): ProfileSection {
    return {
      title: 'Información de Cuenta',
      icon: 'manage_accounts',
      fields: [
        {
          key: 'registrationDate',
          label: 'Fecha de registro',
          value: user.registrationDate || '',
          type: 'text',
          editable: false
        },
        {
          key: 'lastActivityDate',
          label: 'Última actividad',
          value: user.lastActivityDate || '',
          type: 'text',
          editable: false
        },
        {
          key: 'role',
          label: 'Rol',
          value: user.role?.name || '',
          type: 'text',
          editable: false
        },
        {
          key: 'privacyType',
          label: 'Privacidad',
          value: user.privacyType || 'PRIVATE',
          type: 'select',
          editable: true,
          required: true,
          options: [
            { value: 'PUBLIC', label: 'Público' },
            { value: 'PRIVATE', label: 'Privado' }
          ]
        }
      ]
    };
  }

  // Añadir este computed para el avatar del admin
  readonly userAvatar = computed(() => {
    const user = this.currentUser();

    // Si es admin y no tiene imagen, usar avatar de admin
    if (user?.role?.name === 'ADMIN' && (!user.profilePicture || user.profilePicture === '/assets/default-avatar.png')) {
      return '/admin-avatar.png';
    }

    // Si tiene imagen personalizada, usarla
    if (user?.profilePicture) {
      return user.profilePicture;
    }

    // Avatar por defecto para usuarios normales
    return '/assets/default-avatar.png';
  });

}
