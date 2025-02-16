import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { ApiUrlService } from './api-url.service';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private readonly serverUrl: string;
  private currentRoom: string | null = null; // Kullanıcının bulunduğu oda
  private heartBeatInterval: any = null;

  constructor(private apiUrlService: ApiUrlService, private authService: AuthService) {
    this.serverUrl = this.apiUrlService.getPureUrl("socketUrl") // Sunucu adresi
    this.socket = this.getIo()
  }

  getIo() {
    return io(this.serverUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }

  on(event: string, callback: (data: any) => void) {
    this.socket.on(event, callback);
  }

  emit(event: string, data: any) {
    console.log(data);

    this.socket.emit(event, data);
  }

  // Kullanıcıyı doğrulama
  authenticate(token: string) {
    this.socket.emit('authenticate', token);
  }

  // Kullanıcı odaya girerken önceki odadan çıkart
  joinRoom(channelId: string, previousChannelId: string) {
    this.heartBeat()
    if (this.currentRoom) {
      this.leaveRoom(); // Önceki odadan çık
    }

    console.log("Join room FE:", channelId);
    this.socket.emit('joinChannel', channelId, previousChannelId);
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

  emitUserList() {
    this.socket.emit("emitUserList")
  }

  heartBeat() {
    // Önceki interval varsa iptal et
    if (this.heartBeatInterval) {
      clearInterval(this.heartBeatInterval);
    }

    // Yeni interval başlat
    this.heartBeatInterval = setInterval(() => {
      const user = this.authService.currentUser;
      if (user) {
        this.socket.emit('heartbeat', { username: user.username });
      }
    }, 10000);
  }
}
