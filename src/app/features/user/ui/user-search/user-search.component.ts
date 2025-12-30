// UserFeed component — public feed for a specific user

import { Component, computed, inject, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../data-access/user.service';
import { PostService } from '../../data-access/post.service';
import { FollowService } from '../../data-access/follow.service';
import { CommentService } from '../../data-access/comment.service';
import { ReactionService, ReactionApiResponse } from '../../data-access/reaction.service';
import { ReportService } from '../../../admin/data-access/report.service';
import {
  PostResponse as Post,
  CommentResponse as Comment,
  ReactionResponse as Reaction,
  ReactionType,
  ReactionResponse,
  UserWithFollow,
  PostWithInteractions
} from '../../models';
import { DateFormatPipe } from '@shared/pipes';
import { ReportModalComponent, ReportModalResult } from '../post-report/report-modal.component';

// COMPONENTE PRINCIPAL

@Component({
  selector: 'app-user-feed',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatSnackBarModule,
    FormsModule,
    DateFormatPipe
  ],
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.css']
})
export class UserFeedComponent implements OnDestroy {
  // INYECCIONES DE DEPENDENCIAS

  /** Servicio de rutas activas */
  private readonly route = inject(ActivatedRoute);

  /** Servicio de navegación */
  private readonly router = inject(Router);

  /** Servicio de usuarios */
  private readonly userService = inject(UserService);

  // ===== DESTROY SUBJECT =====
  private readonly destroy$ = new Subject<void>();

  /** Servicio de publicaciones */
  private readonly postService = inject(PostService);

  /** Servicio de seguimiento */
  private readonly followService = inject(FollowService);

  /** Servicio de comentarios */
  private readonly commentService = inject(CommentService);

  /** Servicio de reacciones */
  private readonly reactionService = inject(ReactionService);

  /** Servicio de reportes */
  private readonly reportService = inject(ReportService);

  /** Servicio de diálogos */
  private readonly dialog = inject(MatDialog);

  /** Servicio de notificaciones */
  private readonly snackBar = inject(MatSnackBar);

  // SIGNALS PRIVADOS PARA ESTADO INTERNO

  /** Estado consolidado del componente */
  private readonly _state = signal<{
    user: UserWithFollow | null;
    posts: PostWithInteractions[];
    loading: boolean;
    postsLoading: boolean;
    error: string | null;
    currentUserId: number | null;
  }>({
    user: null,
    posts: [],
    loading: false,
    postsLoading: false,
    error: null,
    currentUserId: null
  });

  // ESTADO LOCAL PARA COMENTARIOS

  /** Conjunto de IDs de publicaciones con comentarios expandidos */
  expandedComments = new Set<number>();

  /** Posts con contenido expandido */
  expandedPosts = new Set<number>();

  /** Texto de nuevos comentarios por ID de publicación */
  newCommentText: { [key: number]: string } = {};

  // SIGNALS PÚBLICOS (READONLY)

  /** Usuario del perfil (solo lectura) */
  readonly user = computed(() => this._state().user);

  /** Publicaciones del usuario (solo lectura) */
  readonly posts = computed(() => this._state().posts);

  /** Estado de carga del perfil (solo lectura) */
  readonly loading = computed(() => this._state().loading);

  /** Estado de carga de publicaciones (solo lectura) */
  readonly postsLoading = computed(() => this._state().postsLoading);

  /** Mensaje de error (solo lectura) */
  readonly error = computed(() => this._state().error);

  /** ID del usuario actual (solo lectura) */
  readonly currentUserId = computed(() => this._state().currentUserId);

  // VALORES COMPUTADOS

  /**
   * Indica si el usuario del perfil es el usuario actual
   */
  readonly isCurrentUser = computed(() => {
    return this._state().user?.id === this._state().currentUserId;
  });

  // CONSTRUCTOR Y CICLO DE VIDA

