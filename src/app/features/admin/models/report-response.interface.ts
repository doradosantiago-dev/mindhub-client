// MODELO: Report - ReportResponse (interface)

import { User } from '../user/user-response.interface';
import { ReportStatus } from '../enums';
import { PostSummaryResponse } from '../post/post-response.interface';

/**
 * Interfaz que representa un reporte de un post.
 * Alineada EXACTAMENTE con ReportResponse DTO del backend.
 */
export interface ReportResponse {
  id: number;
  reason: string;
  description?: string;
  status: ReportStatus;
  reportDate: string;
  reviewDate?: string;
  reporter: User;
  post: PostSummaryResponse;
}
