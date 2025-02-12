// voice-chat.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import Peer from 'peerjs';
import { ApiUrlService } from '../api-url.service';
import { SocketService } from '../socket.service';

@Injectable({ providedIn: 'root' })
export class VoiceChatService {
  private socket: Socket;
  private peer!: Peer;
  private myStream!: MediaStream;
  private peers: { [id: string]: any } = {};
  private connectedUserId!:string;

  constructor(private socketService:SocketService) {
    this.socket = this.socketService.getIo();
    this.peer = new Peer();

    this.peer.on('open', (id) => {
      console.log('🔗 Peer ID:', id);
      this.socket.emit('join-room', 'test-room', id);
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket.io bağlantısı başarılı');
    });

    this.socket.on('user-connected', async (userId) => {
      console.log('🟢 Yeni kullanıcı bağlandı:', userId);
      this.connectedUserId= userId
      if (this.myStream) {
        this.callUser(userId);
      } else {
        console.warn('⚠️ Media stream henüz hazır değil');
      }

      this.callAgain();
    })

    this.socket.on('user-disconnected', (userId) => {
      console.log('🔴 Kullanıcı ayrıldı:', userId);
      if (this.peers[userId]) {
        this.peers[userId].close();
        delete this.peers[userId];
      }
    });
  }

  
  callAgain(){
    this.callUser(this.connectedUserId);
  }

  async initMedia() {
    try {
      const constraints = {
        audio: {
            sampleRate: 48000,  // Yüksek kalite için 48kHz
            channelCount: 2,     // Stereo ses desteği
            volume: 1.0,
            autoGainControl: false,  // Otomatik ses ayarlamasını kapat
            noiseSuppression: true, // Gürültü engellemeyi kapat (bazı durumlarda kaliteyi düşürebilir)
            echoCancellation: true   // Yankıyı önlemek için açık bırak
        }
    };
      this.myStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Media stream initialized');

      this.peer.on('call', (call) => {
        console.log('📞 Gelen çağrı:', call);
        call.answer(this.myStream); // myStream null kontrolü burada yapılmış
        call.on('stream', (userStream) => {
          console.log('🎤 Kullanıcı sesi alındı');
          this.addAudioStream(userStream);
        });
      });
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
    }
  }

  callUser(userId: string) {
    console.log("callUser:",userId)
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
}
