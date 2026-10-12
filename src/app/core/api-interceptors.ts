import type { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptors HTTP da aplicação. Vazio em produção: as chamadas vão direto para `/api/tokens`.
 * Em `npm run start:mock` este arquivo é trocado por `src/app/mock/api-interceptors.mock.ts`.
 */
export const apiInterceptors: HttpInterceptorFn[] = [];
