import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';  
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  constructor(private http:HttpClient, private apiUrlService: ApiUrlService) { }

  // Kayıt olma (Register) işlemi
  register(username: string, email: string, password: string): Observable<any> {
    const requestUrl = this.apiUrlService.getUrl('auth/register')
    const body = {
      username,
      email,
      password
    }

    return this.http.post(requestUrl, body, {
      headers: new HttpHeaders().set('Content-Type', 'application/json')
    });
  }

  // Giriş yapma (Login) işlemi
  login(email: string, password: string): Observable<any> {
    const requestUrl = this.apiUrlService.getUrl('auth/login')
    
    const body = {
      email:email,
      password:password
    }

    return this.http.post(requestUrl, body, {
      headers: new HttpHeaders().set('Content-Type', 'application/json')
    });
  }

  // JWT token'ı alınır (İstediğiniz işlemleri bu token ile yapabilirsiniz)
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // JWT token'ı kaydedin
  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  // Token'ı silin
  logout(): void {
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
