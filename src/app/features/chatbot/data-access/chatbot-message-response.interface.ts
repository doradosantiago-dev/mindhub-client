// MODELO: Chatbot - ChatBotMessageResponse (interface)

import { User } from '../../user/models/user-response.interface';
import { MessageType } from '../../../shared/models/enums/enums';

/**
 * Interfaz que representa un mensaje del chatbot/usuario.
 * Alineada EXACTAMENTE con ChatBotMessageResponse DTO del backend.
 */
export interface ChatBotMessageResponse {
  id: number;
  content: string;
  messageType: MessageType;
  creationDate: string;
  sessionId: string;
  user: User;
  chatBotName: string;
}
