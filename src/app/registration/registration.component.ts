import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service.service';

@Component({
  selector: 'app-register',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent {
  registerForm: FormGroup;
  submitted = false;
  registrationError = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      nationalId: ['', [Validators.required, Validators.minLength(7)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      role: ['', Validators.required]
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.registrationError = '';

    console.log("🔹 Form submitted with values:", this.registerForm.value);

    if (this.registerForm.invalid) {
      console.warn("⚠️ Form is invalid:", this.registerForm.errors, this.registerForm.value);
      return;
    }

    if (this.passwordsDoNotMatch()) {
      console.warn("⚠️ Passwords do not match");
      return;
    }

    const { nationalId, password, role } = this.registerForm.value;
    const payload: any = { nationalId, password, role };

    console.log("📤 Sending payload to backend:", payload);

    this.authService.register(payload).subscribe({
      next: (res) => {
        console.log("✅ Registration success:", res);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error("❌ Registration failed:", err);

        if (err.error && typeof err.error === 'string') {
          this.registrationError = err.error;
        } else if (err.error?.message) {
          this.registrationError = err.error.message;
        } else {
          this.registrationError = 'Registration failed. Try again.';
        }

        // ⏳ Clear error after 6 seconds
        setTimeout(() => {
          this.registrationError = '';
        }, 5000);
      }
    });
  }

  passwordsDoNotMatch(): boolean {
    return this.registerForm.value.password !== this.registerForm.value.confirmPassword;
  }
}
