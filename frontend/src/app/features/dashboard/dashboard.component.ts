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
import { User } from '../../core/models/user.model';



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
  currentUser: User | null = null;

  // Modal kontrolü
  showAddServerModal: boolean = false;
  newServerName: string = '';
  usersInChannel: any;

  chatDisplayStatus: boolean = false;
  serversDisplayStatus: boolean = true;

  speakingUsers: any = {};
  muteStatus: boolean = true;
  lastSpeakingStatus: boolean | null = null;

  isScreenSharing = false;


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
    this.authService.user$.subscribe((user) => {
      this.currentUser = user;
    })
    this.getAllServers();
    // Odadaki kullanıcı listesini güncelleyin ve herkese gönderin
    this.socketService.onUpdateUserList((users) => {
      this.usersInChannel = users;
      console.log("Kullanıcı listesi güncellendi:", users);
    });

    this.socketService.onUpdateSpeakingStatus((data) => {
      console.log("onUpdateSpeakingStatus",data);
      
      if (!this.speakingUsers[data.channelId]) {
        this.speakingUsers[data.channelId] = []
      }
      this.speakingUsers[data.channelId][data.userName] = data.isSpeaking
    })
  }

  startAudioAnalysis() {
    const stream = this.voiceChatService.getMediaStream();
  
    if (!stream) {
      console.error("❌ Serviste aktif medya akışı bulunamadı!");
      return;
    }
  
    this.audioDetector.analyzeStream(stream, (isSpeaking) => {
      if (this.lastSpeakingStatus !== isSpeaking) {
        this.lastSpeakingStatus = isSpeaking;
        this.socketService.emit("user-speaking", {
          userName: this.currentUser?.username,
          channelId: this.channelChange.value?.id,
          isSpeaking: isSpeaking,
        });
      }
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

  async selectChannel(channel: Channel): Promise<void> {
    console.log("Kanal değiştirildi:", channel);
    this.previousChannelId.push(channel.id);
    let token = this.authService.getToken();
    if (channel.id && token) {
      this.socketService.authenticate(token); // Kullanıcıyı doğrula
      let previousChannelIdNew = this.previousChannelId[this.previousChannelId.length - 2 || this.previousChannelId.length]
      this.socketService.joinRoom(channel.id, previousChannelIdNew); // Yeni odaya giriş
    

      //Voice initialize when selected a channel
      await this.voiceChatService.initialize(`${channel.id}-voice`, `${previousChannelIdNew}-voice`)
      this.toggleStatus()
      this.channelChange.next(channel);
      this.startAudioAnalysis()
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



  toggleScreenShare() {
    if (this.isScreenSharing) {
      this.voiceChatService.stopScreenShare();
      this.isScreenSharing = false;
    } else {
      this.voiceChatService.startScreenShare().then((stream) => {
        if (stream) {
          this.isScreenSharing = true;
        }
      });
    }
  }

}
