// MODELO: Report - ReportResponse (interface)

import { User } from '../../user/models/user-response.interface';
import { ReportStatus } from '../../../shared/models/enums/enums';
import { PostSummaryResponse } from '../../user/models/post-response.interface';

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
