// Componente Unauthorized - Página de acceso no autorizado

// Importaciones necesarias de Angular y Angular Material
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-unauthorized',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule
    ],
    // Plantilla y estilos del componente
    templateUrl: './unauthorized.component.html',
    styleUrl: './unauthorized.component.css'
})
export class UnauthorizedComponent {
    // Inyección del Router para manejar la navegación
    private readonly router = inject(Router);

    // Navega al dashboard principal
    goToDashboard(): void {
        this.router.navigate(['/dashboard']);
    }

}
