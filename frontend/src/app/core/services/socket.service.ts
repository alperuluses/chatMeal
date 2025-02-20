import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { ApiUrlService } from './api-url.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private readonly serverUrl: string;
  private currentRoom: string | null = null; // Kullanıcının bulunduğu oda

  constructor(private apiUrlService:ApiUrlService) {
    this.serverUrl= this.apiUrlService.getPureUrl("socketUrl") // Sunucu adresi
    this.socket = io(this.serverUrl);
  }

  // Kullanıcıyı doğrulama
  authenticate(token: string) {
    this.socket.emit('authenticate', token);
  }

  // Kullanıcı odaya girerken önceki odadan çıkart
  joinRoom(channelId: string, previousChannelId:string) {
    if (this.currentRoom) {
      this.leaveRoom(); // Önceki odadan çık
    }

    console.log("Join room FE:", channelId);
    this.socket.emit('joinChannel', channelId,previousChannelId);
    this.currentRoom = channelId;
  }

  // Kullanıcıyı mevcut odadan çıkar
  leaveRoom() {
    if (this.currentRoom) {
      console.log("Leave room FE:", this.currentRoom);
      this.socket.emit('leaveRoom');
      this.currentRoom = null;
    }
  }

  // Mesaj gönderme (hangi odadaysa oraya gönder)
  sendMessage(message: string) {
    if (this.currentRoom) {
      console.log("Send message FE:", message, "Room:", this.currentRoom);
      this.socket.emit('sendMessage', { message, roomId: this.currentRoom });
    }
  }

  // Gelen mesajları dinle
  onMessage(callback: (message: any) => void) {
    this.socket.on('receiveMessage', callback);
  }

  // Odaya katılma mesajlarını dinle
  onRoomJoined(callback: (message: string) => void) {
    this.socket.on('roomJoined', callback);
  }

  onUpdateUserList(callback: (users: string[]) => void) {
    this.socket.on('updateUserList', callback);
  }

  emitUserList(){
    this.socket.emit("emitUserList")
  }
}
