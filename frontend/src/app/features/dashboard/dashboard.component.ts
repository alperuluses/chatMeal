import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, takeUntil, tap } from 'rxjs';
import { map } from 'rxjs/operators';

import { ChatComponent } from '../chat/chat.component';
import { DashboardHeaderComponent } from './header/dashboard-header.component';
import { ServerService } from '../../core/services/server/server.service';
import { ChannelService } from '../../core/services/channel/channel.service';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth-service';
import { MobileCheckService } from '../../core/services/mobile-check.service';
import { AudioDetectorService } from '../../core/services/voice-chat/audio-detector.service';
import { VoiceChatService } from '../../core/services/voice-chat/voice-chat.service';

import { Server } from '../../core/models/server.model';
import { Channel } from '../../core/models/channel.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, FormsModule, ChatComponent, DashboardHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  serverList$!: Observable<Server[] | undefined>;
  selectedServer: Server | null = null;
  channels$?: Observable<Channel[]>;
  channelChange$ = new BehaviorSubject<Channel | undefined>(undefined);
  previousChannelId: any[] = [null];
  currentUser: User | null = null;
  usersInChannel: any;

  chatDisplayStatus = false;
  serversDisplayStatus = true;
  speakingUsers: Record<string, Record<string, boolean>> = {};
  muteStatus = true;
  lastSpeakingStatus: boolean | null = null;
  isScreenSharing$ = new BehaviorSubject<boolean>(false);

  showAddServerModal = false;
  newServerName = '';

  constructor(
    private serverService: ServerService,
    private channelService: ChannelService,
    private socketService: SocketService,
    private authService: AuthService,
    public mobileCheckService: MobileCheckService,
    private audioDetector: AudioDetectorService,
    private voiceChatService: VoiceChatService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.initializeAuth();
    this.serverList$ = this.getAllServers();
  }

  private initializeAuth(): void {
    this.authService.initializeAuthState();
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => (this.currentUser = user));
  }

  private setupSocketListeners(): void {
    this.socketService.onUpdateUserList((users) => {
      this.usersInChannel = users;
      console.log('Kullanıcı listesi güncellendi:', users);
      this.cd.markForCheck();
    });

    this.socketService.onUpdateSpeakingStatus((data) => {
      if (!this.speakingUsers[data.channelId]) {
        this.speakingUsers[data.channelId] = {};
      }

      //Eğer bir nesnenin içeriğini doğrudan değiştiriyorsan, Angular bunu fark etmeyebilir. Bunun yerine yeni bir nesne oluşturmalısın.
      this.speakingUsers = {
        ...this.speakingUsers,
        [data.channelId]: {
          ...this.speakingUsers[data.channelId],
          [data.userName]: data.isSpeaking,
        },
      };
    });
  }

  getAllServers() {
    return this.serverService.getServers().pipe(
      takeUntil(this.destroy$),
      map((res) => res.servers)
    )
  }

  socketRelatedInıt(serverId: string) {
    this.socketService.disconnect();
    this.socketService.initSocketServer(serverId ?? '1');
    this.voiceChatService.starter();
    this.setupSocketListeners();
  }

  selectServer(server: Server): void {
    this.socketRelatedInıt(server.id ?? "1");

    this.socketService.getSocket().connect();
    this.selectedServer = server;

    if (server.id) {
      this.channels$ = this.channelService.getChannelsByServer(server.id).pipe(
        map((res) => res.channels ?? [])
      );
    }

    this.socketService.emitUserList();
  }

  async selectChannel(channel: Channel): Promise<void> {
    console.log('Kanal değiştirildi:', channel);
    this.previousChannelId.push(channel.id);

    const token = this.authService.getToken();
    if (channel.id && token) {
      this.socketService.authenticate(token);
      const previousChannelIdNew = this.previousChannelId[this.previousChannelId.length - 2] ?? null;
      this.socketService.joinRoom(channel.id, previousChannelIdNew);

      await this.voiceChatService.initialize(`${channel.id}-voice`, `${previousChannelIdNew}-voice`);

      this.toggleStatus();
      this.channelChange$.next(channel);
      this.startAudioAnalysis();
    }
  }

  startAudioAnalysis(): void {
    const stream = this.voiceChatService.getMediaStream();

    if (!stream) {
      console.error('❌ Serviste aktif medya akışı bulunamadı!');
      return;
    }

    this.audioDetector.analyzeStream(stream, (isSpeaking) => {
      if (this.lastSpeakingStatus !== isSpeaking) {
        this.lastSpeakingStatus = isSpeaking;
        this.socketService.emit('user-speaking', {
          userName: this.currentUser?.username,
          channelId: this.channelChange$.value?.id,
          isSpeaking,
        });
      }
    });
  }

  toggleStatus(): void {
    this.chatDisplayStatus = !this.chatDisplayStatus;
    this.serversDisplayStatus = !this.serversDisplayStatus;
  }

  toggleScreenShare(): void {
    this.voiceChatService.screenShareStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => this.isScreenSharing$.next(status));

    if (this.isScreenSharing$.value) {
      this.voiceChatService.stopScreenShare();
      this.isScreenSharing$.next(false);
    } else {
      this.voiceChatService.startScreenShare().then((stream) => {
        if (stream) {
          this.isScreenSharing$.next(true);
        }
      });
    }
  }

  mute(): void {
    this.muteStatus = !this.muteStatus;
    this.voiceChatService.stopSpeakingDetection(this.muteStatus);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'k') {
      this.mute();
    }
  }

  openAddServerModal(): void {
    this.showAddServerModal = true;
  }

  closeAddServerModal(): void {
    this.showAddServerModal = false;
    this.newServerName = '';
  }

  addServer(): void {
    if (this.newServerName.trim()) {
      this.serverService.createServer(this.newServerName)
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          if (res.server.id) {
            this.serverList$ = this.getAllServers();
          }
          this.closeAddServerModal();
        });
    }
  }

  changeVolume(event: Event, peerId: string) {
    const volume = (event.target as HTMLInputElement).valueAsNumber;
    this.voiceChatService.setVolume(peerId, volume);
  }

  volumeDisplayCondition(channelId: string, channelIndex: number): boolean {
    return (this.getPeerId() != null && this.usersInChannel?.[channelId + '-voice']?.[channelIndex]?.peerId != this.getPeerId())
  }

  getCurrentVolume(peerId: string) {
    return this.voiceChatService.peerVolumes[peerId] ?? 1;
  }

  getPeerId() {
    console.log("peer");

    return this.voiceChatService.getPeerId();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
