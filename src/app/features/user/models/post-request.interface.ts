// MODELO: Post - request interfaces (PostCreateRequest)

import { PrivacyType } from '../../../shared/models/enums/enums';

export interface PostCreateRequest {
  content: string;
  imageUrl?: string;
  privacyType: PrivacyType;
}
