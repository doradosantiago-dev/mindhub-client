// MODELO: User - request interfaces (UserUpdateRequest, AdminUserUpdateRequest)

import { PrivacyType } from '../../../shared/models/enums/enums';

export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
  address?: string;
  biography?: string;
  privacyType?: PrivacyType;
}

export interface AdminUserUpdateRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
  address?: string;
  biography?: string;
  privacyType: PrivacyType;
  roleName?: string;
}
