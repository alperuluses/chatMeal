import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from '../chat/chat.component';
import { ServerService } from '../../core/services/server/server.service';
import { Server } from '../../core/models/server.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports:[CommonModule,FormsModule,ChatComponent],
})
export class DashboardComponent implements OnInit {

  serverList: Server[] = [];

  constructor(private serverService:ServerService) {}

    ngOnInit(): void {
      this.getAllServers();
    }

  channels = [
    { id: 1, name: 'Genel Sohbet', rooms: [{ id: 101, name: 'Genel Oda 1', messages: [] }] },
    { id: 2, name: 'Eğlence', rooms: [{ id: 201, name: 'Film & Dizi', messages: [] }] },
    { id: 3, name: 'Oyunlar', rooms: [{ id: 301, name: 'Valorant', messages: [] }] }
  ];

  getAllServers():void {
    this.serverService.getServers().subscribe((res) => {        
        this.serverList = res.servers;
    });
  }

  selectedChannel: any = null;
  selectedRoom: any = null;
  newMessage: string = '';
  // Modal kontrolü
  showAddChannelModal: boolean = false;
  newChannelName: string = '';

  selectServer(server: Server) {
    console.log(server);
  }

  selectChannel(channel: any) {
    this.selectedChannel = channel;
    this.selectedRoom = null; // Yeni kanal seçildiğinde oda temizlenir
  }

  selectRoom(room: any) {
    console.log(room);
    
    this.selectedRoom = room;
  }

  sendMessage() {
    if (this.newMessage.trim() && this.selectedRoom) {
      this.selectedRoom.messages.push({ sender: 'Sen', text: this.newMessage });
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
