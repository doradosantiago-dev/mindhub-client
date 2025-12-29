// MODELO: Notification - NotificationResponse (interface)

import { NotificationType } from '../enums';

export interface NotificationResponse {
  id: number;
  title: string;
  message: string;
  notificationType: NotificationType;
  read: boolean;
  creationDate: string;
  readDate?: string;
  referenciaId?: number;
  referenciaTabla?: string;
}
