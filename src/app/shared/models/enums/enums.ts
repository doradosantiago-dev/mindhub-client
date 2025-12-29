// MODELO: Enums (definiciones)

// PRIVACY & ACCESS

/**
 * Enum que define los tipos de privacidad disponibles para usuarios y posts.
 * Alineado con PrivacyType enum del backend.
 */
export enum PrivacyType {
  PUBLIC = 'PUBLIC',

  PRIVATE = 'PRIVATE'
}

// INTERACTIONS

/**
 * Enum que define los tipos de reacciones disponibles para posts.
 * Alineado con ReactionType enum del backend.
 * 
 * @note Actualmente solo LIKE está implementado en el backend
 */
export enum ReactionType {
  LIKE = 'LIKE'
}

/**
 * Enum que define los estados posibles de un reporte.
 * Alineado con ReportStatus enum del backend.
 */
export enum ReportStatus {
  PENDING = 'PENDING',

  RESOLVED = 'RESOLVED',

  REJECTED = 'REJECTED'
}

// NOTIFICATIONS

/**
 * Enum que define los tipos de notificaciones del sistema.
 * Alineado con NotificationType enum del backend.
 */
export enum NotificationType {
  COMMENT = 'COMMENT',

  REACTION = 'REACTION',

  REPORT = 'REPORT',

  ADMIN_ACTION = 'ADMIN_ACTION',

}

// CHATBOT

/**
 * Enum que define los tipos de mensajes en el chatbot.
 * Alineado con MessageType enum del backend.
 */
export enum MessageType {
  USER = 'USER',

  CHATBOT = 'CHATBOT'
}

// ADMIN ACTIONS

/**
 * Enum que define los tipos de acciones administrativas disponibles.
 * Alineado con ActionType enum del backend.
 */
export enum ActionType {
  ACTIVATE_USER = 'ACTIVATE_USER',

  DEACTIVATE_USER = 'DEACTIVATE_USER',

  UPDATE_USER = 'UPDATE_USER',

  DELETE_USER = 'DELETE_USER',

  DELETE_POST = 'DELETE_POST',

  RESOLVE_REPORT = 'RESOLVE_REPORT',

  REJECT_REPORT = 'REJECT_REPORT',

  CREATE_ADMIN = 'CREATE_ADMIN',

  DELETE_ADMIN = 'DELETE_ADMIN'
}
