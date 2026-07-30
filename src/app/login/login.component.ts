import { AccountService } from './../services/account.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../services/auth-service.service';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
currentSlide = 0;


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

/*=====================================================
    ENTERPRISE IMAGE SLIDER
=====================================================*/

slides: string[] = [

'assets/login/slide1.jpg',

'assets/login/slide2.jpg',

'assets/login/slide3.jpg',

'assets/login/slide4.jpg',

'assets/login/slide5.jpg',

'assets/login/slide6.jpg'

];


private sliderInterval: any;

/*=====================================================
    LIVE CLOCK
=====================================================*/

currentTime = '';

private clockInterval: any;


  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private accountSrtvice: AccountService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }


// ngOnInit(): void {

//     this.preloadImages();

//     this.startSlider();

//     this.startClock();

// }


ngOnDestroy(): void {

    if (this.sliderInterval) {

        clearInterval(this.sliderInterval);

    }

    if (this.clockInterval) {

        clearInterval(this.clockInterval);

    }

}

onSubmit(): void {
  this.submitted = true;
  this.loginError = '';

  if (this.loginForm.invalid) return;

  this.loading = true;

  const credentials = this.loginForm.value;

  this.authService.login(credentials).subscribe({
    next: (res: any) => {

     const user: AuthUser = {
  name: res.name || res.user?.fullName,
  role: res.role || res.user?.role,
  nationalId: res.nationalId || res.user?.nationalId,
  email: res.email || res.user?.email,
  phoneNumber: res.phoneNumber,
  imageUrl: res.userImageUrl,
  token: res.token
};

this.authService.setSession(user);

      this.loading = false;

      const role = (user.role || '').toUpperCase();

      switch (role) {
  case 'ADMIN':
  case 'DATA_MANAGER':
    this.router.navigate(['/app/dashboard']);
    break;

        case 'APPLICANT':
          this.router.navigate(['/app/applicant']);
          break;

        default:
          this.router.navigate(['/unauthorized']);
      }
    },

    error: (err) => {
      this.loading = false;
      this.loginError = err.error?.message || 'Login failed';
    }
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
    this.router.navigate(['/app/dashboard']);
    break;

  case 'DATA_MANAGER':
    this.router.navigate(['/app/data-manager-dashboard']);
    break;

 case 'APPLICANT':
    this.router.navigate(['/app/applicant']);
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
