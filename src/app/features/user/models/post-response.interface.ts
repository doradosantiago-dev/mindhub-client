// MODELO: Post - PostResponse / PostSummaryResponse (interfaces)

import { PrivacyType } from '../../../shared/models/enums/enums';
import { User } from './user-response.interface';

/**
 * Interfaz que representa el resumen de un post.
 * Alineada EXACTAMENTE con PostSummaryResponse DTO del backend.
 */
export interface PostSummaryResponse {
  id: number;
  content: string;
  author: User;
  exists: boolean;
}

/**
 * Interfaz que representa un post completo.
 * Alineada EXACTAMENTE con PostResponse DTO del backend.
 */
export interface PostResponse {
  id: number;
  content: string;
  imageUrl?: string;
  privacyType: PrivacyType;
  creationDate: string;
  updateDate?: string;
  author: User;
  commentCount?: number;
  likeCount?: number;
}
