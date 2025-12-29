// MODELO: Comment - CommentResponse (interface)

import { User } from '../user/user-response.interface';

/**
 * Interfaz que representa un comentario de usuario.
 * Alineada EXACTAMENTE con CommentResponse DTO del backend.
 */
export interface CommentResponse {
  id: number;
  content: string;
  creationDate: string;
  editDate?: string;
  author: User;
  postId: number;
}