  constructor() {
    this.setupRouteSubscription();
    this.loadCurrentUser();
    // Agregar listener para cerrar comentarios al hacer clic fuera
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  // MÉTODOS PÚBLICOS

  /**
   * Obtiene el nombre completo del usuario para mostrar
   * @returns Nombre completo del usuario o cadena vacía
   */
  getUserDisplayName(): string {
    const user = this._state().user;
    return user ? `${user.firstName} ${user.lastName}` : '';
  }

  /**
   * Sigue al usuario del perfil
   */
  followUser(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) return;

    this.followService.followUser({ userId: +userId }).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this._state.update(s => ({
        ...s,
        user: s.user ? { ...s.user, isFollowing: true } : null
      }));
    });
  }

  /**
   * Deja de seguir al usuario del perfil
   */
  unfollowUser(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) return;

    this.followService.unfollowUser(+userId).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this._state.update(s => ({
        ...s,
        user: s.user ? { ...s.user, isFollowing: false } : null
      }));
    });
  }

  /**
   * Navega al perfil del usuario actual
   */
  goToMyProfile(): void {
    this.router.navigate(['/dashboard/profile']);
  }

  /**
   * Alterna la expansión del contenido de un post
   */
  togglePostExpanded(postId: number): void {
    const newSet = new Set(this.expandedPosts);
    if (newSet.has(postId)) {
      newSet.delete(postId);
    } else {
      newSet.add(postId);
    }
    this.expandedPosts = newSet;
  }

  /**
   * Verifica si el contenido del post necesita truncarse
   */
  shouldTruncatePost(content: string): boolean {
    if (!content) return false;

    // Contar saltos de línea explícitos
    const explicitLines = content.split('\n').length;
    if (explicitLines > 4) return true;

    // Para textos sin muchos saltos de línea, usar un límite más alto
    // Considerando ~120 caracteres por línea con wrapping natural
    // 4 líneas x 120 = 480 caracteres
    return content.length > 480;
  }

  /**
   * Alterna la visibilidad de comentarios de una publicación
   * @param postId - ID de la publicación
   */
  toggleComments(postId: number): void {
    if (this.expandedComments.has(postId)) {
      this.expandedComments.delete(postId);
    } else {
      this.expandedComments.add(postId);
      this.loadComments(postId);
    }
  }

  /**
   * Agrega un nuevo comentario a una publicación
   * @param postId - ID de la publicación
   */
  addComment(postId: number): void {
    const post = this.posts().find(p => p.id === postId);
    const text = this.newCommentText[postId]?.trim();
    if (!post || !text) return;

    this.commentService.create({
      postId,
      content: text
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (comment) => {
        post.commentCount = (post.commentCount || 0) + 1;

        if (this.expandedComments.has(postId)) {
          if (!post.comments) {
            post.comments = [];
          }
          post.comments.push(comment);
        }

        this.newCommentText[postId] = '';
        // Forzar actualización del state
        this._state.update(s => ({ ...s, posts: [...s.posts] }));
      },
      error: (error) => {

      }
    });
  }

  /**
   * Elimina un comentario de una publicación
   * @param postId - ID de la publicación
   * @param commentId - ID del comentario a eliminar
   */
  deleteComment(postId: number, commentId: number): void {
    const post = this.posts().find(p => p.id === postId);
    if (!post || !post.comments) return;

    this.commentService.delete(commentId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // Eliminar el comentario del array local
        post.comments = post.comments!.filter(c => c.id !== commentId);
        // Decrementar el contador de comentarios
        post.commentCount = Math.max(0, (post.commentCount || 1) - 1);
        // Forzar actualización del state
        this._state.update(s => ({ ...s, posts: [...s.posts] }));
      },
      error: (error) => {
        console.error('Error al eliminar comentario:', error);
      }
    });
  }

  /**
   * Verifica si el usuario actual es el autor del comentario
   * @param comment - El comentario a verificar
   * @returns true si el usuario actual es el autor
   */
  isCommentAuthor(comment: Comment): boolean {
    return comment.author.id === this._state().currentUserId;
  }

  /**
   * Alterna el like de una publicación
   * @param postId - ID de la publicación
   */
  toggleLike(postId: number): void {
    const post = this.posts().find(p => p.id === postId);
    if (!post) return;

    if (post.isProcessingLike) return;
    post.isProcessingLike = true;

    if (post.userReaction?.reactionType === 'LIKE') {
      this.reactionService.removeReaction(postId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          post.userReaction = undefined;
          post.likeCount = Math.max(0, (post.likeCount || 1) - 1);
          post.isProcessingLike = false;
          // Forzar actualización del state
          this._state.update(s => ({ ...s, posts: [...s.posts] }));
        },
        error: () => {
          post.isProcessingLike = false;
        }
      });
    } else {
      this.reactionService.reactToPost(postId, ReactionType.LIKE).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (response: ReactionResponse | ReactionApiResponse) => {
          if ('id' in response) {
            post.userReaction = response as ReactionResponse;
            post.likeCount = (post.likeCount || 0) + 1;
          } else if ('message' in response && response.message) {
          }
          post.isProcessingLike = false;
          // Forzar actualización del state
          this._state.update(s => ({ ...s, posts: [...s.posts] }));
        },
        error: () => {
          post.isProcessingLike = false;
        }
      });
    }
  }

  /**
   * Reporta una publicación inapropiada
   * @param postId - ID de la publicación a reportar
   */
  reportPost(postId: number): void {
    const post = this.posts().find(p => p.id === postId);
    if (!post) return;

    const dialogRef = this.dialog.open(ReportModalComponent, {
      width: '500px',
      data: {
        postId: post.id,
        postContent: post.content
      }
    });

    dialogRef.afterClosed().pipe(
      takeUntil(this.destroy$)
    ).subscribe((result: ReportModalResult | undefined) => {
      if (result) {
        this.reportService.create({
          postId: result.postId,
          reason: result.reason,
          description: result.description
        }).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => {
            // Reporte exitoso, no mostrar mensaje
          },
          error: (error) => {
            const errorMessage = error?.error?.message || error?.message || '';
            if (errorMessage.toLowerCase().includes('ya has reportado') ||
              errorMessage.toLowerCase().includes('already reported')) {
              this.snackBar.open('⚠️ Ya has reportado esta publicación anteriormente', 'Cerrar', {
                duration: 5000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
                panelClass: ['custom-report-snackbar']
              });
            }
          }
        });
      }
    });
  }

  /**
   * Maneja errores de carga de imágenes
   * @param event - Evento de error de imagen
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/default-avatar.png';
  }

  // MÉTODOS PRIVADOS

  /**
   * Configura la suscripción a cambios de ruta
   */
  private setupRouteSubscription(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const newUserId = params['id'];
      if (newUserId && newUserId !== this._state().user?.id?.toString()) {
        this.loadUserData();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Limpiar listener
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
  }

  /**
   * Maneja clics en el documento para cerrar comentarios
   */
  private handleDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Verificar si el clic fue fuera de la sección de comentarios
    const commentsSection = target.closest('.comments-section');
    const commentsButton = target.closest('[aria-expanded]');

    if (!commentsSection && !commentsButton && this.expandedComments.size > 0) {
      // Cerrar todos los comentarios expandidos y limpiar texto
      this.expandedComments.forEach(postId => {
        this.newCommentText[postId] = '';
      });
      this.expandedComments.clear();
    }
  }

  /**
   * Carga la información del usuario actual
   */
  private loadCurrentUser(): void {
    this.userService.getCurrentUser().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (currentUser) => {
        this._state.update(s => ({ ...s, currentUserId: currentUser.id }));
        // Now load the profile data
        this.loadUserData();
      },
      error: () => {
        // Si no puede obtener el usuario actual, continuar sin él
        this.loadUserData();
      }
    });
  }

  /**
   * Carga los datos del usuario del perfil
   */
  loadUserData(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) {
      this._state.update(s => ({ ...s, error: 'ID de usuario no válido' }));
      return;
    }

    this._state.update(s => ({ ...s, loading: true, error: null }));

    this.userService.getUserById(+userId).subscribe({
      next: (user) => {
        this._state.update(s => ({ ...s, user, loading: false }));
        this.loadUserPosts();
        this.checkFollowStatus();
      },
      error: (error) => {
        this._state.update(s => ({ ...s, error: 'Error al cargar el perfil del usuario', loading: false }));
      }
    });
  }

  /**
   * Carga las publicaciones del usuario
   */
  private loadUserPosts(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) return;

    this._state.update(s => ({ ...s, postsLoading: true }));
    const currentUserId = this._state().currentUserId;
    const useMe = (currentUserId && currentUserId === +userId);

    const posts$ = useMe
      ? this.postService.getMyPosts({ sort: 'newest' })
      : this.postService.getUserPosts(+userId, { sort: 'newest' });

    posts$.subscribe({
      next: (response) => {
        this._state.update(s => ({ ...s, posts: response.content, postsLoading: false }));
        this.loadUserReactions();
      },
      error: (err) => {
        this._state.update(s => ({ ...s, postsLoading: false }));
      }
    });
  }

  /**
   * Carga las reacciones del usuario a los posts
   */
  private loadUserReactions(): void {
    this._state().posts.forEach(post => {
      this.reactionService.getMyReaction(post.id).subscribe(reaction => {
        post.userReaction = reaction || undefined;
      });
    });
  }

  /**
   * Verifica el estado de seguimiento del usuario
   */
  private checkFollowStatus(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId || this.isCurrentUser()) return;

    this.followService.checkFollow(+userId).subscribe(isFollowing => {
      this._state.update(s => ({
        ...s,
        user: s.user ? { ...s.user, isFollowing } : null
      }));
    });
  }

  /**
   * Carga los comentarios de una publicación específica
   * @param postId - ID de la publicación
   */
  private loadComments(postId: number): void {
    const post = this.posts().find(p => p.id === postId);
    if (post && !post.comments) {
      // Siempre cargar comentarios, aunque ya existan (para refrescar)
      this.commentService.getPostComments(postId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (response) => {
          post.comments = response.content || [];
          // Forzar actualización del state para detectar cambios
          this._state.update(s => ({ ...s, posts: [...s.posts] }));
        },
        error: (error) => {
          console.error('Error al cargar comentarios:', error);
          // No cerrar la sección, solo inicializar vacío si es necesario
          if (!post.comments) {
            post.comments = [];
          }
          // Forzar actualización incluso en error
          this._state.update(s => ({ ...s, posts: [...s.posts] }));
        }
      });
    }
  }

  /**
   * Actualiza el contador de comentarios de una publicación
   * @param postId - ID de la publicación
   * @param increment - Incremento a aplicar
   */
  private updateCommentCount(postId: number, increment: number): void {
    const post = this.posts().find(p => p.id === postId);
    if (post) {
      post.commentCount = (post.commentCount || 0) + increment;
    }
  }
}
