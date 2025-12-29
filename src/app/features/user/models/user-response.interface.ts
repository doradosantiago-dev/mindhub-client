// MODELO: User - response interfaces (User, Role)

import { PrivacyType } from '../../../shared/models/enums/enums';

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  address?: string;
  biography?: string;
  role: Role;
  privacyType: PrivacyType;
  active: boolean;
  registrationDate: string;
  lastActivityDate: string;

  birthDate?: string;
  occupation?: string;
  interests?: string;
  website?: string;
  location?: string;
  socialMedia?: string;
  education?: string;
  company?: string;
}
