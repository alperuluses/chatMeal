// voice-chat.service.ts
import { Injectable } from '@angular/core';
import { Socket } from 'socket.io-client';
import Peer, { MediaConnection } from 'peerjs';
import { SocketService } from '../socket.service';
import { Peers } from '../../models/peer.model';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../auth-service';
import { User } from '../../models/user.model';
import { soundMap } from './sound.config';

@Injectable({ providedIn: 'root' })
export class VoiceChatService {
  private socket!: Socket;
  private peer!: Peer;
  private myStream!: MediaStream;
  private peers: Peers = {};
  private connectedPeers: string[] = [];
  private currentChanellId: string = "";
  private previousChannelId: string = "";
  private screenShareStatus = new BehaviorSubject<boolean>(false);
  private currentUser: User | null = null;
  screenShareStatus$ = this.screenShareStatus.asObservable();
  peerVolumes: { [key: string]: number } = {};



  constructor(private socketService: SocketService, private authService: AuthService) {

  }

  starter() {
    //sayfa yenilendiğinde kullanıcıyı destroy et
    window.addEventListener('beforeunload', () => {
      this.socket.emit("user-destroyed", this.currentChanellId, this.peer.id);
    });

    this.socket = this.socketService.getSocket();
    this.socket.on('connect', async () => {
      console.log('✅ Socket.io bağlantısı başarılı');
    });

    this.socket.on('user-connected', async (peerId, socketName) => {
      if (!this.connectedPeers.includes(peerId)) {
        this.connectedPeers.push(peerId);
      }
      console.log('🟢 Yeni kullanıcı bağlandı:', [peerId, socketName]);
      this.playJoinSound(); // Giriş sesi çal

      // Stream hazır değilse bekleyerek dene
      const tryCallingUser = () => {
        if (this.myStream) {
          console.log(`📞 Stream hazır! ${peerId} kullanıcısını arıyorum...`);
          this.callUser(peerId);
        } else {
          console.warn(`⚠️ Stream hazır değil. Bekleniyor... (userId: ${peerId})`);
          setTimeout(tryCallingUser, 1000); // 1 saniye sonra tekrar dene
        }
      };

      tryCallingUser();
    })

    this.socket.on('user-destroyed', (peerId) => {
      console.log('🔴 Kullanıcı ayrıldı:', peerId);
      if (this.peer.id != peerId) {
        this.playJoinSound('leave'); // Çıkış sesi çal
      }

      this.connectedPeers = this.connectedPeers.filter((peersId) => peersId !== peerId);
      if (this.peers[peerId]) {
        this.peers[peerId].close();
        delete this.peers[peerId];
      }
      this.deleteMedia(peerId);
      console.log("Media silindi:", peerId);
    })

    this.socket.on('disconnect', () => {
      console.warn('🔌 Socket bağlantısı kesildi!');
      this.myStream?.getTracks().forEach(track => track.stop());
    });
  }

  async initialize(channelId: string, previousChannelId: string) {
    this.authService.getLoginedUserData()?.subscribe((user) => {
      this.currentUser = user;
    }
    )
    console.log("init voice chat");
    if (this.socket && !this.socket.connected) {
      this.socket.connect()
    }

    if (channelId !== this.currentChanellId) {
      console.log(`🔄 Oda değiştiriliyor: ${previousChannelId} ➝ ${channelId}`);

      // Önceki bağlantıları temizle
      this.cleanupPreviousConnections(previousChannelId);

      this.currentChanellId = channelId;
      this.previousChannelId = previousChannelId;

      try {
        // Peer oluşturulmasını kesinlikle bekle
        const peerId = await this.initPeer();

        if (!peerId) {
          throw new Error("Peer ID alınamadı, yeniden deneniyor...");
        }

        // Medya başlat
        await this.initMedia();

        // Peer ID kesinlikle tanımlıysa sunucuya gönder
        console.log(`📡 Sunucuya bildiriliyor: channelId=${channelId}, peerId=${peerId}`);
        console.log(this.socket)
        this.socket.emit('joinVoiceChannel', channelId, previousChannelId, peerId);

      } catch (error) {
        console.error('❌ Oda değiştirirken hata:', error);
      }
    }
  }

