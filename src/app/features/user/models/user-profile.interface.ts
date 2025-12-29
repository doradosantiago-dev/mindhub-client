// MODELO: User - profile interfaces (UserProfileRequest, UserProfile)

// REQUEST INTERFACES

/**
 * Interfaz para solicitud de actualización de perfil de usuario.
 * Alineada EXACTAMENTE con UserProfileRequest DTO del backend.
 */
export interface UserProfileRequest {
  birthDate?: string;
  occupation?: string;
  interests?: string;
  website?: string;
  location?: string;
  socialMedia?: string;
  education?: string;
  company?: string;
}

// RESPONSE INTERFACES

/**
 * Interfaz que representa el perfil extendido de un usuario.
 * Alineada EXACTAMENTE con UserProfileResponse DTO del backend.
 * Contiene información adicional del usuario como fecha de nacimiento,
 * ocupación, intereses, ubicación y datos profesionales.
 */
export interface UserProfile {
  id: number;
  dateOfBirth?: string;
  occupation?: string;
  interests?: string;
  website?: string;
  location?: string;
  socialMedia?: string;
  education?: string;
  company?: string;
  creationDate: string;
  updateDate?: string;
}
