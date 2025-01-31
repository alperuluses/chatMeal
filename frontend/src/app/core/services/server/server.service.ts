import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../api-url.service';
import { ServerResponse } from '../../models/server.model';


@Injectable({
  providedIn: 'root'
})
export class ServerService {
  constructor(private http: HttpClient, private apiUrlService:ApiUrlService) {}

  // Token içeren HTTP başlığını oluştur
  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  // 🎯 Sunucu oluşturma isteği
  createServer(name: string): Observable<any> {
    const requestUrl = this.apiUrlService.getUrl('server/create');
    return this.http.post(requestUrl, { name }, { headers: this.getAuthHeaders() });
  }

  // 🎯 Kullanıcının tüm sunucularını getir
  getServers(): Observable<ServerResponse> {
    const requestUrl = this.apiUrlService.getUrl('server/all');
    return this.http.get<ServerResponse>(requestUrl, { headers: this.getAuthHeaders() });
  }
}
