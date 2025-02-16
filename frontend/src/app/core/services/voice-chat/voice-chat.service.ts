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

  constructor(private socketService: SocketService) {
    this.socket = this.socketService.getSocket();
    this.socket.on('connect', () => {
      console.log('✅ Socket.io bağlantısı başarılı');
    });

    this.socket.on('user-connected', async (userId) => {
      console.log('🟢 Yeni kullanıcı bağlandı:', userId);
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

    this.socket.on('user-disconnected', (userId) => {
      console.log('🔴 Kullanıcı ayrıldı:', userId);
      if (this.peers[userId]) {
        this.peers[userId].close();
        delete this.peers[userId];
      }
    });
  }

  async initialize(channelId:string, previousChannelId:string) {
    try {
      const peerId = await this.initPeer();
      await this.initMedia();
      this.socket.emit('joinChannel', channelId, previousChannelId, peerId);
    } catch (error) {
      console.error('❌ Peer başlatma hatası:', error);
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
        call.answer(this.myStream);

        call.on('stream', (userStream) => {
          console.log('🎤 Kullanıcı sesi alındı');
          this.addAudioStream(userStream);
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
        console.log('🔊 Karşı tarafın sesi alındı');
        this.addAudioStream(userStream);
      });
      this.peers[userId] = call;
    } else {
      console.error('❌ Call failed for user:', userId);
    }
  }

  addAudioStream(stream: MediaStream) {
    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    document.body.appendChild(audio);
    console.log('Audio stream added');
  }

  public stopSpeakingDetection(muteStatus: boolean) {
    if (muteStatus) {
      this.myStream.getAudioTracks()[0].enabled = true;
    } else {
      this.myStream.getAudioTracks()[0].enabled = false;
    }
  }

  playJoinSound() {
    const audio = new Audio('assets/sounds/join-sound.mp3');
    audio.muted = true;
    audio.play().then(() => {
      audio.muted = false; // Ses açılıyor
    }).catch(err => console.error('Ses çalarken hata oluştu:', err));

  }
}
