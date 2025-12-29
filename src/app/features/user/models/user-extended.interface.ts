// MODELO: User - extended interfaces (UserWithFollow, SearchUser)

import { User } from './user-response.interface';

export interface UserWithFollow extends User {
  isFollowing?: boolean;
}

export interface SearchUser extends User {
  displayName?: string;
  isSearchResult?: boolean;
}
