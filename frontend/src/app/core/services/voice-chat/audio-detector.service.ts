import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioDetectorService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private intervalId: any;

  constructor() {}

  initializeAudioContext() {
    // Eğer AudioContext henüz oluşturulmadıysa burada oluştur
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  async analyzeStream(stream: MediaStream, callback: (isSpeaking: boolean) => void) {
    const audioContext = this.initializeAudioContext(); // AudioContext burada oluşturulur
    this.analyser = audioContext.createAnalyser();
    this.microphone = audioContext.createMediaStreamSource(stream);

    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.fftSize = 512;

    this.microphone.connect(this.analyser);

    this.intervalId = setInterval(() => {
      const array = new Uint8Array(this.analyser!.frequencyBinCount);     
      this.analyser!.getByteFrequencyData(array);
      const volume = array.reduce((a, b) => a + b) / array.length;
      callback(volume > 30); // Ses seviyesi eşik değeri
    }, 100);
  }

  stopAnalysis() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
