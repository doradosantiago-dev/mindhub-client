/** Landing: página principal — hero, features y CTA. */

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { FooterComponent } from '../../shared/ui/layout/footer/footer.component';

/** Componente standalone: imports y configuración. */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    FooterComponent
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  host: {
    class: 'landing-page'
  }
})
export class LandingComponent {

  // INJECTION DE DEPENDENCIAS
  private readonly router = inject(Router);

  /**
   * Signal que controla el estado de navegación
   */
  private readonly navigationState = signal<'idle' | 'navigating'>('idle');

  // MÉTODOS DE NAVEGACIÓN

  /**
   * Navega a la página de login usando Signals
   * 
   * Actualiza el estado de navegación y redirige al usuario
   * a la ruta de autenticación para iniciar sesión.
   */
  goToLogin(): void {
    this.navigationState.set('navigating');

    this.router.navigate(['/auth/login']).then(() => {
      this.navigationState.set('idle');
    });
  }

  /**
   * Navega a la página de registro usando Signals
   * 
   * Actualiza el estado de navegación y redirige al usuario
   * a la ruta de registro para crear una nueva cuenta.
   */
  goToRegister(): void {
    this.navigationState.set('navigating');

    this.router.navigate(['/auth/register']).then(() => {
      this.navigationState.set('idle');
    });
  }

  /**
   * Navega a una URL externa de forma segura usando Signals
   * 
   * Actualiza el estado de navegación y abre enlaces externos
   * (redes sociales) en una nueva pestaña con configuraciones
   * de seguridad para prevenir ataques.
   * 
   * @param url URL externa a la que navegar
   */
  navigateTo(url: string): void {
    this.navigationState.set('navigating');

    // Abrir URL externa con seguridad
    window.open(url, '_blank', 'noopener,noreferrer');

    // Resetear estado después de un breve delay
    setTimeout(() => {
      this.navigationState.set('idle');
    }, 100);
  }
}