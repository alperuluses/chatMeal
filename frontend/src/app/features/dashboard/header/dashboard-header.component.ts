import { Component } from '@angular/core';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AuthService } from '../../../core/services/auth-service';

@Component({
  selector: 'app-dashboard-header',
  imports: [ButtonComponent],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss'
})
export class DashboardHeaderComponent {
  constructor(private authService: AuthService) {

  }

  logout() {
    this.authService.logout();
  }

  reloadPage() {
    window.location.reload();
  }
}
