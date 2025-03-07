// src/app/core/services/api-url.service.ts

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

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

  getPureUrl(key: string, dynamicParams: Record<string, string> = {}): string {
    let url = environment[key as keyof typeof environment] as string;
    console.log('URL:',url);
    if (dynamicParams) {
      for (const [key, value] of Object.entries(dynamicParams)) {
        url = url.replace(`\${${key}}`, value);
        console.log('Dynamic URL:',url, dynamicParams,key,value,`\${${key}}`);
      }

      
    }
    return url;
  }
}
