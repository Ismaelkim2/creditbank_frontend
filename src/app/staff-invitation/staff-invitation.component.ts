import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoanService } from '../services/loan.service';

@Component({
  selector: 'app-staff-invitation',
  templateUrl: './staff-invitation.component.html',
  styleUrls: ['./staff-invitation.component.css']
})
export class StaffInvitationComponent implements OnInit {

  invitationForm!: FormGroup;

  token = '';
  staffName = '';
  staffEmail = '';
  staffRole = '';

  isLoading = true;
  isSubmitting = false;
  isValidInvitation = false;
  registrationCompleted = false;

  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private loanService: LoanService
  ) {}

  ngOnInit(): void {
    this.invitationForm = this.fb.group(
      {
        newPassword: ['', [
          Validators.required,
          Validators.minLength(8)
        ]],
        confirmPassword: ['', Validators.required]
      },
      {
        validators: this.passwordMatchValidator
      }
    );

    this.route.queryParamMap.subscribe(params => {
      this.token = params.get('token') || '';

      if (!this.token) {
        this.isLoading = false;
        this.errorMessage = 'The invitation link is missing its security token. Please request a new invitation from your administrator.';
        return;
      }

      this.validateInvitation();
    });
  }

  get f() {
    return this.invitationForm.controls;
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword
      ? null
      : { passwordMismatch: true };
  }

  validateInvitation(): void {
  this.isLoading = true;
  this.errorMessage = '';
  this.successMessage = '';
  this.isValidInvitation = false;
  this.registrationCompleted = false;

  this.loanService.validateStaffInvitation(this.token).subscribe({
    next: (response: any) => {
      this.staffName = response?.name || '';
      this.staffEmail = response?.email || '';
      this.staffRole = response?.role || '';

      this.isValidInvitation = response?.valid === true;
      this.isLoading = false;

      if (!this.isValidInvitation) {
        this.errorMessage =
          'This invitation is invalid, expired, or has already been used. Please contact your administrator.';
      }
    },
    error: (error) => {
      this.isLoading = false;
      this.isValidInvitation = false;

      this.errorMessage =
        error?.error?.message ||
        error?.error?.error ||
        'This invitation is invalid, expired, or has already been used. Please contact your administrator for a new invitation.';
    }
  });
}

  completeRegistration(): void {
    if (this.invitationForm.invalid || !this.isValidInvitation || this.isSubmitting) {
      this.invitationForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      token: this.token,
      newPassword: this.f['newPassword'].value,
      confirmPassword: this.f['confirmPassword'].value
    };

    this.loanService.completeStaffInvitation(payload).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.registrationCompleted = true;
        this.isValidInvitation = false;

        this.successMessage =
          response?.message ||
          'Your registration has been completed successfully. Your account is now awaiting administrator approval. You can sign in once your account has been approved.';
      },
      error: (error) => {
        this.isSubmitting = false;

        this.errorMessage =
          error?.error?.message ||
          error?.error?.error ||
          'We could not complete your registration. The invitation may have expired or already been used. Please contact your administrator.';
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}