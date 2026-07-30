import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl
} from '@angular/forms';
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

  loading = false;

  showPassword = false;

  showConfirmPassword = false;

  registrationError = '';

  registrationSuccess = '';

  passwordStrength = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {

    this.registerForm = this.fb.group({

      role: [
        '',
        Validators.required
      ],

      nationalId: [
        '',
        [
          Validators.required,
          Validators.minLength(7),
          Validators.maxLength(8)
        ]
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8)
        ]
      ],

      confirmPassword: [
        '',
        Validators.required
      ]

    });

    this.registerForm
      .get('password')
      ?.valueChanges
      .subscribe(value => {

        this.checkPasswordStrength(value);

      });

  }

  /*==========================================================
                    GETTERS
  ==========================================================*/

  get f(): { [key: string]: AbstractControl } {

    return this.registerForm.controls;

  }

  /*==========================================================
                    SUBMIT
  ==========================================================*/

  onSubmit(): void {

    this.submitted = true;

    this.registrationError = '';

    this.registrationSuccess = '';

    if (this.registerForm.invalid) {

      this.focusFirstInvalid();

      return;

    }

    if (this.passwordsDoNotMatch()) {

      this.registrationError =
        'Passwords do not match.';

      return;

    }

    this.loading = true;

    const payload = {

      role:
      this.f['role'].value,

      nationalId:
      this.f['nationalId'].value,

      password:
      this.f['password'].value

    };

    this.authService.register(payload).subscribe({

      next: (response: any) => {

        this.loading = false;

        this.registrationSuccess =
          response.message ||
          'Registration completed successfully.';

        this.registerForm.reset();

        this.submitted = false;

        setTimeout(() => {

          this.router.navigate(['/login']);

        }, 2200);

      },

      error: (error) => {

        this.loading = false;

        this.registrationError =

          error.error?.message ||

          error.error ||

          'Registration failed. Please try again.';

        setTimeout(() => {

          this.registrationError = '';

        }, 6000);

      }

    });

  }

  /*==========================================================
                PASSWORD MATCH
  ==========================================================*/

 passwordsDoNotMatch(): boolean {

  const password = this.f['password'].value;
  const confirm = this.f['confirmPassword'].value;

  return confirm &&
         password !== confirm;

}

  /*==========================================================
                PASSWORD STRENGTH
  ==========================================================*/

passwordHasLength = false;
passwordHasUpper = false;
passwordHasLower = false;
passwordHasNumber = false;
passwordHasSpecial = false;

checkPasswordStrength(password: string): void {

  this.passwordHasLength = password.length >= 8;
  this.passwordHasUpper = /[A-Z]/.test(password);
  this.passwordHasLower = /[a-z]/.test(password);
  this.passwordHasNumber = /[0-9]/.test(password);
  this.passwordHasSpecial = /[\W_]/.test(password);

  const score =
      Number(this.passwordHasLength) +
      Number(this.passwordHasUpper) +
      Number(this.passwordHasLower) +
      Number(this.passwordHasNumber) +
      Number(this.passwordHasSpecial);

  if (score <= 2) {

      this.passwordStrength = 'Weak';

  } else if (score <= 4) {

      this.passwordStrength = 'Medium';

  } else {

      this.passwordStrength = 'Strong';

  }

}

  /*==========================================================
              FIRST INVALID FIELD
  ==========================================================*/

  private focusFirstInvalid(): void {

    const firstInvalid = document.querySelector(

      '.ng-invalid'

    ) as HTMLElement;

    if (firstInvalid) {

      firstInvalid.focus();

    }

  }

  /*==========================================================
              PASSWORD TOGGLE
  ==========================================================*/

  togglePassword(): void {

    this.showPassword =

      !this.showPassword;

  }

  toggleConfirmPassword(): void {

    this.showConfirmPassword =

      !this.showConfirmPassword;

  }

}