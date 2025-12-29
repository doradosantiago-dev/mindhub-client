// MODELO: Follow - FollowResponse / FollowStats (interfaces)

/**
 * Interfaz que representa una relación de follow.
 * Alineada EXACTAMENTE con FollowResponse DTO del backend.
 */
export interface FollowResponse {
  id: number;
  followerId: number;
  followerUsername: string;
  followerName: string;
  followerProfilePicture?: string;
  followedId: number;
  followedUsername: string;
  followedName: string;
  followedProfilePicture?: string;
  followDate: string;
}

/**
 * Interfaz que representa estadísticas de follow.
 * Alineada EXACTAMENTE con FollowStats DTO del backend.
 */
export interface FollowStats {
  followers: number;
  followed: number;
  follows: boolean;
  followsYou: boolean;
}

/**
 * Interfaz que representa estadísticas de follow por usuario.
 * Alineada EXACTAMENTE con FollowStatsResponse DTO del backend.
 */
export interface FollowStatsResponse {
  id: number;
  username: string;
  followers: number;
  followed: number;
  follows: boolean;
  followsYou: boolean;
}
