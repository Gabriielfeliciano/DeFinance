import type { HttpInterceptorFn } from '@angular/common/http';
import { mockTokensInterceptor } from './mock-tokens.interceptor';

export const apiInterceptors: HttpInterceptorFn[] = [mockTokensInterceptor];
