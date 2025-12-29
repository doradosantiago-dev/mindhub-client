// MODELO: Reaction - ReactionRequest (interface)

import { ReactionType } from '../enums';

/**
 * Interfaz para crear una reacción.
 * Alineada EXACTAMENTE con ReactionRequest DTO del backend.
 */
export interface ReactionRequest {
  postId: number;
  commentId?: number;
  reactionType: ReactionType;
}
