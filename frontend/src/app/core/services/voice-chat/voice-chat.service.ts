import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import Peer from 'peerjs';
import { SocketService } from '../socket.service';

@Injectable({ providedIn: 'root' })
export class VoiceChatService {
  private socket: Socket;
  private peer!: Peer;
  private myStream!: MediaStream;
  private peers: { [id: string]: any } = {};
  private connectedUserId!: string;
  private audioContext!: AudioContext;

  constructor(private socketService: SocketService) {
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
      this.connectedUserId = userId;

      if (this.myStream) {
        this.callUser(userId);
      } else {
        console.warn('⚠️ Media stream henüz hazır değil');
      }
    });

    this.socket.on('user-disconnected', (userId) => {
      console.log('🔴 Kullanıcı ayrıldı:', userId);
      if (this.peers[userId]) {
        this.peers[userId].close();
        delete this.peers[userId];
      }
    });
  }

  async initMedia() {
    try {
      const constraints = {
        audio: {
          sampleRate: 48000,
          channelCount: 1, // Tek kanal genelde daha stabil ve kaliteli
          autoGainControl: false,
          noiseSuppression: false,
          echoCancellation: true
        }
      };

      this.myStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioContext = new AudioContext();

      // GainNode ile ses seviyesini artır
      const source = this.audioContext.createMediaStreamSource(this.myStream);
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 2.0; // Ses seviyesini 2 kat artırabilirsin

      source.connect(gainNode);
      const destination = this.audioContext.createMediaStreamDestination();
      gainNode.connect(destination);

      // Artırılmış ses seviyesindeki stream kullan
      this.myStream = destination.stream;

      console.log('✅ Media stream initialized with gain boost');

      this.peer.on('call', (call) => {
        console.log('📞 Gelen çağrı:', call);
        call.answer(this.myStream);
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
    console.log('📡 Arama yapılıyor:', userId);
    if (!this.myStream) {
      console.error('❌ Media stream is not initialized yet.');
      return;
    }

    const call = this.peer.call(userId, this.myStream);

    if (call) {
      call.on('stream', (userStream) => {
        console.log('🔊 Karşı tarafın sesi alındı');
        this.addAudioStream(userStream);
      });

      call.on('close', () => {
        console.log('📴 Arama kapandı:', userId);
      });

      call.on('error', (err) => {
        console.error('❌ Arama hatası:', err);
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
    audio.volume = 1.0; // Tarayıcıların bazen default olarak düşük açması olabilir
    document.body.appendChild(audio);
    console.log('🔊 Audio stream added');
  }
}
