/**
 * Componente de paginación reutilizable
 * Implementa un control de paginación con navegación y números de página
 */

import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagination-container" *ngIf="totalPages() > 1">
      <!-- Botón Anterior -->
      <button 
        mat-icon-button
        (click)="onPrevious()"
        [disabled]="!hasPreviousPage() || isLoading()"
        class="pagination-btn"
        aria-label="Página anterior">
        <mat-icon>chevron_left</mat-icon>
      </button>

      <!-- Números de página -->
      <div class="page-numbers">
        @for (pageNum of visiblePages(); track pageNum) {
          @if (pageNum === -1) {
            <span class="page-ellipsis">...</span>
          } @else {
            <button
              mat-button
              [class.active]="pageNum === currentPage()"
              [disabled]="isLoading()"
              (click)="onPageChange(pageNum)"
              class="page-number"
              [attr.aria-label]="'Ir a página ' + (pageNum + 1)"
              [attr.aria-current]="pageNum === currentPage() ? 'page' : null">
              {{ pageNum + 1 }}
            </button>
          }
        }
      </div>

      <!-- Botón Siguiente -->
      <button 
        mat-icon-button
        (click)="onNext()"
        [disabled]="!hasNextPage() || isLoading()"
        class="pagination-btn"
        aria-label="Página siguiente">
        <mat-icon>chevron_right</mat-icon>
      </button>

      <!-- Información de página -->
      @if (showInfo()) {
        <span class="page-info">
          Página {{ currentPage() + 1 }} de {{ totalPages() }}
          @if (showTotalElements() && totalElements() > 0) {
            <span class="total-elements">({{ totalElements() }} elementos)</span>
          }
        </span>
      }
    </div>
  `,
  styles: [`
    .pagination-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      flex-wrap: wrap;
    }

    .page-numbers {
      display: flex;
      gap: 0.25rem;
      align-items: center;
    }

    .page-number {
      min-width: 40px;
      height: 40px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .page-number.active {
      background-color: #3b82f6;
      color: white;
      font-weight: 600;
    }

    .page-number:not(.active):hover:not(:disabled) {
      background-color: #e0e7ff;
    }

    .page-ellipsis {
      padding: 0 0.5rem;
      color: #6b7280;
    }

    .pagination-btn {
      transition: all 0.2s ease;
    }

    .pagination-btn:not(:disabled):hover {
      background-color: #e0e7ff;
    }

    .page-info {
      margin-left: 1rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .total-elements {
      margin-left: 0.25rem;
      font-weight: 500;
    }

    @media (max-width: 640px) {
      .pagination-container {
        flex-direction: column;
        gap: 0.75rem;
      }

      .page-info {
        margin-left: 0;
      }
    }
  `]
})
export class PaginationComponent {
  // INPUTS
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input<number>(0);
  readonly isLoading = input<boolean>(false);
  readonly showInfo = input<boolean>(true);
  readonly showTotalElements = input<boolean>(false);
  readonly maxVisiblePages = input<number>(5);

  // OUTPUTS
  readonly pageChange = output<number>();
  readonly previous = output<void>();
  readonly next = output<void>();

  // COMPUTED VALUES
  readonly hasPreviousPage = computed(() => this.currentPage() > 0);
  readonly hasNextPage = computed(() => this.currentPage() < this.totalPages() - 1);

  /**
   * Calcula los números de página visibles con elipsis
   */
  readonly visiblePages = computed(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    const maxVisible = this.maxVisiblePages();

    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i);
    }

    const start = Math.max(0, current - Math.floor(maxVisible / 2));
    const end = Math.min(total, start + maxVisible);
    const pages: number[] = [];

    // Primera página
    if (start > 0) {
      pages.push(0);
      if (start > 1) {
        pages.push(-1); // Ellipsis
      }
    }

    // Páginas del rango
    for (let i = start; i < end; i++) {
      pages.push(i);
    }

    // Última página
    if (end < total) {
      if (end < total - 1) {
        pages.push(-1); // Ellipsis
      }
      pages.push(total - 1);
    }

    return pages;
  });

  // MÉTODOS
  onPageChange(page: number): void {
    if (page !== this.currentPage() && !this.isLoading()) {
      this.pageChange.emit(page);
    }
  }

  onPrevious(): void {
    if (this.hasPreviousPage() && !this.isLoading()) {
      this.previous.emit();
      this.pageChange.emit(this.currentPage() - 1);
    }
  }

  onNext(): void {
    if (this.hasNextPage() && !this.isLoading()) {
      this.next.emit();
      this.pageChange.emit(this.currentPage() + 1);
    }
  }
}
