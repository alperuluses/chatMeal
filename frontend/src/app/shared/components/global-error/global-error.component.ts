import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-global-error',
  templateUrl: './global-error.component.html',
  styleUrls: ['./global-error.component.scss'],
  imports:[CommonModule]
})
export class GlobalErrorComponent implements OnInit {
  static errorSubject = new Subject<string>();
  errorMessage: string | null = null;

  ngOnInit() {
    GlobalErrorComponent.errorSubject.subscribe(message => {
      this.errorMessage = message;
      setTimeout(() => this.errorMessage = null, 5000); // Hide after 5 seconds
    });
  }

  close() {
    this.errorMessage = null;
  }
}