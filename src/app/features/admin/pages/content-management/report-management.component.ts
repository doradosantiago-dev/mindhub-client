// ADMIN: Gestión de Contenido — Componente (exports, lógica y hooks)

import { Component, effect, inject, OnDestroy, OnInit, signal, runInInjectionContext, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { AdminService } from '../../data-access/admin.service';
import { ReportService } from '../../data-access/report.service';
import { AdminListParams } from '../../data-access/admin.service';
import { ReportResponse as Report } from '../../models';
import { ReportActionsComponent } from './components/report-actions/report-actions.component';
import { ReportDetailModalComponent } from './components/report-detail-modal/report-detail-modal.component';
import { FooterComponent } from '@shared/components';

// INTERFACES
interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

interface SortInfo {
  field: string;
  direction: 'asc' | 'desc';
}

interface StatusOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-content-management',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    FormsModule,
    ReportActionsComponent,
    ReportDetailModalComponent,
    FooterComponent
  ],
  templateUrl: './report-management.component.html',
  styleUrls: ['./report-management.component.css']
})
export class ContentManagementComponent implements OnInit, OnDestroy {
  // INYECCIÓN DE SERVICIOS
  private readonly adminService = inject(AdminService);
  private readonly reportService = inject(ReportService);
  private readonly injector = inject(Injector);

