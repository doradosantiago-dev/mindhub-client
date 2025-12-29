// HTTP INTERCEPTORS CONFIG: provideHttpClient con interceptores

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

// Configuración centralizada de interceptores HTTP y su orden
export const httpConfig = provideHttpClient(
  withInterceptors([authInterceptor, errorInterceptor])
);
