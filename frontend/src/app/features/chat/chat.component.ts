import { Component, Input, OnChanges, SimpleChanges, OnInit, Output, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { SocketService } from '../../core/services/socket.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Messages } from '../../core/models/server.model';
import { AuthService } from '../../core/services/auth-service';
import { ChannelService } from '../../core/services/channel/channel.service';
import { EventEmitter } from '@angular/core';
import { MobileCheckService } from '../../core/services/mobile-check.service';
import { VoiceChatService } from '../../core/services/voice-chat/voice-chat.service';

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
  @Output() backStatus = new EventEmitter<boolean>();
  @ViewChild('chat') private chatScrollContainer!: ElementRef;
  @ViewChild('audioElement') audioElement!: ElementRef;

  sendData() {
    this.backStatus.emit(true);
  }
  constructor(
    private socketService: SocketService, 
    private authService: AuthService,
    private channelService: ChannelService,
    public mobileCheckService: MobileCheckService,
  ) { }

  ngOnInit() {
    let token = this.authService.getToken();
    if (token) {
      this.socketService.authenticate(token);
    }

    // Gelen mesajları dinle
    this.socketService.onMessage((messageData) => {
      messageData.content = messageData.message;
      this.messages.push(messageData);
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

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  formatDate(isoString: string | undefined): string {
    if (!isoString) return "TIME_ERR"

    const date = new Date(isoString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Aylar 0'dan başlar
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

}
