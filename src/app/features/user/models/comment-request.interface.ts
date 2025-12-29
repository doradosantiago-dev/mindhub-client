// MODELO: Comment - CommentRequest (interface)

/**
 * Interfaz para crear un comentario en un post.
 * Alineada EXACTAMENTE con CommentRequest DTO del backend.
 */
export interface CommentRequest {
  content: string;
  postId: number;
}
