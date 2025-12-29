// MODELO: Auth - request interfaces (login/register)

import { PrivacyType } from '../../../shared/models/enums/enums';
import { Role } from '../../user/models/user-response.interface';

/**
 * Interfaz para solicitud de login.
 * Alineada EXACTAMENTE con UserLoginRequest DTO del backend.
 */
export interface UserLoginRequest {
  username: string;
  password: string;
}

/**
 * Interfaz para solicitud de registro.
 * Alineada EXACTAMENTE con UserRegisterRequest DTO del backend.
 */
export interface UserRegisterRequest {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  address?: string;
  biography?: string;
  role?: Role;
  privacyType?: PrivacyType;
}
