// src/app/core/services/api-url.service.ts

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class ApiUrlService {
  private apiUrl = environment.apiUrl;  // Environment'dan API URL'i alıyoruz

  constructor() { }

  // Verilen endpoint'e göre tam API URL'ini döndüren fonksiyon
  getUrl(endpoint: string): string {
    return `${this.apiUrl}/${endpoint}`;
  }
}
