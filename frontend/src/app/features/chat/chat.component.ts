import { Component, Input, OnChanges, SimpleChanges, OnInit, Output, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { SocketService } from '../../core/services/socket.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Messages } from '../../core/models/server.model';
import { AuthService } from '../../core/services/auth-service';
import { ChannelService } from '../../core/services/channel/channel.service';
import { EventEmitter } from '@angular/core';
import { MobileCheckService } from '../../core/services/mobile-check.service';
import { FormatDatePipe } from '../../core/pipes/format-date.pipe';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  imports: [FormsModule, CommonModule, FormatDatePipe]
})
export class ChatComponent implements OnInit, OnChanges {
  messages: Messages[] = [];
  message: string = '';
  shouldScroll: boolean = true;

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
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit() {
    let token = this.authService.getToken();
    if (token) {
      this.socketService.authenticate(token);
    }

    // Gelen mesajları dinle
    this.socketService.onMessage((messageData) => {
      messageData.content = messageData.message;
      messageData.sent_at = new Date().toISOString();
      this.messages.push(messageData);
      this.shouldScroll = true;  // Yeni mesaj geldiğinde kaydır
    });

    if (this.channelId) {
      this.setMessages(this.channelId);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false; // Sürekli kaydırmayı engelle
    }
  }


  setMessages(channelId: string): void {
    this.channelService.getAllMessagesWithChannel(channelId).subscribe((messages) => {
      this.messages = messages;
      this.shouldScroll = true; // Yeni mesajlar alındığında kaydır
      this.cd.markForCheck();
    });

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['channelId'] && this.channelId) {
      this.setMessages(this.channelId);
      this.messages = [];
      this.shouldScroll = true; // Kanal değiştiğinde kaydır
    }
  }

  sendMessage(): void {
    if (this.message.trim()) {
      this.socketService.sendMessage(this.message);
      this.message = '';  // Mesaj gönderildikten sonra input temizle
      this.shouldScroll = true; // Kullanıcı mesaj gönderdiğinde kaydır
    }
  }

  scrollToBottom(): void {
    try {
      this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error("Scroll hata:", err);
    }
  }
}
