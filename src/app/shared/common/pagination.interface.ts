// MODELO: Common - pagination (PaginatedResponse<T>)

/**
 * Interfaz genérica para respuestas paginadas.
 * Compatible con todas las interfaces de paginación existentes.
 * 
 * @template T - Tipo de contenido de la página
 */
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
