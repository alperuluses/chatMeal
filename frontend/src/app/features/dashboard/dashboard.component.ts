import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from '../chat/chat.component';
import { ServerService } from '../../core/services/server/server.service';
import { Server } from '../../core/models/server.model';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { ChannelService } from '../../core/services/channel/channel.service';
import { Channel } from '../../core/models/channel.model';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth-service';
import { MobileCheckService } from '../../core/services/mobile-check.service';
import { AudioDetectorService } from '../../core/services/voice-chat/audio-detector.service';
import { VoiceChatService } from '../../core/services/voice-chat/voice-chat.service';



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
  previousChannelId: any[] = [null];

  // Modal kontrolü
  showAddServerModal: boolean = false;
  newServerName: string = '';
  usersInChannel: any;

  chatDisplayStatus: boolean = false;
  serversDisplayStatus: boolean = true;
  isSpeaking = false;
  muteStatus: boolean = true;

  constructor(
    private serverService: ServerService,
    private channelService: ChannelService,
    private socketService: SocketService,
    private authService: AuthService,
    public mobileCheckService: MobileCheckService,
    private audioDetector: AudioDetectorService,
    private voiceChatService: VoiceChatService,
  ) { }

  ngOnInit(): void {
    this.authService.initializeAuthState()
    this.getAllServers();
    // Odadaki kullanıcı listesini güncelleyin ve herkese gönderin
    this.socketService.onUpdateUserList((users) => {
      this.usersInChannel = users;
      console.log("Kullanıcı listesi güncellendi:", users);
    });
  }

  startAudioAnalysis() {
    // Kullanıcı etkileşimi ile mikrofon erişimini başlat
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.audioDetector.analyzeStream(stream, (isSpeaking) => {
          this.isSpeaking = isSpeaking;
        });
      })
      .catch((error) => {
        console.error('Mikrofon erişimi reddedildi veya hata oluştu:', error);
      });
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
        map((res) => res.channels ? res.channels : []),
        tap((res) => {
          if (res.length > 0) {

          }
        })
      );
    }
    this.socketService.emitUserList()
  }

  toggleStatus(): void {
    this.chatDisplayStatus = !this.chatDisplayStatus
    this.serversDisplayStatus = !this.serversDisplayStatus;
  }

  selectChannel(channel: Channel): void {


    console.log("Kanal değiştirildi:", channel);
    this.previousChannelId.push(channel.id);
    let token = this.authService.getToken();
    if (channel.id && token) {
      this.socketService.authenticate(token); // Kullanıcıyı doğrula
      let previousChannelId = this.previousChannelId[this.previousChannelId.length - 2 || this.previousChannelId.length]
      console.log("Previous", previousChannelId);

      this.socketService.joinRoom(channel.id, previousChannelId); // Yeni odaya giriş
      this.startAudioAnalysis()
          //Voice initialize when selected a channel
    this.voiceChatService.initialize(`${channel.id}-voice`,`${previousChannelId}-voice`)
      this.toggleStatus()
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

  mute() {
    this.muteStatus = !this.muteStatus
    this.voiceChatService.stopSpeakingDetection(this.muteStatus)
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'k') {
      this.mute();
    }
  }

}
