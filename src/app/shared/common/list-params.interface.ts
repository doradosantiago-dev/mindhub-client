// MODELO: Common - list params (interfaces)

/**
 * Parámetros base para todas las listas paginadas.
 * Contiene los parámetros comunes a todas las consultas.
 */
export interface BaseListParams {
  page?: number;

  size?: number;
}

/**
 * Parámetros para listas que soportan ordenamiento.
 * Extiende BaseListParams con funcionalidad de ordenamiento.
 */
export interface SortableListParams extends BaseListParams {
  sort?: string;
}

/**
 * Parámetros para listas que soportan búsqueda.
 * Extiende SortableListParams con funcionalidad de búsqueda.
 * 
 * IMPORTANTE: Usamos 'query' para mantener compatibilidad con código existente.
 */
export interface SearchableListParams extends SortableListParams {
  query?: string;
}
