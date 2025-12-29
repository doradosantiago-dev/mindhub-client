// Feed component — feed personal de publicaciones

import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { PostService } from '../../data-access/post.service';
import { AuthService } from '../../../auth';
import { CommentService } from '../../data-access/comment.service';
import { ReactionService, ReactionApiResponse } from '../../data-access/reaction.service';
import { ReportService } from '../../../admin/data-access/report.service';
import {
  User,
  PostResponse as Post,
  CommentResponse as Comment,
  ReactionResponse,
  ReactionType,
  PostWithInteractions,
  PrivacyType
} from '../../models';
import { CreatePostModalComponent } from '../post-creator/create-modal.component';
import { MyPostEditModalComponent } from '../post-editor/post-edit-modal/post-edit-modal.component';
import { MyPostDeleteModalComponent } from '../post-editor/post-delete-modal/post-delete-modal.component';
import { ReportModalComponent, ReportModalResult } from '../post-report/report-modal.component';
import { FooterComponent } from '@shared/components';
import { DateFormatPipe } from '@shared/pipes';

// INTERFACES Y TIPOS

/**
 * Configuración de paginación
 */
interface PaginationConfig {
  /** Tamaño de página */
  size: number;
  /** Página actual */
  page: number;
}

/**
 * Estado de carga del feed
 */
interface FeedLoadingState {
  /** Carga inicial */
  initial: boolean;
  /** Carga de más posts */
  more: boolean;
  /** Carga de comentarios */
  comments: boolean;
}

// COMPONENTE PRINCIPAL

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatMenuModule,
    MatSnackBarModule,
    FormsModule,
    MyPostDeleteModalComponent,
    FooterComponent,
    DateFormatPipe
  ],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})
export class FeedComponent implements OnInit, OnDestroy {

  // INYECCIONES DE DEPENDENCIAS

  private readonly postService = inject(PostService);
  private readonly commentService = inject(CommentService);
  private readonly reactionService = inject(ReactionService);
  private readonly reportService = inject(ReportService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  // PROPIEDADES PRIVADAS

  /** Subject para cancelar suscripciones */
  private readonly destroy$ = new Subject<void>();

  /** Estado local para comentarios expandidos */
  readonly expandedComments = new Set<number>();

  /** Posts con contenido expandido */
  expandedPosts = new Set<number>();

  /** Texto de nuevos comentarios por post */
  readonly newCommentText: { [key: number]: string } = {};

  currentMenuPost: PostWithInteractions | null = null;
  private readonly _showDeleteModal = signal<boolean>(false);
  private readonly _selectedPost = signal<PostWithInteractions | null>(null);
  readonly showDeleteModal = this._showDeleteModal.asReadonly();
  readonly selectedPost = this._selectedPost.asReadonly();

  // SIGNAL DE ESTADO CONSOLIDADO
  private readonly _state = signal<{
    posts: PostWithInteractions[];
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    hasMore: boolean;
    currentPage: number;
  }>({
    posts: [],
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: true,
    currentPage: 0
  });

  // SIGNALS COMPUTADOS PARA ACCESO ESPECÍFICO
  readonly posts = computed(() => this._state().posts);
  readonly loading = computed(() => this._state().loading);
  readonly loadingMore = computed(() => this._state().loadingMore);
  readonly error = computed(() => this._state().error);
  readonly hasMore = computed(() => this._state().hasMore);
  readonly currentPage = computed(() => this._state().currentPage);

  // VALORES COMPUTADOS
  readonly isEmpty = computed(() => !this.loading() && this.posts().length === 0);
  readonly isLoading = computed(() => this.loading() || this.loadingMore());

  // FILTRO (igual que en MyPosts)
  private readonly FILTER_LOAD_SIZE = 50;
  private readonly MAX_LOAD_SIZE = 1000;
  private readonly PAGE_SIZE = 10;

  private readonly _statusFilter = signal<PrivacyType | 'ALL'>('ALL');
  readonly statusFilter = this._statusFilter.asReadonly();

  // Cuando aplicamos filtro, cargamos todos los posts en memoria para paginar localmente
  private _filteredAllPosts: PostWithInteractions[] = [];

  readonly isLoadingFiltered = computed(() => this._statusFilter() !== 'ALL' && this.loading());

  // LIFECYCLE HOOKS

  ngOnInit(): void {
    this.loadFeed();
    // Agregar listener para cerrar comentarios al hacer clic fuera
    document.addEventListener('click', this.handleDocumentClick.bind(this));
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

  // MÉTODOS PÚBLICOS

  /**
   * Carga el feed inicial de posts
   */
  loadFeed(): void {
    this._state.update(s => ({ ...s, loading: true, error: null, currentPage: 0 }));

    const size = this._statusFilter() !== 'ALL' ? this.FILTER_LOAD_SIZE : this.PAGE_SIZE;

    this.postService.getPersonalFeed({ page: 0, size, sort: 'newest' }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (this._statusFilter() !== 'ALL') {
          this.processFilteredPosts(response.content);
        } else {
          this._state.update(s => ({
            ...s,
            posts: response.content,
            hasMore: response.totalPages > 1,
            currentPage: 1,
            loading: false
          }));
          this.loadUserReactions();
        }
      },
      error: () => {
        this._state.update(s => ({ ...s, error: 'Error al cargar el feed', loading: false }));
      }
    });
  }

