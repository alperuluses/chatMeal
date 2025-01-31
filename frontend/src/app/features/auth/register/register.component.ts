import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth-service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  imports: [ReactiveFormsModule,CommonModule]
})
export class RegisterComponent {
  registerForm: FormGroup;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isSubmitting = true; // Form gönderimi başlıyor
      const { username, email, password } = this.registerForm.value;

      this.authService.register(username, email, password).subscribe(
        (res) => {
          if(res){
          this.successMessage = 'Kayıt başarılı! Giriş yapabilirsiniz.';
          this.errorMessage = '';
          this.isSubmitting = false;
          // Kayıt başarılı olduğunda yönlendirme
          this.router.navigate(['/login']);
        }
      }
      );
    } else {
      this.errorMessage = 'Lütfen tüm alanları doğru doldurduğunuzdan emin olun.';
    }
  }
}
