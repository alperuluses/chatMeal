import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService {
    private socket: Socket;

    constructor() {
        this.socket = io('http://localhost:3001');
    }

    authenticate(token: string) {
        this.socket.emit('authenticate', token);
    }

    sendMessage(message: string) {
        this.socket.emit('sendMessage', message);
    }

    listenMessages(callback: (data: any) => void) {
        this.socket.on('receiveMessage', callback);
    }
}
