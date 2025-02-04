import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth-service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { GlobalErrorComponent } from '../../shared/components/global-error/global-error.component';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  let clonedReq = req;
  if (token) {
    clonedReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        console.warn("Token geçersiz! Kullanıcı login sayfasına yönlendiriliyor...");
        authService.logout(); // Tokeni temizle
        router.navigate(['/login']); // Login sayfasına yönlendir
      }
      // Display global error message
      console.log(error)
      GlobalErrorComponent.errorSubject.next('Bir hata oluştu: ' + ((error.error.message) ? error.error.message : error.message));
      return throwError(() => error);
    })
  );
};
