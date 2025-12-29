// MODELO: Report - ReportRequest (interface)

/**
 * Interfaz para crear un reporte de un post.
 * Alineada EXACTAMENTE con ReportRequest DTO del backend.
 */
export interface ReportRequest {
  reason: string;
  description?: string;
  postId: number;
}
