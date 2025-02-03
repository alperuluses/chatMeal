import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { SocketService } from '../../core/services/socket.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Messages } from '../../core/models/server.model';
import { AuthService } from '../../core/services/auth-service';
import { ChannelService } from '../../core/services/channel/channel.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  imports: [FormsModule, CommonModule]
})
export class ChatComponent implements OnInit, OnChanges {
  messages: Messages[] = [];
  message: string = '';
  
  @Input() channelId: string | undefined = undefined; // Seçili kanal ID'si
  @Input() channelName: string | undefined = undefined; // Seçili kanal adı

  constructor(private socketService: SocketService, private authService: AuthService, private channelService:ChannelService) {}

  ngOnInit(): void {
    let token = this.authService.getToken();
    if (token) {
      this.socketService.authenticate(token);
    }

    // Gelen mesajları dinle
    this.socketService.onMessage((messageData) => {
      messageData.content = messageData.message;
      this.messages.push(messageData);
    });

    this.socketService.onRoomJoined((message) => {
      console.log("Odaya giriş yapıldı:", message);
    });

    if (this.channelId) {
      this.setMessages(this.channelId);
    }
  
  }

  setMessages(channelId: string): void {
    this.channelService.getAllMessagesWithChannel(channelId).subscribe((messages) => {
      this.messages = messages;
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['channelId'] && this.channelId) {
      this.setMessages(this.channelId);
      this.messages = [];
    }
  }

  sendMessage(): void {
    if (this.message.trim()) {
      this.socketService.sendMessage(this.message);
      this.message = '';  // Mesaj gönderildikten sonra input temizle
    }
  }

}
