import { Component } from '@angular/core';
import { SocketService } from '../../core/services/socket.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth-service';

export interface Messages{
    message:string;
    username:string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports:[CommonModule,FormsModule]
})
export class DashboardComponent {
    messages: Messages[] = [];
    message: string = '';
    
    token:string | null = null;

    constructor(private socketService: SocketService,private authService:AuthService) {}

    ngOnInit() {
        this.token = this.authService.getToken();   
        this.socketService.listenMessages((msg: Messages) => {
            console.log(msg);
            
            this.messages.push(msg);
        });
        if(this.token){
            this.socketService.authenticate(this.token);
        }
    }

    sendMessage() {
        if (this.message.trim()) {
            this.socketService.sendMessage(this.message);
            this.message = '';
        }
    }
}

