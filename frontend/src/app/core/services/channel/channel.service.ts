import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateChannelResponse } from '../../models/channel.model';
import { ApiUrlService } from '../api-url.service';

@Injectable({
  providedIn: 'root'
})
export class ChannelService {
  constructor(private http: HttpClient, private apiUrlService:ApiUrlService) {}

  // 🔹 Kanal oluşturma
  createChannel(name: string, serverId: string, type:string): Observable<CreateChannelResponse> {
    const requestUrl = this.apiUrlService.getUrl('channels/create');
    return this.http.post<CreateChannelResponse>(requestUrl, { name, serverId,type });
  }

  // 🔹 Belirli bir server'a ait kanalları alma
  getChannelsByServer(serverId: string): Observable<CreateChannelResponse> {
    const requestUrl = this.apiUrlService.getUrl('channels');
    return this.http.get<CreateChannelResponse>(`${requestUrl}/${serverId}`);
  }

  // 🔹 Tüm kanalları alma
  getAllChannels(): Observable<CreateChannelResponse> {
    const requestUrl = this.apiUrlService.getUrl('channels/all');
    return this.http.get<CreateChannelResponse>(requestUrl);
  }
}
