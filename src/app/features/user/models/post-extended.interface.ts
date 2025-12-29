// MODELO: Post - Extended interfaces (PostWithInteractions)

import { PostResponse } from './post-response.interface';
import { CommentResponse } from './comment-response.interface';
import { ReactionResponse } from './reaction-response.interface';

export interface PostWithInteractions extends PostResponse {
  likeCount?: number;
  commentCount?: number;
  userReaction?: ReactionResponse;
  comments?: CommentResponse[];
  isAddingComment?: boolean;
  isProcessingLike?: boolean;
}

