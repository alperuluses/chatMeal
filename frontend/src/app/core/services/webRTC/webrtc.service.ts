import { Injectable } from '@angular/core';
import { io,Socket } from 'socket.io-client';
import { ApiUrlService } from '../api-url.service';


@Injectable({
  providedIn: 'root'
})
export class WebrtcService {
  private peerConnection: RTCPeerConnection;
  private readonly serverUrl: string;
  private socket:Socket;
  private config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  constructor(private apiUrlService:ApiUrlService) {
    this.serverUrl= this.apiUrlService.getPureUrl("socketUrl") // Sunucu adresi
    this.socket = io(this.serverUrl);
    this.peerConnection = new RTCPeerConnection(this.config);
    this.setupSocketListeners();
  }

  async setupMediaStream() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => this.peerConnection.addTrack(track, stream));
  }

  private setupSocketListeners() {
    this.socket.on('offer', async (offer) => {
      const answer = await this.createAnswer(offer);
      console.log("offer be to fe",offer);
      this.socket.emit('answer', answer);
    });
    this.socket.on('answer', async (answer) => {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });
    this.socket.on('candidate', (candidate) => {
      this.addIceCandidate(candidate);
    });
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.socket.emit('offer', offer);
    console.log("offer fe",offer);
    
    return offer;
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log("answer fe",answer);
    return answer;
  }

  addIceCandidate(candidate: RTCIceCandidateInit) {
    this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  getPeerConnection(): RTCPeerConnection {
    return this.peerConnection;
  }
}