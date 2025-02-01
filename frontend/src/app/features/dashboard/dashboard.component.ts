import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from '../chat/chat.component';
import { ServerService } from '../../core/services/server/server.service';
import { Server } from '../../core/models/server.model';
import { map, Observable, switchMap } from 'rxjs';
import { ChannelService } from '../../core/services/channel/channel.service';
import { Channel, CreateChannelResponse } from '../../core/models/channel.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports:[CommonModule,FormsModule,ChatComponent],
})
export class DashboardComponent implements OnInit {

  serverList: Server[] = [];

  constructor(private serverService:ServerService, private channelService:ChannelService) {}

    ngOnInit(): void {
      this.getAllServers();
    }

  // channels = [
  //   { id: 1, name: 'Genel Sohbet', rooms: [{ id: 101, name: 'Genel Oda 1', messages: [] }] },
  //   { id: 2, name: 'Eğlence', rooms: [{ id: 201, name: 'Film & Dizi', messages: [] }] },
  //   { id: 3, name: 'Oyunlar', rooms: [{ id: 301, name: 'Valorant', messages: [] }] }
  // ];

  getAllServers():void {
    this.serverService.getServers().subscribe((res) => {   
      if(res.servers)     
        this.serverList = res.servers;
    });
  }

  selectedServer: any = null;
  selectedChannel: any = null;
  newMessage: string = '';
  channels:Observable<Channel[]> | undefined = undefined;

  // Modal kontrolü
  showAddChannelModal: boolean = false;
  newChannelName: string = '';

  selectServer(server: Server):void {
    this.selectedServer = server;
    if(server.id){
      this.channels = this.channelService.getChannelsByServer(server.id).pipe(
        map((res) => res.channels ? res.channels : [])  
      );
    }
  }

  selectChannel(channel: any) {
    console.log(channel);
    
    this.selectedChannel = channel;
  }

  sendMessage() {
    if (this.newMessage.trim() && this.selectedChannel) {
      this.selectedChannel.messages.push({ sender: 'Sen', text: this.newMessage });
      this.newMessage = '';
    }
  }


  // Kanal ekleme modalını aç/kapat
  openAddChannelModal() {
    this.showAddChannelModal = true;
  }

  closeAddChannelModal() {
    this.showAddChannelModal = false;
    this.newChannelName = '';
  }

  // Yeni kanal ekleme
  addServer() {
    if (this.newChannelName.trim()) {
      this.serverService.createServer(this.newChannelName).subscribe((res) => {
        if (res.server.id) {
          this.getAllServers();
        }
        this.closeAddChannelModal(); 
      });
    }
  }
}
