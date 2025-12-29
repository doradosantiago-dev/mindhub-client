/** ErrorHandler Service - manejo centralizado de errores HTTP */

import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class ErrorHandlerService {

    /**
     * Obtiene mensaje de error para operaciones de autenticación
     */
    getAuthErrorMessage(error: HttpErrorResponse): string {
        // Cuenta desactivada / inactiva (varios formatos del backend)
        const msg = (error?.error?.message || '').toString().toLowerCase();
        const errType = (error?.error?.error || '').toString().toLowerCase();
        if (
            msg.includes('disabled') ||
            msg.includes('desactiv') ||
            msg.includes('deshabil') ||
            msg.includes('inactiv') ||
            errType.includes('account disabled') ||
            error?.status === 403 && (msg.includes('account') || errType.includes('disabled'))
        ) {
            return 'Cuenta inactiva. Contactar con soporte técnico.';
        }

        // Usuario no encontrado
        if (error?.error?.message?.toLowerCase().includes('user not found')) {
            return 'Usuario no encontrado.';
        }

        // Contraseña incorrecta
        if (error?.status === 401 ||
            error?.error?.message?.toLowerCase().includes('unexpected error') ||
            error?.error?.message?.toLowerCase().includes('invalid credentials')) {
            return 'Contraseña incorrecta.';
        }

        // Usuario o email ya existe
        if (error?.error?.message?.toLowerCase().includes('already exists') ||
            error?.error?.message?.toLowerCase().includes('username') ||
            error?.error?.message?.toLowerCase().includes('email')) {
            return 'Usuario o email ya existe.';
        }

        return this.getGenericErrorMessage(error);
    }

    /**
     * Obtiene mensaje de error para operaciones CRUD de usuarios
     */
    getUserErrorMessage(error: HttpErrorResponse): string {
        if (error?.error?.message && !error?.error?.message?.toLowerCase().includes('unexpected error')) {
            return error.error.message;
        }

        if (error?.status === 409) {
            return 'Usuario o email ya existe.';
        }

        if (error?.status === 400) {
            return 'Datos inválidos.';
        }

        if (error?.status === 404) {
            return 'Usuario no encontrado.';
        }

        return this.getGenericErrorMessage(error);
    }

    /**
     * Obtiene mensaje de error para operaciones de posts
     */
    getPostErrorMessage(error: HttpErrorResponse): string {
        if (error?.error?.message) {
            return error.error.message;
        }

        if (error?.status === 400) {
            return 'Datos inválidos. Verifica la información ingresada.';
        }

        if (error?.status === 401) {
            return 'No tienes permisos para esta acción.';
        }

        if (error?.status === 404) {
            return 'Publicación no encontrada.';
        }

        return this.getGenericErrorMessage(error);
    }

    /**
     * Obtiene mensaje de error genérico basado en código HTTP
     */
    getGenericErrorMessage(error: HttpErrorResponse): string {
        if (error?.status === 403) {
            return 'Acceso denegado.';
        }

        if (error?.status === 0 || error?.status === 500) {
            return 'Error de conexión.';
        }

        return 'Error inesperado. Intenta nuevamente.';
    }
}
