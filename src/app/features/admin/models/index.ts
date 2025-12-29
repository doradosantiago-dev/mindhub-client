// Barrel file: Admin Models
export * from './admin-action-response.interface';
export * from './report-request.interface';
export * from './report-response.interface';

// Re-export from other features for convenience
export type { User, Role } from '../../user/models';
export type { NotificationResponse } from '../../notification/data-access';

// Re-export enums from shared
export { ReportStatus, ActionType } from '../../../shared/models/enums/enums';
