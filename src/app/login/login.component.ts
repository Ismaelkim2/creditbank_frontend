import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = false;
  submitted = false;
  loginError = '';
  loading = false;
 otpStep = false;
verificationSuccess = false;
emailForOtp = '';
phoneNumberForOtp = '';
resending = false;
otpError = '';


otpCountdown = 60; // seconds
otpTimer: any;
canResend = false;


  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

onSubmit(): void {
  this.submitted = true;
  this.loginError = '';

  if (this.loginForm.invalid) return;

  this.loading = true;
  const credentials = this.loginForm.value;

  this.authService.login(credentials).subscribe({
    next: (res: any) => {
      this.loading = false;

      // Move to OTP phase
      this.otpStep = true;
      this.emailForOtp = res.email ?? '';
      this.phoneNumberForOtp = res.phoneNumber ?? '';

      // Start OTP countdown
      this.startOtpCountdown();
    },
    error: (err: any) => {
      this.loading = false;
      this.loginError = err.error?.message || 'Login failed. Please check your credentials.';
    },
  });
}

// 🔹 Start OTP Countdown
startOtpCountdown() {
  this.canResend = false;
  this.otpCountdown = 60;

  if (this.otpTimer) clearInterval(this.otpTimer);

  this.otpTimer = setInterval(() => {
    this.otpCountdown--;
    if (this.otpCountdown <= 0) {
      this.canResend = true;
      clearInterval(this.otpTimer);
    }
  }, 1000);
}


verifyOtp(otp: string) {
  this.loading = true;
  this.otpError = '';

  this.authService.verifyOtp(this.emailForOtp, otp).subscribe({
    next: (res: any) => {
      this.loading = false;
      this.verificationSuccess = true;

      this.authService.setSession(res);

      const role = (res.role || '').toUpperCase();

      // Navigate to role-specific dashboards
      switch (role) {
        case 'ADMIN':
          this.router.navigate(['/dashboard']);
          break;
        case 'APPLICANT':
          this.router.navigate(['/applicant-dashboard']);
          break;
        case 'DATA_MANAGER':
          this.router.navigate(['/data-manager-dashboard']);
          break;
        default:
          this.router.navigate(['/unauthorized']);
      }
       this.startOtpCountdown();
    },
   error: (err) => {
  this.loading = false;          // STOP spinner
  this.otpError = err.error?.error || 'Invalid OTP.';   // SHOW error
}

  });
}


 // 🚀 RESEND OTP
resendOtp() {
  if (!this.canResend) return; // ensure user cannot click before countdown ends

  this.resending = true;

  this.authService.sendOtp(this.phoneNumberForOtp, this.emailForOtp).subscribe({
    next: () => {
      alert('A new OTP has been sent!');
      this.resending = false;

      // Restart countdown after sending OTP
      this.startOtpCountdown();
    },
    error: (err) => {
      console.error("Resend OTP failed:", err);
      this.resending = false;
    }
  });
}


  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
