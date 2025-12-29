// MODELO: Auth - AuthResponse / TokenValidationResponse (interfaces)

import { User } from '../../user/models/user-response.interface';

/**
 * Interfaz para respuesta de autenticación exitosa.
 * Contiene el token JWT y los datos del usuario.
 */
export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

/**
 * Interfaz para respuesta de validación de token.
 * Indica si el token es válido y los datos del usuario.
 */
export interface TokenValidationResponse {
  valid: boolean;
  user: User;
}
