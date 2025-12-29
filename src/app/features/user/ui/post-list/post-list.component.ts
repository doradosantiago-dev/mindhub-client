// MyPostsList component — lista paginada de mis publicaciones

import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostResponse as Post } from '../../models';
import { MyPostCardComponent } from '../post-card/post-card.component';
import { PaginationComponent } from '@shared/components';
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-my-posts-list',
  standalone: true,
  imports: [CommonModule, MyPostCardComponent, PaginationComponent],
  templateUrl: './post-list.component.html',
  styleUrls: ['./post-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyPostsListComponent {
  // INPUTS Y OUTPUTS

  readonly posts = input.required<Post[]>();
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly canGoNext = input.required<boolean>();
  readonly canGoPrevious = input.required<boolean>();

  readonly pageChange = output<number>();
  readonly editPost = output<Post>();
  readonly deletePost = output<Post>();

  // VALORES COMPUTADOS

  readonly pageNumbers = computed(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: number[] = [];

    const start = Math.max(0, current - 2);
    const end = Math.min(total - 1, current + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  });

  readonly startIndex = computed(() =>
    this.currentPage() * this.pageSize() + 1
  );

  readonly endIndex = computed(() =>
    Math.min((this.currentPage() + 1) * this.pageSize(), this.totalElements())
  );

  readonly hasPosts = computed(() =>
    this.posts().length > 0
  );

  readonly showPagination = computed(() =>
    this.totalPages() > 1
  );

  // MÉTODOS PÚBLICOS

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onEditPost(post: Post): void {
    this.editPost.emit(post);
  }

  onDeletePost(post: Post): void {
    this.deletePost.emit(post);
  }
}
