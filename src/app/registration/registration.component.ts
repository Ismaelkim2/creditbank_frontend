
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

  passwordHasLength = false;
  passwordHasUpper = false;
  passwordHasLower = false;
  passwordHasNumber = false;
  passwordHasSpecial = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {

    this.registerForm = this.fb.group({

      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(150)
        ]
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      nationalId: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{7,8}$/)
        ]
      ],

      phoneNumber: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\+?[0-9]{10,13}$/)
        ]
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
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
        this.checkPasswordStrength(value || '');
      });
  }

  get f(): { [key: string]: AbstractControl } {
    return this.registerForm.controls;
  }

  onSubmit(): void {

    this.submitted = true;

    this.registrationError = '';
    this.registrationSuccess = '';

    if (this.loading) {
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    if (this.passwordsDoNotMatch()) {
      this.registrationError = 'Passwords do not match.';
      return;
    }

    this.loading = true;

    // Public registration always creates an APPLICANT.
    // Role is deliberately not included in this request.
    const payload = {

      name: this.f['name'].value.trim(),

      email: this.f['email'].value.trim().toLowerCase(),

      nationalId: this.f['nationalId'].value.trim(),

      phoneNumber: this.f['phoneNumber'].value.trim(),

      password: this.f['password'].value

    };

    this.authService.register(payload).subscribe({

      next: (response: any) => {

        this.loading = false;

        this.registrationSuccess =
          response?.message ||
          'Registration successful. Await admin approval.';

        this.registerForm.reset();

        this.submitted = false;

        this.passwordStrength = '';

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2500);

      },

      error: (error) => {

        this.loading = false;

        this.registrationError =
          error.error?.message ||
          error.error?.error ||
          (typeof error.error === 'string' ? error.error : '') ||
          'Registration failed. Please check your details and try again.';
      }

    });
  }

  passwordsDoNotMatch(): boolean {

    const password = this.f['password'].value;
    const confirm = this.f['confirmPassword'].value;

    return !!confirm && password !== confirm;
  }

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

    if (!password) {
      this.passwordStrength = '';
    } else if (score <= 2) {
      this.passwordStrength = 'Weak';
    } else if (score <= 4) {
      this.passwordStrength = 'Medium';
    } else {
      this.passwordStrength = 'Strong';
    }
  }

  private focusFirstInvalid(): void {

    const firstInvalid = document.querySelector(
      'form input.ng-invalid'
    ) as HTMLElement;

    firstInvalid?.focus();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