  // SIGNALS DE ESTADO
  private readonly _reports = signal<Report[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedReport = signal<Report | null>(null);
  private readonly _showModal = signal<boolean>(false);

  // SIGNALS DE FILTROS
  private readonly _statusFilter = signal<string>('');
  private readonly _searchFilter = signal<string>('');
  private readonly _currentPage = signal<number>(0);

  // SIGNALS DE ESTADÍSTICAS
  private readonly _pendingCount = signal<number>(0);
  private readonly _resolvedCount = signal<number>(0);
  private readonly _rejectedCount = signal<number>(0);
  private readonly _totalCount = signal<number>(0);

  // SIGNALS DE PAGINACIÓN
  private readonly _totalPages = signal<number>(0);
  private readonly _totalElements = signal<number>(0);

  // SIGNALS COMPUTADOS
  readonly reports = this._reports.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedReport = this._selectedReport.asReadonly();
  readonly showModal = this._showModal.asReadonly();
  readonly statusFilter = this._statusFilter.asReadonly();
  readonly searchFilter = this._searchFilter.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();
  readonly totalElements = this._totalElements.asReadonly();
  readonly pendingCount = this._pendingCount.asReadonly();
  readonly resolvedCount = this._resolvedCount.asReadonly();
  readonly rejectedCount = this._rejectedCount.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();

  // CONSTANTES
  readonly statusOptions: StatusOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'PENDING', label: 'Pendientes' },
    { value: 'RESOLVED', label: 'Resueltos' },
    { value: 'REJECTED', label: 'Rechazados' }
  ];

  // SIGNALS PARA BÚSQUEDA
  private readonly _searchQuery = signal<string>('');

  // LIFECYCLE HOOKS
  ngOnInit(): void {
    this.loadReports();
    this.loadStatistics();
    this.setupSearchEffect();
  }

  ngOnDestroy(): void {
    // No hay subscripciones que limpiar con signals
  }

  // MÉTODOS PÚBLICOS

  /**
   * Carga los reportes con filtros aplicados
   */
  loadReports(): void {
    this._isLoading.set(true);
    this._error.set(null);

    const params: AdminListParams = {
      page: this._currentPage(),
      size: 50
    };

    if (this._searchFilter() && this._searchFilter().trim() !== '') {
      params.query = this._searchFilter();
    }

    this.adminService.getAllReports(params).pipe(
      catchError(error => {
        this._error.set('Error al cargar los reportes');
        return of({ content: [], totalElements: 0, totalPages: 0 });
      }),
      finalize(() => this._isLoading.set(false))
    ).subscribe(response => {
      let filteredReports = response.content;
      if (this._statusFilter() && this._statusFilter().trim() !== '') {
        filteredReports = response.content.filter(report =>
          report.status === this._statusFilter()
        );
      }

      this._reports.set(filteredReports);
      this._totalPages.set(response.totalPages);
      this._totalElements.set(response.totalElements);
      this.loadStatistics();
    });
  }

  /**
   * Actualiza el filtro de estado
   */
  onStatusFilterChange(status: string): void {
    this._statusFilter.set(status);
    this._currentPage.set(0);
    this.loadReports();
  }

  /**
   * Maneja el evento change del select de estado
   */
  handleStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.onStatusFilterChange(target.value);
    }
  }

  /**
   * Actualiza el filtro de búsqueda
   */
  onSearchFilterChange(search: string): void {
    this._searchQuery.set(search);
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    this._statusFilter.set('');
    this._searchQuery.set('');
    this._searchFilter.set('');
    this._currentPage.set(0);
    this.loadReports();
  }

  /**
   * Maneja el cambio de página
   */
  onPageChange(page: number): void {
    this._currentPage.set(page);
    this.loadReports();
  }

  /**
   * Obtiene los números de página para mostrar
   */
  getPageNumbers(): number[] {
    const current = this._currentPage();
    const total = this._totalPages();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 0; i < total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 0; i < 5; i++) pages.push(i);
        pages.push(-1, total - 1);
      } else if (current >= total - 4) {
        pages.push(0, -1);
        for (let i = total - 5; i < total; i++) pages.push(i);
      } else {
        pages.push(0, -1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1, total - 1);
      }
    }

    return pages;
  }

  /**
   * Verifica si hay página anterior
   */
  hasPreviousPage(): boolean {
    return this._currentPage() > 0;
  }

  /**
   * Verifica si hay página siguiente
   */
  hasNextPage(): boolean {
    return this._currentPage() < this._totalPages() - 1;
  }

  /**
   * Va a la página anterior
   */
  previousPage(): void {
    if (this.hasPreviousPage()) {
      this._currentPage.update(page => page - 1);
      this.loadReports();
    }
  }

  /**
   * Va a la página siguiente
   */
  nextPage(): void {
    if (this.hasNextPage()) {
      this._currentPage.update(page => page + 1);
      this.loadReports();
    }
  }

  /**
   * Va a una página específica
   */
  goToPage(page: number): void {
    if (page >= 0 && page < this._totalPages()) {
      this._currentPage.set(page);
      this.loadReports();
    }
  }

  /**
   * Abre el modal de detalles
   */
  openDetailModal(report: Report): void {
    this._selectedReport.set(report);
    this._showModal.set(true);
  }

  /**
   * Cierra el modal de detalles
   */
  closeModal(): void {
    this._showModal.set(false);
    this._selectedReport.set(null);
  }

  /**
   * Confirma una acción del modal
   */
  onConfirmAction(data: { action: string; reportId: number }): void {
    if (data.action === 'resolve') {
      this.resolveReport(data.reportId);
    } else if (data.action === 'reject') {
      this.rejectReport(data.reportId);
    }
    this.closeModal();
  }

  /**
   * Resuelve un reporte
   */
  resolveReport(reportId: number): void {
    this.reportService.resolveReport(reportId).pipe(
      catchError(error => {
        this._error.set('Error al resolver el reporte');
        return of({ message: 'Error' });
      })
    ).subscribe(() => {
      // Actualizar solo el reporte específico sin recargar la lista
      this._reports.update(reports =>
        reports.map(report =>
          report.id === reportId
            ? { ...report, status: 'RESOLVED' as any, reviewDate: new Date().toISOString().split('T')[0] }
            : report
        )
      );
      this.loadStatistics();
    });
  }

  /**
   * Rechaza un reporte
   */
  rejectReport(reportId: number): void {
    this.reportService.rejectReport(reportId).pipe(
      catchError(error => {
        this._error.set('Error al rechazar el reporte');
        return of({ message: 'Error' });
      })
    ).subscribe(() => {
      // Actualizar solo el reporte específico sin recargar la lista
      this._reports.update(reports =>
        reports.map(report =>
          report.id === reportId
            ? { ...report, status: 'REJECTED' as any, reviewDate: new Date().toISOString().split('T')[0] }
            : report
        )
      );
      this.loadStatistics();
    });
  }

  // MÉTODOS PRIVADOS

  /**
   * Configura el debounce para la búsqueda
   */
  private setupSearchEffect(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const searchTerm = this._searchQuery();
        if (searchTerm !== this._searchFilter()) {
          this._searchFilter.set(searchTerm);
          this._currentPage.set(0);
          this.loadReports();
        }
      });
    });
  }

  /**
   * Carga las estadísticas de reportes
   */
  private loadStatistics(): void {
    this.reportService.getReportsStatistics().subscribe({
      next: (stats) => {
        this._pendingCount.set(stats.reportesPendientes);
        this._resolvedCount.set(stats.reportesResueltos);
        this._rejectedCount.set(stats.reportesRechazados);
        this._totalCount.set(stats.totalReportes);
      },
      error: (error) => {
        this.setFallbackStatistics();
      }
    });
  }

  /**
   * Establece estadísticas de fallback desde datos locales
   */
  private setFallbackStatistics(): void {
    const reports = this._reports();
    const pending = reports.filter(r => r.status === 'PENDING').length;
    const resolved = reports.filter(r => r.status === 'RESOLVED').length;
    const rejected = reports.filter(r => r.status === 'REJECTED').length;

    this._pendingCount.set(pending);
    this._resolvedCount.set(resolved);
    this._rejectedCount.set(rejected);
    this._totalCount.set(reports.length);
  }
}
