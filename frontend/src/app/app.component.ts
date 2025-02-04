import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { GlobalErrorComponent } from './shared/components/global-error/global-error.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,RouterModule,GlobalErrorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'chatAru';
}
