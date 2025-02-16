import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { User } from '../models/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})

export class AuthService {

  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService, private router: Router) {

  }

  initializeAuthState() {
    if (this.isLoggedIn()) {
      this.getLoginedUserData()?.subscribe({
        next: (user) => this.userSubject.next(user),
        error: () => this.logout(),
      });
    }
  }

  getLoginedUserData() {
    if (this.isLoggedIn()) {
      return this.http.get<User>(this.apiUrlService.getUrl('auth/me'))
    } else {
      this.logout();
      return null
    }
  }

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

  // login metodunu bu şekilde düzenleyin
  login(email: string, password: string): Observable<User> {
    const requestUrl = this.apiUrlService.getUrl('auth/login');

    return this.http.post<{ user: User, token: string }>(requestUrl, {
      email,
      password
    }).pipe(
      tap(response => {
        this.setToken(response.token); // Token'ı service içinde sakla
        this.userSubject.next(response.user); // Sadece user bilgisini subject'e aktar
      }),
      map(response => response.user) // Component'e sadece user dön
    );
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
    this.userSubject.next(null); // Tüm component'lere null yayınla
    this.router.navigate(['/login']); // İsteğe bağlı: Login sayfasına yönlendir
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }
}