  /**
   * Carga más posts para paginación infinita
   */
  loadMorePosts(): void {
    if (this.loadingMore() || !this.hasMore()) return;

    // Si hay un filtro activo, paginar sobre los posts ya cargados
    if (this._statusFilter() !== 'ALL') {
      this._state.update(s => ({ ...s, loadingMore: true }));
      const nextPage = this.currentPage();
      const start = (nextPage) * this.PAGE_SIZE;
      const end = start + this.PAGE_SIZE;
      const chunk = this._filteredAllPosts.slice(start, end);
      this._state.update(s => ({
        ...s,
        posts: [...s.posts, ...chunk],
        hasMore: end < this._filteredAllPosts.length,
        currentPage: nextPage + 1,
        loadingMore: false
      }));
      this.loadUserReactions();
      return;
    }

    this._state.update(s => ({ ...s, loadingMore: true }));
    const nextPage = this.currentPage();

    this.postService.getPersonalFeed({ page: nextPage, size: this.PAGE_SIZE, sort: 'newest' }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this._state.update(s => ({
          ...s,
          posts: [...s.posts, ...response.content],
          hasMore: nextPage + 1 < response.totalPages,
          currentPage: nextPage + 1,
          loadingMore: false
        }));
        this.loadUserReactions();
      },
      error: () => {
        this._state.update(s => ({ ...s, loadingMore: false }));
      }
    });
  }

  /** Cambia el filtro de privacidad del feed */
  onStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const status = target.value as PrivacyType | 'ALL';
    this._statusFilter.set(status);
    this._state.update(s => ({ ...s, posts: [], hasMore: true, currentPage: 0 }));
    this._filteredAllPosts = [];
    this.loadFeed();
  }

  /** Procesa posts cargados para filtrado local y preparar paginación interna */
  private processFilteredPosts(posts: PostWithInteractions[]): void {
    this._filteredAllPosts = posts.filter(p => p.privacyType === this._statusFilter());
    const pageSlice = this._filteredAllPosts.slice(0, this.PAGE_SIZE);
    this._state.update(s => ({ ...s, posts: pageSlice, hasMore: this._filteredAllPosts.length > this.PAGE_SIZE, currentPage: 1, loading: false }));
    this.loadUserReactions();
  }

  /**
   * Obtiene el nombre de visualización del usuario
   */
  getUserDisplayName(user: User | null | undefined): string {
    if (!user) {
      return 'Usuario no disponible';
    }
    return `${user.firstName} ${user.lastName}`;
  }

  /**
   * Obtiene la URL de la imagen de perfil del usuario
   */
  getProfilePictureUrl(user: User | null | undefined): string {
    if (!user?.profilePicture) {
      return '/assets/default-avatar.png';
    }
    return user.profilePicture;
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

    // Para textos sin muchos saltos de línea, solo truncar si claramente excede 4 líneas
    // Usamos 360 caracteres como límite (90 caracteres por línea x 4 líneas)
    // Esto da margen para evitar truncar contenido que cabe en 4 líneas
    return content.length > 360;
  }

  /**
   * Alterna la visibilidad de los comentarios de un post
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
   * Agrega un comentario a un post
   */
  addComment(postId: number): void {
    const post = this.posts().find(p => p.id === postId);
    if (!post || !this.newCommentText[postId]?.trim()) return;

    post.isAddingComment = true;
    const commentText = this.newCommentText[postId];

    this.commentService.create({
      content: commentText,
      postId: postId
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
        post.isAddingComment = false;
      },
      error: () => {
        post.isAddingComment = false;
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
    const currentUser = this.authService.getCurrentUser();
    return currentUser ? comment.author.id === currentUser.id : false;
  }

  /**
   * Alterna el like de un post
   */
  toggleLike(postId: number): void {
    const post = this.posts().find(p => p.id === postId);
    if (!post || post.isProcessingLike) return;

    post.isProcessingLike = true;

    if (post.userReaction?.reactionType === 'LIKE') {
      this.reactionService.removeReaction(postId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          post.userReaction = undefined;
          post.likeCount = Math.max(0, (post.likeCount || 1) - 1);
          post.isProcessingLike = false;
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
          }
          post.isProcessingLike = false;
        },
        error: () => {
          post.isProcessingLike = false;
        }
      });
    }
  }

  /**
   * Verifica si un post pertenece al usuario actual
   */
  isOwnPost(post: Post): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.id === post.author?.id;
  }

  /**
   * Reporta un post
   */
  reportPost(postId: number): void {
    const post = this.posts().find(p => p.id === postId);
    if (!post) return;

    const dialogRef = this.dialog.open(ReportModalComponent, {
      width: '500px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        postId: postId,
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
   * Maneja errores de carga de imagen
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const parent = img.parentElement;
    if (parent) {
      parent.innerHTML = '<mat-icon>person</mat-icon>';
    }
  }

  /**
   * Maneja el scroll para cargar más posts
   */
  onScroll(): void {
    this.loadMorePosts();
  }

  /** Abre el modal de creación de posts */
  openCreatePostModal(): void {
    const dialogRef = this.dialog.open(CreatePostModalComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Recargar el feed completo para obtener el orden cronológico correcto del servidor
        // Esto asegura que tanto tus publicaciones como las de usuarios que sigues
        // estén ordenadas por fecha de creación (más recientes primero)
        this.loadFeed();
      }
    });
  }

  /** Abre el modal de edición de un post */
  openEditModal(post: PostWithInteractions | null | undefined): void {
    if (!post) return;
    const ref = this.dialog.open(MyPostEditModalComponent, {
      width: '700px',
      maxWidth: '95vw',
      disableClose: true,
      data: { post }
    });

    // Subcribir a los eventos emitidos por el componente del modal
    const inst: any = ref.componentInstance;
    if (inst.postUpdated && inst.postUpdated.subscribe) {
      inst.postUpdated.subscribe(() => {
        ref.close();
        this.loadFeed();
      });
    }
    if (inst.modalClosed && inst.modalClosed.subscribe) {
      inst.modalClosed.subscribe(() => ref.close());
    }
  }

  /** Abre el modal de eliminación de un post */
  openDeleteModal(post: PostWithInteractions | null | undefined): void {
    // legacy dialog method — keep for backward compatibility but prefer inline modal
    if (!post) return;
    this._selectedPost.set(post);
    this._showDeleteModal.set(true);
  }

  /** Llamado cuando el modal de eliminación en línea emite que el post fue eliminado */
  onInlinePostDeleted(): void {
    this._showDeleteModal.set(false);
    this._selectedPost.set(null);
    this.loadFeed();
  }

  /** Llamado cuando el modal de eliminación en línea se cierra sin eliminar */
  onInlineModalClosed(): void {
    this._showDeleteModal.set(false);
    this._selectedPost.set(null);
  }

  // MÉTODOS PRIVADOS

  /**
   * Carga las reacciones del usuario para todos los posts
   */
  private loadUserReactions(): void {
    this.posts().forEach(post => {
      if (!post.userReaction) {
        this.reactionService.getMyReaction(post.id).pipe(
          takeUntil(this.destroy$)
        ).subscribe(reaction => {
          post.userReaction = reaction || undefined;
        });
      }
    });
  }

  /**
   * Carga los comentarios de un post específico
   */
  private loadComments(postId: number): void {
    const post = this.posts().find(p => p.id === postId);
    if (post) {
      // Siempre cargar comentarios, aunque ya existan (para refrescar)
      this.commentService.getPostComments(postId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (response) => {
          post.comments = response.content || [];
        },
        error: (error) => {
          console.error('Error al cargar comentarios:', error);
          // No cerrar la sección, solo inicializar vacío si es necesario
          if (!post.comments) {
            post.comments = [];
          }
        }
      });
    }
  }
}