  initPeer(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer();

      this.peer.on('open', (id) => {
        console.log('🔗 Peer ID:', id);
        resolve(id);
      });

      this.peer.on('error', (err) => {
        reject(err);
      });

      this.peer.on('disconnected', () => {
        console.warn('⚠️ PeerJS bağlantısı koptu, yeniden bağlanıyor...');
        this.peer.reconnect();
      });
    });
  }

  async initMedia() {
    try {
      this.myStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true, // Gürültü bastırma
          echoCancellation: true, // Yankı önleme
          autoGainControl: true   // Otomatik ses ayarı
        }
      });
      console.log('✅ Media stream initialized');
      this.peer.off('call'); // Önceki çağrıları temizle
      this.peer.on('call', (call) => {
        console.log('📞 Gelen çağrı:', call);
        if (!this.connectedPeers.includes(call.peer)) {
          this.connectedPeers.push(call.peer);
        }

        if (this.myStream.getVideoTracks()[0]) {
          call.answer(new MediaStream([this.myStream.getVideoTracks()[0]]));
        }

        if (this.myStream.getAudioTracks()[0]) {
          call.answer(new MediaStream([this.myStream.getAudioTracks()[0]]));
        }

        call.on('stream', (userStream) => {
          console.log('🎤 Kullanıcı sesi alındı', userStream, call.metadata.name);
          this.addAudioStream(userStream, call.peer, call.metadata.name);
        });

        call.on('error', (err) => {
          console.error('❌ Call error:', err);
        });

        call.on('close', () => {
          console.warn('📴 Call closed');
        });
      });
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
    }
  }

  callUser(peerId: string) {
    console.log("callUser:", peerId)
    if (!this.myStream) {
      console.error('❌ Media stream is not initialized yet.');
      return;
    }

    console.log(`📡 Arama yapılıyor: ${peerId}`);
    const call = this.peer.call(peerId, this.myStream, { metadata: { name: this.currentUser?.username } });

    if (call) {
      console.log('✅ Arama başarılı');
      call.off('stream'); // Önceki stream olaylarını temizle
      call.on('stream', (userStream) => {
        console.log('🔊 Karşı tarafın sesi alındı', userStream.getTracks());
        this.addAudioStream(userStream, peerId, '');
      });
      this.peers[peerId] = call;
    } else {
      console.error('❌ Call failed for user:', peerId);
    }
  }

  deleteMedia(peerId: string) {
    const audioElement = document.getElementById(`audio-${peerId}`);
    const videoElement = document.getElementById(`video-${peerId}`);
    const nameElement = document.getElementById(`name-${peerId}`);
    const containerElement = document.getElementById(`container-${peerId}`);

    if (audioElement) {
      audioElement.remove();
      console.log(`🗑️ Ses kaldırıldı: audio-${peerId}`);
    }

    if (videoElement) {
      videoElement.remove();
      console.log(`🗑️ Video kaldırıldı: video-${peerId}`);
    }

    if (nameElement) {
      nameElement.remove();
      console.log(`🗑️ İsim kaldırıldı: name-${peerId}`);
    }

    if (containerElement) {
      containerElement.remove();
      console.log(`🗑️ Container kaldırıldı: container-${peerId}`);

    }
  }
  addAudioStream(stream: MediaStream, peerId: string, userName: string) {
    this.deleteMedia(peerId); // Önce varsa aynı peerId için audio/video kaldırılır

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    if (audioTracks.length > 0) {
      const audio = document.createElement('audio');
      audio.id = `audio-${peerId}`;
      audio.srcObject = stream;
      audio.autoplay = true;
      if (!this.peerVolumes[peerId]) {
        this.peerVolumes[peerId] = 1;
      }
      audio.volume = this.peerVolumes[peerId] || 1;
      document.body.appendChild(audio);
      console.log(`🔊 Ses eklendi: audio-${peerId}`);
    }

    if (videoTracks.length > 0) {
      userName = userName ? userName : "Bilinmeyen Kullanıcı"
      const video = document.createElement('video');
      const name = document.createElement('span');
      const container = document.createElement('div');
      container.id = `container-${peerId}`;
      name.innerText = userName;
      name.id = `name-${peerId}`;
      video.id = `video-${peerId}`;
      video.controls = true;
      video.srcObject = stream;
      video.autoplay = true;
      container.appendChild(video);
      container.appendChild(name);
      document.getElementById("screen-share")?.appendChild(container);
      console.log(`📺 Video eklendi: video-${peerId}`);
    }
  }


  public stopSpeakingDetection(muteStatus: boolean) {
    let getAudioTracks = this.myStream.getAudioTracks()[0]
    let getVideoTracks = this.myStream.getVideoTracks()[0]
    let track;
    if (getAudioTracks) {
      track = getAudioTracks
    } else if (getVideoTracks) {
      track = getVideoTracks
    } else {
      console.error("Track err...")
    }

    if (track) {
      if (muteStatus) {
        track.enabled = true;
      } else {
        track.enabled = false;
      }
    }

  }

  callAllConnectedPeers() {
    this.connectedPeers.forEach(peerId => {
      this.callUser(peerId) // mediaStream burada ses/video yayınıdır
    });
  }

  // Bağlı olan tüm peer'ları almak için getPeers() metodunu kullanın
  async startScreenShare(): Promise<MediaStream> {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const combinedStream = new MediaStream([
      ...audioStream.getAudioTracks(),
      ...screenStream.getVideoTracks(),
    ]);

    // Ekran paylaşımı video track'inin 'ended' olayını dinleyin
    const videoTrack = screenStream.getVideoTracks()[0];
    videoTrack.onended = () => {
      console.log('Ekran paylaşımı durduruldu.');
      this.stopScreenShare(); // Durdurma işlemi yap
    };

    this.myStream = combinedStream;
    this.callAllConnectedPeers();

    console.log('Bağlı olan kullanıcılar:', this.connectedPeers);
    this.screenShareStatus.next(true);

    return this.myStream;
  }



  async stopScreenShare(): Promise<boolean> {
    await this.myStream.getTracks().forEach(track => track.stop());
    await this.initMedia()
    this.callAllConnectedPeers();
    this.screenShareStatus.next(false);
    return true;
  }

  async playJoinSound(type: string = 'join') {
    try {


      const audio = new Audio(soundMap[type as keyof typeof soundMap] || soundMap.join);
      await audio.play();
    } catch (err) {
      console.error('Ses çalarken hata oluştu:', err);
    }
  }

  setVolume(peerId: string, volumeLevel: number) {
    const audioElement = document.getElementById(`audio-${peerId}`) as HTMLAudioElement;
    const videoElement = document.getElementById(`video-${peerId}`) as HTMLAudioElement;
    if (audioElement) {
      if (this.peerVolumes[peerId] !== volumeLevel) {
        this.peerVolumes[peerId] = volumeLevel;
      }
      audioElement.volume = volumeLevel;
      console.log(`🔊 ${peerId} için ses seviyesi ayarlandı: ${volumeLevel}`);
    } else {
      console.warn(`⚠️ Ses öğesi bulunamadı: audio-${peerId}`);
    }

    if (videoElement) {
      videoElement.volume = volumeLevel;
      console.log(`🔊 video-${peerId} için ses seviyesi ayarlandı: ${volumeLevel}`);
    }
  }


  cleanupPreviousConnections(previousChannelId: string) {
    console.log(`🚪 Eski odadan çıkılıyor: ${previousChannelId}`);

    if (this.peer) {
      // Sunucuya bildir, PeerJS bağlantısını kapat
      this.socket.emit("user-destroyed", previousChannelId, this.peer.id);
      console.log("🔌 Peer bağlantısı kapatılıyor:", this.peer.id);

      this.cleanupConnections(this.peers)

      // PeerJS bağlantısını tamamen sıfırla
      this.peer.destroy();
    }

    if (this.screenShareStatus.value) {
      this.stopScreenShare()
    }

    // Bağlı kullanıcı listesini temizle
    this.connectedPeers = [];
  }


  cleanupConnections(peers: Peers = this.peers) {
    // Tüm mevcut PeerJS bağlantılarını kapat
    Object.keys(peers).forEach(peerId => {
      console.log("❌ Peer kapatılıyor:", peerId);
      this.peers[peerId].close();
      this.deleteMedia(peerId);
    });
  }

  cleanupAllMedia() {
    // Sayfada yer alan tüm video ve ses öğelerini temizleyin
    const allAudioElements = document.querySelectorAll('audio');
    const allVideoElements = document.querySelectorAll('video');

    allAudioElements.forEach((audio: HTMLAudioElement) => {
      audio.remove();
      console.log(`🗑️ cleanupAllMedia Ses kaldırıldı: ${audio.id}`);
    });

    allVideoElements.forEach((video: HTMLVideoElement) => {
      video.remove();
      console.log(`🗑️ cleanupAllMedia Video kaldırıldı: ${video.id}`);
    });
  }

  destroyUser() {
    if (this.peer) {
      this.socket.emit("user-destroyed", this.currentChanellId, this.peer.id);
    }
    this.socket.disconnect()
    this.previousChannelId = "";
    this.currentChanellId = "";
  }

  getMediaStream() {
    return this.myStream;
  }

  getPeerId() {
    return this.peer?.id;
  }

  setScreenShareStatus(status: boolean) {
    this.screenShareStatus.next(status)
  }
}
