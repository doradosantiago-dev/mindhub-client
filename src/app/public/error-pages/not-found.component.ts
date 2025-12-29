// Importaciones de Angular y módulos de Angular Material utilizados por este componente
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-not-found',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule
    ],
    templateUrl: './not-found.component.html',
    styleUrl: './not-found.component.css' // ruta al archivo de estilos del componente
})
export class NotFoundComponent {
    // Inyección del Router para poder navegar programáticamente
    private readonly router = inject(Router);

    // Navega al dashboard principal de la aplicación
    goToDashboard(): void {
        this.router.navigate(['/dashboard']);
    }

    // Retrocede en el historial del navegador (equivalente al botón "Atrás")
    goBack(): void {
        window.history.back();
    }
}
