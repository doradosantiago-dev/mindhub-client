// Register component — user registration form and logic

import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, tap, throwError } from 'rxjs';
import { AuthService, ErrorHandlerService } from '@core/services';
import { UserRegisterRequest } from '@core/models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  host: {
    class: 'register-component'
  }
})
export class RegisterComponent {
  // INYECCIÓN DE DEPENDENCIAS
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlerService);

  // SIGNALS DE ESTADO
  private readonly _isLoading = signal<boolean>(false);
  private readonly _errorMessage = signal<string | null>(null);

  // SIGNALS COMPUTADOS
  readonly isLoading = this._isLoading.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  // FORMULARIO REACTIVO
  readonly registerForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  // CONSTRUCTOR Y EFFECTS
  constructor() {
    // Effect para limpiar errores cuando el usuario empiece a escribir
    effect(() => {
      const formValues = this.registerForm.value;
      if (Object.values(formValues).some(value => value) && this._errorMessage()) {
        this._errorMessage.set(null);
      }
    });
  }

  // MÉTODOS PÚBLICOS

  /**
   * Maneja el envío del formulario de registro
   * 
   * Valida el formulario, establece el estado de carga y
   * realiza el registro a través del AuthService.
   */
  onSubmit(): void {
    if (this.registerForm.invalid || this._isLoading()) {
      return;
    }

    this._isLoading.set(true);
    this._errorMessage.set(null);

    const formData = this.registerForm.value;
    // Removemos confirmPassword del objeto antes de enviar
    const { confirmPassword, ...userData } = formData;

    this.authService.register(userData as UserRegisterRequest)
      .pipe(
        tap(() => {
          this.router.navigate(['/auth/login']);
        }),
        catchError((error: HttpErrorResponse) => {
          this._errorMessage.set(this.errorHandler.getAuthErrorMessage(error));
          return throwError(() => error);
        }),
        finalize(() => {
          this._isLoading.set(false);
        })
      )
      .subscribe();
  }

  /**
   * Navega a la página de login
   * 
   * Redirige al usuario a la ruta de autenticación para
   * iniciar sesión después del registro exitoso.
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  /**
   * Navega de vuelta al landing page
   * 
   * Permite al usuario regresar a la página principal
   * sin necesidad de completar el registro.
   */
  goToLanding(): void {
    this.router.navigate(['/landing']);
  }

  // MÉTODOS PRIVADOS

  /**
   * Validador personalizado para verificar que las contraseñas coincidan
   * 
   * @param form Formulario a validar
   * @returns Objeto de errores o null si es válido
   */
  private passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }

    return null;
  }
}
