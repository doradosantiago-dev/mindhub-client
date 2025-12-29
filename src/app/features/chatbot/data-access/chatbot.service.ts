import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ChatBotMessageResponse } from '../models';

/**
 * Solicitud de mensaje para el chatbot.
 * Alineada con el backend.
 */
export interface ChatBotMessageRequest {
  message: string;
}

/**
 * Respuesta de la API del chatbot.
 */
export interface ChatBotApiResponse {
  message: string;
  success: boolean;
}

/**
 * Mensaje temporal del usuario para la conversación local.
 */
export interface UserMessageTemp {
  id: number;
  content: string;
  messageType: 'USER';
  creationDate: string;
}

// CHATBOT SERVICE: manejo de interacción con chatbot (TS)
@Injectable({
  providedIn: 'root'
})
export class ChatBotService {

  private readonly API_URL = `${environment.apiUrl}/chatbot`;

  // Signals para el estado UI del chatbot
  private readonly _isOpen = signal<boolean>(false);
  private readonly _isMinimized = signal<boolean>(false);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _conversation = signal<(ChatBotMessageResponse | UserMessageTemp)[]>([]);

  // Computed values - solo lectura para componentes
  readonly isOpen = this._isOpen.asReadonly();
  readonly isMinimized = this._isMinimized.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly conversation = this._conversation.asReadonly();

  private readonly http = inject(HttpClient);

  // COMUNICACIÓN CON EL CHATBOT

  /**
   * Envía un mensaje al chatbot y actualiza la conversación.
   * @param message - Mensaje del usuario
   * @returns Observable con la respuesta del chatbot
   */
  sendMessage(message: string): Observable<ChatBotMessageResponse> {
    this._isLoading.set(true);

    const request: ChatBotMessageRequest = { message };

    return this.http.post<ChatBotMessageResponse>(`${this.API_URL}/send`, request)
      .pipe(
        tap(response => {
          // Agregar el mensaje del usuario a la conversación local
          const userMessage: UserMessageTemp = {
            id: Date.now(),
            content: message,
            messageType: 'USER',
            creationDate: new Date().toISOString()
          };

          this.addUserMessageToConversation(userMessage);

          // Verificar que la respuesta tenga la estructura correcta
          if (response && typeof response === 'object' && 'content' in response) {
            this.addMessageToConversation(response);
          } else {
            throw new Error('Respuesta del chatbot inválida');
          }

          this._isLoading.set(false);
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene la conversación actual del usuario desde el backend.
   * @returns Observable con la conversación completa
   */
  getCurrentUserConversation(): Observable<ChatBotMessageResponse[]> {
    this._isLoading.set(true);

    return this.http.get<ChatBotMessageResponse[]>(`${this.API_URL}/conversation`)
      .pipe(
        tap(conversation => {
          // Verificar que la conversación sea un array válido
          if (Array.isArray(conversation)) {
            this._conversation.set(conversation as (ChatBotMessageResponse | UserMessageTemp)[]);
          } else {
            this._conversation.set([]);
          }
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Elimina la conversación actual del usuario.
   * @returns Observable con la confirmación de eliminación
   */
  clearCurrentUserConversation(): Observable<ChatBotApiResponse> {
    return this.http.delete<ChatBotApiResponse>(`${this.API_URL}/conversation`)
      .pipe(
        tap(() => {
          this._conversation.set([]);
        }),
        catchError(error => throwError(() => error))
      );
  }

  // GESTIÓN DEL ESTADO DE LA INTERFAZ

  /**
   * Abre o cierra el chatbot.
   */
  toggleChatbot(): void {
    this._isOpen.update(isOpen => !isOpen);
    if (this._isOpen()) {
      this._isMinimized.set(false);
    }
  }

  /**
   * Cierra el chatbot completamente.
   */
  closeChatbot(): void {
    this._isOpen.set(false);
    this._isMinimized.set(false);
  }

  /**
   * Minimiza o restaura el chatbot.
   */
  toggleMinimize(): void {
    this._isMinimized.update(isMinimized => !isMinimized);
  }

  // UTILIDADES PRIVADAS

  /**
   * Agrega un mensaje del chatbot a la conversación local.
   * @param message - Mensaje del chatbot a agregar
   */
  private addMessageToConversation(message: ChatBotMessageResponse): void {
    this._conversation.update(conversation => [...conversation, message]);
  }

  /**
   * Agrega un mensaje del usuario a la conversación local.
   * @param message - Mensaje del usuario a agregar
   */
  private addUserMessageToConversation(message: UserMessageTemp): void {
    this._conversation.update(conversation => [...conversation, message]);
  }
}
