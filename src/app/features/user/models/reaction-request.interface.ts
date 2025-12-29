// MODELO: Reaction - ReactionRequest (interface)

import { ReactionType } from '../../../shared/models/enums/enums';

/**
 * Interfaz para crear una reacción.
 * Alineada EXACTAMENTE con ReactionRequest DTO del backend.
 */
export interface ReactionRequest {
  postId: number;
  commentId?: number;
  reactionType: ReactionType;
}
