// MODELO: Reaction - ReactionResponse (interface)

import { ReactionType } from '../../../shared/models/enums/enums';
import { User } from './user-response.interface';

/**
 * Interfaz que representa una reacción de usuario a un post o comentario.
 * Alineada EXACTAMENTE con ReactionResponse DTO del backend.
 */
export interface ReactionResponse {
  id: number;
  reactionType: ReactionType;
  creationDate: string;
  user: User;
  postId: number;
}
