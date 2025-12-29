/** Pipe para formatear fechas en español */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'dateFormat',
    standalone: true
})
export class DateFormatPipe implements PipeTransform {

    /**
     * Transforma una fecha ISO a formato español legible
     * 
     * @param value - Fecha en formato ISO string o Date
     * @param format - Tipo de formato: 'long' | 'short' | 'date-only'
     * @returns Fecha formateada en español
     */
    transform(value: string | Date | undefined | null, format: 'long' | 'short' | 'date-only' = 'long'): string {
        if (!value) {
            return 'Fecha no disponible';
        }

        // Detectar si es solo fecha (YYYY-MM-DD)
        const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
        const isDateOnly = typeof value === 'string' && dateOnlyRegex.test(value);

        if (isDateOnly) {
            const date = new Date(value + 'T00:00:00');
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Convertir a Date si es string
        const date = typeof value === 'string' ? new Date(value) : value;

        if (isNaN(date.getTime())) {
            return 'Fecha no disponible';
        }

        switch (format) {
            case 'short':
                return date.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

            case 'date-only':
                return date.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

            case 'long':
            default:
                const longDate = date.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const time = date.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                return `${longDate}, ${time}`;
        }
    }
}
