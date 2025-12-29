// MODELO: Admin - AdminActionResponse (interface)

import { ActionType } from '../../../shared/models/enums/enums';

/**
 * Interfaz que representa una acción administrativa registrada.
 * Alineada EXACTAMENTE con AdminActionResponse DTO del backend.
 */
export interface AdminActionResponse {
  id: number;
  adminUsername: string;
  adminFirstName: string;
  adminLastName: string;
  actionType: ActionType;
  title: string;
  description: string;
  entityId: number;
  entityType: string;
  affectedUserUsername?: string;
  affectedUserFirstName?: string;
  affectedUserLastName?: string;
  actionDate: string;
}
