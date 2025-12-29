// MODELO: Common - ApiResponse<T> (interface)

/**
 * Interfaz genérica para respuestas estándar de la API.
 * Compatible con todas las interfaces de respuesta API existentes.
 * 
 * @template T - Tipo de datos de la respuesta (opcional)
 */
export interface ApiResponse<T = any> {
  message: string;
  success: boolean;
  data?: T;
}
