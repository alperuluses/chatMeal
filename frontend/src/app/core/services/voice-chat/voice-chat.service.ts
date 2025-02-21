// voice-chat.service.ts
import { Injectable } from '@angular/core';
import { Socket } from 'socket.io-client';
import Peer from 'peerjs';
import { SocketService } from '../socket.service';

@Injectable({ providedIn: 'root' })
export class VoiceChatService {
  private socket: Socket;
  private peer!: Peer;
  private myStream!: MediaStream;
  private peers: { [id: string]: any } = {};
  private connectedPeers: string[] = [];
  private currentChanellId: string = "";
  private previousChannelId: string = "";

  constructor(private socketService: SocketService) {
    this.socket = this.socketService.getSocket();
    this.socket.on('connect', async () => {
      console.log('✅ Socket.io bağlantısı başarılı');
      if (this.currentChanellId) {
        console.log(`🔄 Yeniden bağlanılıyor: ${this.currentChanellId}`);

        // Peer bağlantısını tamamen yenile
        if (this.peer) {
          this.peer.destroy();
        }

        await this.initialize(this.currentChanellId, this.previousChannelId);

        // Tüm bağlı kullanıcıları tekrar ara
        this.callAllConnectedPeers();
      }
    });

    this.socket.on('user-connected', async (userId, socketName) => {
      if (!this.connectedPeers.includes(userId)) {
        this.connectedPeers.push(userId);
      }
      console.log('🟢 Yeni kullanıcı bağlandı:', [userId, socketName]);
      this.playJoinSound(); // Giriş sesi çal

      // Stream hazır değilse bekleyerek dene
      const tryCallingUser = () => {
        if (this.myStream) {
          console.log(`📞 Stream hazır! ${userId} kullanıcısını arıyorum...`);
          this.callUser(userId);
        } else {
          console.warn(`⚠️ Stream hazır değil. Bekleniyor... (userId: ${userId})`);
          setTimeout(tryCallingUser, 1000); // 1 saniye sonra tekrar dene
        }
      };

      tryCallingUser();
    })

    this.socket.on('user-destroyed', (peerId) => {
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

    this.socket.on('user-disconnected', (userId) => {
      console.log('🔴 Kullanıcı ayrıldı:', userId);
      if (this.peers[userId]) {
        this.peers[userId].close();
        delete this.peers[userId];
      }
      this.deleteMedia(userId)
    });
  }

  async initialize(channelId: string, previousChannelId: string) {
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

      this.peer.on('call', (call) => {
        console.log('📞 Gelen çağrı:', call);
        if (!this.connectedPeers.includes(call.peer)) {
          this.connectedPeers.push(call.peer);
        }
        call.answer(this.myStream);

        call.on('stream', (userStream) => {
          console.log('🎤 Kullanıcı sesi alındı', userStream);
          this.addAudioStream(userStream, call.peer);
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

  callUser(userId: string) {
    console.log("callUser:", userId)
    if (!this.myStream) {
      console.error('❌ Media stream is not initialized yet.');
      return;
    }

    console.log(`📡 Arama yapılıyor: ${userId}`);
    const call = this.peer.call(userId, this.myStream);

    if (call) {
      console.log('✅ Arama başarılı');
      call.on('stream', (userStream) => {
        console.log('🔊 Karşı tarafın sesi alındı', userStream);
        this.addAudioStream(userStream, userId);
      });
      this.peers[userId] = call;
    } else {
      console.error('❌ Call failed for user:', userId);
    }
  }

  deleteMedia(peerId: string) {
    const audioElement = document.getElementById(`audio-${peerId}`);
    const videoElement = document.getElementById(`video-${peerId}`);

    if (audioElement) {
      audioElement.remove();
      console.log(`🗑️ Ses kaldırıldı: audio-${peerId}`);
    }

    if (videoElement) {
      videoElement.remove();
      console.log(`🗑️ Video kaldırıldı: video-${peerId}`);
    }
  }
  addAudioStream(stream: MediaStream, peerId: string) {
    this.deleteMedia(peerId); // Önce varsa aynı peerId için audio/video kaldırılır

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    if (audioTracks.length > 0) {
      const audio = document.createElement('audio');
      audio.id = `audio-${peerId}`;
      audio.srcObject = stream;
      audio.autoplay = true;
      document.body.appendChild(audio);
      console.log(`🔊 Ses eklendi: audio-${peerId}`);
    }

    if (videoTracks.length > 0) {
      const video = document.createElement('video');
      video.id = `video-${peerId}`;
      video.srcObject = stream;
      video.autoplay = true;
      video.style.width = '90%';
      video.style.maxHeight = '500px';
      video.style.border = '2px solid #6d5dfc';
      video.style.margin = '10px';
      video.style.borderRadius = '8px';
      video.style.backgroundColor = 'black';
      document.body.prepend(video);
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
      ...screenStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    this.myStream = combinedStream;
    this.callAllConnectedPeers();

    console.log('Bağlı olan kullanıcılar:', this.connectedPeers);

    return this.myStream;
  }



  async stopScreenShare() {
    await this.myStream.getTracks().forEach(track => track.stop());
    await this.initMedia()
    this.callAllConnectedPeers();
  }

  playJoinSound() {
    const audio = new Audio('assets/sounds/adam-geldi.mp3');
    audio.muted = true;
    audio.play().then(() => {
      audio.muted = false; // Ses açılıyor
    }).catch(err => console.error('Ses çalarken hata oluştu:', err));

  }

  cleanupPreviousConnections(previousChannelId: string) {
    console.log(`🚪 Eski odadan çıkılıyor: ${previousChannelId}`);

    if (this.peer) {
      // Sunucuya bildir, PeerJS bağlantısını kapat
      this.socket.emit("user-destroyed", previousChannelId, this.peer.id);
      console.log("🔌 Peer bağlantısı kapatılıyor:", this.peer.id);

      // Tüm mevcut PeerJS bağlantılarını kapat
      Object.keys(this.peers).forEach(peerId => {
        console.log("❌ Peer kapatılıyor:", peerId);
        this.peers[peerId].close();
        this.deleteMedia(peerId);
      });

      // PeerJS bağlantısını tamamen sıfırla
      this.peer.destroy();
    }

    // Bağlı kullanıcı listesini temizle
    this.connectedPeers = [];
  }
}
