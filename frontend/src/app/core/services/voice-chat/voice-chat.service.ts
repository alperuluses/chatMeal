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
  private audioContext!: AudioContext;
  private analyser!: AnalyserNode;
  private threshold = 20; // Ses eşiği
  private speaking = false;
  private speakingInterval!: any;
  private gainNode!: GainNode;

  constructor(private socketService: SocketService) {
    this.socket = this.socketService.getIo();
    this.initializeSocketListeners();
  }

  private initializeSocketListeners() {
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

  private initPeer(): Promise<string> {
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

  private async initMedia() {
    this.myStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        noiseSuppression: false,
        echoCancellation: true,
        autoGainControl: true,
      },
    });
  
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.myStream);
    this.analyser = this.audioContext.createAnalyser();
    this.gainNode = this.audioContext.createGain();
  
    source.connect(this.analyser);
    source.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
  
    this.analyser.fftSize = 512;
    this.startSpeakingDetection();
  
    this.peer.on('call', (call) => {
      call.answer(this.myStream);
      call.on('stream', (userStream) => this.addAudioStream(userStream));
    });
  }

  private callUser(userId: string) {
    console.log('callUser:', userId);
    if (!this.myStream) {
      console.error('❌ Media stream is not initialized yet.');
      return;
    }

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

  private addAudioStream(stream: MediaStream) {
    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    document.body.appendChild(audio);
    console.log('Audio stream added');
  }

  private checkAudioLevel(): boolean {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    console.log("Checking",average);
    
    return average > this.threshold;
  }

  private startSpeakingDetection() {
    this.speakingInterval = setInterval(() => {
      const isSpeakingNow = this.checkAudioLevel();
  
      if (isSpeakingNow !== this.speaking) {
        this.speaking = isSpeakingNow;
        this.setMicrophoneVolume(this.speaking ? 1 : 0);
        console.log(this.speaking ? '🎙️ Konuşma başladı' : '🔇 Konuşma durdu');
      }
    }, 200);
  }
  
  private setMicrophoneVolume(volume: number) {
    this.gainNode.gain.value = volume;
  }

  public stopSpeakingDetection(muteStatus:boolean) {
    if (muteStatus) {
     this.startSpeakingDetection()
     this.myStream.getAudioTracks()[0].enabled = true;
    }else{
      clearInterval(this.speakingInterval);
      this.myStream.getAudioTracks()[0].enabled = false;
    }
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }
}
