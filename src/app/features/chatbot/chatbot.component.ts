/** Chatbot: asistente conversacional — UI, mensajes y estado. */

import { Component, computed, effect, inject, OnDestroy, signal, runInInjectionContext, Injector, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of, Subject, takeUntil } from 'rxjs';
import { AuthService, ChatBotService } from '@core/services';
import { ChatBotMessageResponse as ChatBotMessage, MessageType, User } from '@core/models';
import { DateFormatPipe } from '@shared/pipes/date-format.pipe';

// Interfaces y tipos
/** Estado interno del chatbot */
interface ChatbotState {
  messages: ChatBotMessage[];
  currentInput: string;
  isTyping: boolean;
}

// Componente principal

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, DateFormatPipe],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnDestroy, AfterViewInit {
  // INYECCIONES DE DEPENDENCIAS

  /** Servicio de autenticación */
  private readonly authService = inject(AuthService);

  /** Servicio del chatbot */
  private readonly chatbotService = inject(ChatBotService);

  /** Injector para contexto de inyección */
  private readonly injector = inject(Injector);

  // ===== DESTROY SUBJECT =====
  private readonly destroy$ = new Subject<void>();

  /** Referencia al contenedor de mensajes para autoscroll */
  @ViewChild('chatMessages')
  private chatMessagesRef?: ElementRef<HTMLDivElement>;

  // SIGNALS PRIVADOS PARA ESTADO INTERNO

  /** Signal para el estado interno del chatbot */
  private readonly _state = signal<ChatbotState>({
    messages: [],
    currentInput: '',
    isTyping: false
  });

  // SIGNALS PÚBLICOS (READONLY)

  /** Estado de apertura del chatbot (solo lectura) */
  readonly isOpen = this.chatbotService.isOpen;

  /** Estado minimizado del chatbot (solo lectura) */
  readonly isMinimized = this.chatbotService.isMinimized;

  /** Mensajes de la conversación (solo lectura) */
  readonly messages = computed(() => this._state().messages);

  /** Texto actual del input (solo lectura) */
  readonly currentInput = computed(() => this._state().currentInput);

  /** Estado de escritura del bot (solo lectura) */
  readonly isTyping = computed(() => this._state().isTyping);

  // VALORES COMPUTADOS

  /**
   * Usuario actual computado desde el servicio de autenticación
   */
  readonly currentUser = computed(() => this.authService.currentUser());

  /**
   * Nombre del usuario para personalización de mensajes
   */
  readonly userName = computed(() => {
    const user = this.currentUser();
    return user?.firstName || 'Usuario';
  });

  // CONSTRUCTOR Y CICLO DE VIDA

  constructor() {
    this.setupEffects();
  }

  ngAfterViewInit(): void {
    // Scroll inicial si ya hay mensajes
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // MÉTODOS PÚBLICOS

  /**
   * Alterna el estado minimizado del chatbot
   */
  toggleMinimize(): void {
    this.chatbotService.toggleMinimize();
  }

  /**
   * Cierra el chatbot
   */
  closeChatbot(): void {
    this.chatbotService.closeChatbot();
  }

  /**
   * Reinicia la conversación actual
   */
  resetConversation(): void {
    this._state.update(state => ({
      ...state,
      messages: [],
      currentInput: '',
      isTyping: false
    }));

    this.chatbotService.clearCurrentUserConversation().pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.addWelcomeMessage();
    });
  }

  /**
   * Envía un mensaje al chatbot
   */
  sendMessage(): void {
    const input = this.currentInput().trim();
    if (!input || this.isTyping()) return;

    const userMessage = this.createMessage(input, MessageType.USER);

    this._state.update(state => ({
      ...state,
      messages: [...state.messages, userMessage],
      isTyping: true,
      currentInput: ''
    }));

    // Scroll to show the newly added user message
    this.scrollToBottom();

    this.chatbotService.sendMessage(input).pipe(
      catchError(() => {
        const errorMessage = this.createMessage(
          'Lo siento, hubo un error al procesar tu mensaje. Inténtalo de nuevo.',
          MessageType.CHATBOT
        );
        this._state.update(state => ({
          ...state,
          messages: [...state.messages, errorMessage],
          isTyping: false
        }));
        return of(null);
      }),
      finalize(() => {
        this._state.update(state => ({
          ...state,
          isTyping: false
        }));
      })
    ).subscribe((response) => {
      if (response) {
        this._state.update(state => ({
          ...state,
          messages: [...state.messages, response]
        }));
        // Desplazar para mostrar la respuesta del bot
        this.scrollToBottom();
      }
    });
  }

  /**
   * Maneja eventos de teclado en el input
   * @param event - Evento de teclado
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Maneja cambios en el input de texto
   * @param event - Evento de cambio del input
   */
  onInputChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this._state.update(state => ({
      ...state,
      currentInput: target.value
    }));
  }

  // MÉTODOS PRIVADOS

  /**
   * Configura los efectos reactivos del componente
   */
  private setupEffects(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        if (this.isOpen() && this.messages().length === 0) {
          this.loadConversation();
        }
      });
    });
  }

  /**
   * Carga la conversación del usuario actual
   */
  private loadConversation(): void {
    this.chatbotService.getCurrentUserConversation().pipe(
      catchError(() => {
        this.addWelcomeMessage();
        return of([]);
      })
    ).subscribe((messages) => {
      if (messages.length > 0) {
        this._state.update(state => ({
          ...state,
          messages
        }));
        this.scrollToBottom();
      } else {
        this.addWelcomeMessage();
      }
    });
  }

  /**
   * Agrega el mensaje de bienvenida inicial
   */
  private addWelcomeMessage(): void {
    const welcomeMessage = this.createMessage(
      `¡Hola ${this.userName()}! Soy tu asistente virtual de MindHub. ¿En qué puedo ayudarte hoy?`,
      MessageType.CHATBOT
    );
    this._state.update(state => ({
      ...state,
      messages: [welcomeMessage]
    }));

    // Desplazar para mostrar el mensaje de bienvenida
    this.scrollToBottom();
  }

  /**
   * Crea un nuevo mensaje con la estructura correcta
   * @param content - Contenido del mensaje
   * @param type - Tipo de mensaje (usuario o chatbot)
   * @returns Objeto de mensaje completo
   */
  private createMessage(content: string, type: MessageType): ChatBotMessage {
    return {
      id: Date.now(),
      content,
      messageType: type,
      creationDate: new Date().toISOString(),
      sessionId: 'local',
      user: this.currentUser() || {} as User,
      chatBotName: 'ChatBot FCT'
    };
  }

  /** Desplaza el contenedor de mensajes hasta el final (si existe en el DOM) */
  private scrollToBottom(): void {
    try {
      setTimeout(() => {
        const el = this.chatMessagesRef?.nativeElement;
        if (el) {
          // desplazamiento suave hasta el final cuando sea posible
          if (typeof el.scrollTo === 'function') {
            try {
              el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            } catch {
              el.scrollTop = el.scrollHeight;
            }
          } else {
            el.scrollTop = el.scrollHeight;
          }
        }
      }, 50);
    } catch (e) {
    }
  }
}
