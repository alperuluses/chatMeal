import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from '../chat/chat.component';
import { ServerService } from '../../core/services/server/server.service';
import { Server } from '../../core/models/server.model';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { ChannelService } from '../../core/services/channel/channel.service';
import { Channel } from '../../core/models/channel.model';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth-service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, FormsModule, ChatComponent],
})
export class DashboardComponent implements OnInit {

  serverList: Server[] = [];
  selectedServer: Server | null = null;
  channels: Observable<Channel[]> | undefined = undefined;
  channelChange: BehaviorSubject<Channel | undefined> = new BehaviorSubject<Channel | undefined>(undefined);
  channelChange$: Observable<Channel | undefined> = this.channelChange.asObservable();

  // Modal kontrolü
  showAddServerModal: boolean = false;
  newServerName: string = '';

  constructor(
    private serverService: ServerService,
    private channelService: ChannelService,
    private socketService: SocketService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.getAllServers();
  }

  getAllServers(): void {
    this.serverService.getServers().subscribe((res) => {
      if (res.servers) {
        this.serverList = res.servers;
      }
    });
  }

  selectServer(server: Server): void {
    this.selectedServer = server;
    if (server.id) {
      this.channels = this.channelService.getChannelsByServer(server.id).pipe(
        map((res) => res.channels ? res.channels : [])  
      );
    }
  }

  selectChannel(channel: Channel): void {
    console.log("Kanal değiştirildi:", channel);
    let token = this.authService.getToken();
    if(channel.id && token) {
    this.socketService.authenticate(token); // Kullanıcıyı doğrula
    this.socketService.joinRoom(channel.id); // Yeni odaya giriş

    this.channelChange.next(channel);
    }
  }

  // Kanal ekleme modalını aç/kapat
  openAddServerModal() {
    this.showAddServerModal = true;
  }

  closeAddServerModal() {
    this.showAddServerModal = false;
    this.newServerName = '';
  }

  // Yeni kanal ekleme
  addServer() {
    if (this.newServerName.trim()) {
      this.serverService.createServer(this.newServerName).subscribe((res) => {
        if (res.server.id) {
          this.getAllServers();
        }
        this.closeAddServerModal(); 
      });
    }
  }
}
