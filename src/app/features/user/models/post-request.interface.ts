// MODELO: Post - request interfaces (PostCreateRequest)

import { PrivacyType } from '../enums';

export interface PostCreateRequest {
  content: string;
  imageUrl?: string;
  privacyType: PrivacyType;
}
