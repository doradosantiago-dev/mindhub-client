// Login component — authentication form and logic

import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, tap, throwError } from 'rxjs';
import { AuthService, ErrorHandlerService } from '@core/services';
import { UserLoginRequest } from '@core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  host: {
    class: 'login-component'
  }
})
export class LoginComponent {
  // INYECCIÓN DE DEPENDENCIAS
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlerService);

  // SIGNALS DE ESTADO
  private readonly _isLoading = signal<boolean>(false);
  private readonly _errorMessage = signal<string | null>(null);
  private readonly _showPassword = signal<boolean>(false);

  // SIGNALS COMPUTADOS
  readonly isLoading = this._isLoading.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly showPassword = this._showPassword.asReadonly();

  // FORMULARIO REACTIVO
  readonly loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // GETTERS PARA EL TEMPLATE
  get usernameControl() {
    return this.loginForm.get('username');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  // CONSTRUCTOR Y EFFECTS
  constructor() {
    // Effect para limpiar errores cuando el usuario empiece a escribir
    effect(() => {
      const username = this.usernameControl?.value;
      const password = this.passwordControl?.value;

      if ((username || password) && this._errorMessage()) {
        this._errorMessage.set(null);
      }
    });
  }

  // MÉTODOS PÚBLICOS

  /**
   * Maneja el envío del formulario de login
   * 
   * Valida el formulario, establece el estado de carga y
   * realiza la autenticación a través del AuthService.
   */
  onSubmit(): void {
    if (this.loginForm.invalid || this._isLoading()) {
      return;
    }

    this._isLoading.set(true);
    this._errorMessage.set(null);

    const credentials: UserLoginRequest = {
      username: this.loginForm.value.username,
      password: this.loginForm.value.password
    };

    this.authService.login(credentials)
      .pipe(
        tap(() => {
          this.router.navigate(['/dashboard']);
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
   * Alterna la visibilidad de la contraseña
   * 
   * Actualiza el signal _showPassword para mostrar/ocultar
   * el contenido del campo de contraseña.
   */
  togglePasswordVisibility(): void {
    this._showPassword.update(show => !show);
  }

  /**
   * Navega a la página de registro
   * 
   * Redirige al usuario a la ruta de registro para crear
   * una nueva cuenta en el sistema.
   */
  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  /**
   * Navega de vuelta al landing page
   * 
   * Permite al usuario regresar a la página principal
   * sin necesidad de autenticarse.
   */
  goToLanding(): void {
    this.router.navigate(['/landing']);
  }
}
