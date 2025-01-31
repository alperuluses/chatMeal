import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AuthGuard } from './core/guards/auth.guard';
import { ChatComponent } from './features/chat/chat.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },  // AuthGuard ile koruma
  { path: 'chat/:id', component: ChatComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' }  // 404 yönlendirmesi
];
