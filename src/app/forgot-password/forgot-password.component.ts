import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../services/auth-service.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {

  forgotPasswordForm: FormGroup;

  submitted = false;
  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  successMessage = '';
  errorMessage = '';

  accountVerified = false;

  private sliderInterval: any;

/*=====================================================
    LIVE CLOCK
=====================================================*/

currentTime = '';

private clockInterval: any;

currentSlide = 0;

  slides: string[] = [

'assets/login/slide1.jpg',

'assets/login/slide2.jpg',

'assets/login/slide3.jpg',

'assets/login/slide4.jpg',

'assets/login/slide5.jpg',

'assets/login/slide6.jpg'

];



  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      accountNumber: ['', Validators.required],
      newPassword: [''],
      confirmPassword: ['']
    });

    this.forgotPasswordForm.get('newPassword')?.setValidators([
    Validators.required,
    Validators.minLength(8)
]);

this.forgotPasswordForm.get('confirmPassword')?.setValidators([
    Validators.required
]);

this.forgotPasswordForm.get('newPassword')?.updateValueAndValidity();

this.forgotPasswordForm.get('confirmPassword')?.updateValueAndValidity();

  }


verifyAccount(): void {

  this.submitted = true;
  this.errorMessage = '';
  this.successMessage = '';

  if (
      this.f['email'].invalid ||
      this.f['accountNumber'].invalid
  ) {

      this.focusFirstInvalid();
      return;

  }

  this.loading = true;

  this.authService.verifyAccount(

      this.f['email'].value,
      this.f['accountNumber'].value

  ).subscribe({

      next: (res: any) => {

          this.loading = false;
          this.accountVerified = true;
          this.successMessage = res.message;

      },

      error: (err) => {

          this.loading = false;

          this.errorMessage =

              err.error?.message ||

              'Email and Account Number do not match our records.';

      }

  });

}


private focusFirstInvalid(): void {

    const firstInvalid =

        document.querySelector(

            '.ng-invalid'

        ) as HTMLElement;

    if(firstInvalid){

        firstInvalid.focus();

    }

}

onSubmit(): void {

    this.submitted = true;

    this.errorMessage = '';

    this.successMessage = '';

    if (

        this.f['newPassword'].invalid ||

        this.f['confirmPassword'].invalid

    ) {

        this.focusFirstInvalid();

        return;

    }

    if (

        this.f['newPassword'].value !==

        this.f['confirmPassword'].value

    ) {

        this.errorMessage =

            'Passwords do not match.';

        return;

    }

    this.loading = true;

    this.authService.resetPassword(

        this.forgotPasswordForm.value

    ).subscribe({

        next: (res:any)=>{

            this.loading=false;

            this.successMessage=res.message;

            setTimeout(()=>{

                this.router.navigate(['/login']);

            },2500);

        },

        error:(err)=>{

            this.loading=false;

            this.errorMessage=

                err.error?.message ||

                'Unable to reset password.';

        }

    });

}


  get f(): { [key: string]: AbstractControl } {
  return this.forgotPasswordForm.controls;
}


  
private updateClock(): void {

    const now = new Date();

    this.currentTime = now.toLocaleString('en-GB', {

        weekday: 'short',

        day: '2-digit',

        month: 'short',

        year: 'numeric',

        hour: '2-digit',

        minute: '2-digit',

        second: '2-digit'

    });

}

}