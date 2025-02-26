import { Component } from '@angular/core';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AuthService } from '../../../core/services/auth-service';
import { VoiceChatService } from '../../../core/services/voice-chat/voice-chat.service';

@Component({
  selector: 'app-dashboard-header',
  imports: [ButtonComponent],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss'
})
export class DashboardHeaderComponent {
  constructor(private authService: AuthService, private voiceService:VoiceChatService) {

  }

  logout() {
    this.authService.logout();
    this.voiceService.cleanupConnections();
    this.voiceService.destroyUser();
  }

  reloadPage() {
    window.location.reload();
  }
}
