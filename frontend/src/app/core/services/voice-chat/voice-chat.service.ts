import { Injectable } from '@angular/core';
import { Socket } from 'socket.io-client';
import Peer from 'peerjs';
import { SocketService } from '../socket.service';

@Injectable({
  providedIn: 'root',
})
export class VoiceChatService {
  private socket: Socket;
  private peer!: Peer;
  private myStream!: MediaStream;
  private peers: { [id: string]: any } = {};
  private audioContext = new AudioContext(); // Ses işleme motoru
  private userAudioControls: { [id: string]: GainNode } = {}; // Kullanıcı ID -> GainNode

  constructor(private socketService: SocketService) {
    this.socket = this.socketService.getIo();

    this.socket.on('connect', () => {
      console.log('✅ Socket.io bağlantısı başarılı');
    });

    this.socket.on('user-connected', async (userId) => {
      console.log('🟢 Yeni kullanıcı bağlandı:', userId);
      if (this.myStream && this.peer.id < userId) {
        this.callUser(userId);
      } else {
        this.callUser(userId);
        console.warn('⚠️ Media stream henüz hazır değil');
      }
    });

    this.socket.on('user-disconnected', (userId) => {
      console.log('🔴 Kullanıcı ayrıldı:', userId);
      if (this.peers[userId]) {
        this.peers[userId].close();
        delete this.peers[userId];
        delete this.userAudioControls[userId]; // Kullanıcı ayrılınca sesi kaldır
      }
    });
  }

  async initialize() {
    try {
      const peerId = await this.initPeer();
      await this.initMedia();
      this.socket.emit('join-room', 'test-room', peerId);
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
      this.myStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Media stream initialized');

      this.peer.on('call', (call) => {
        console.log('📞 Gelen çağrı:', call);
        call.answer(this.myStream);
        call.on('stream', (userStream) => {
          console.log('🎤 Kullanıcı sesi alındı');
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
    console.log("callUser:", userId);
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
        this.addAudioStream(userStream, userId);
      });
      this.peers[userId] = call;
    } else {
      console.error('❌ Call failed for user:', userId);
    }
  }

  /**
   * Kullanıcıdan gelen sesi UI'ye ekler ve sesi kontrol etmek için GainNode kullanır.
   */
  addAudioStream(stream: MediaStream, peerId: string) {
    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    document.body.appendChild(audio);
    console.log('Audio stream added');

    // Web Audio API ile GainNode oluştur ve sesi kontrol et
    const source = this.audioContext.createMediaStreamSource(stream);
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 1.0; // Varsayılan ses seviyesi (100%)

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    this.userAudioControls[peerId] = gainNode;

    // UI için ses seviyesi kontrol kaydırıcısını oluştur
    this.createVolumeSlider(peerId);
  }

  /**
   * Kullanıcının ses seviyesini ayarlamak için fonksiyon.
   */
  setUserVolume(peerId: string, volume: number) {
    if (this.userAudioControls[peerId]) {
      this.userAudioControls[peerId].gain.value = volume; // 0.0 (sessiz) - 1.0 (maksimum)
      console.log(`🎚️ ${peerId} için ses seviyesi: ${volume}`);
    }
  }

  /**
   * Kullanıcı arayüzüne ses seviyesi ayarlama için bir slider ekler.
   */
  createVolumeSlider(peerId: string) {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.1';
    slider.value = '1';
    slider.oninput = () => this.setUserVolume(peerId, parseFloat(slider.value));

    const label = document.createElement('label');
    label.innerText = `🔊 Ses Seviyesi (${peerId}): `;
    label.appendChild(slider);

    document.body.appendChild(label);
  }

  /**
   * Kullanıcının mikrofonunu aç/kapat.
   */
  public stopSpeakingDetection(muteStatus: boolean) {
    if (muteStatus) {
      this.myStream.getAudioTracks()[0].enabled = true;
    } else {
      this.myStream.getAudioTracks()[0].enabled = false;
    }
  }
}