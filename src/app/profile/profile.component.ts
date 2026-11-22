
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { AuthService } from '../services/auth-service.service';
import { AccountService } from '../services/account.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  private readonly defaultImage = 'assets/default-user.png';
  private readonly maxImageSize = 5 * 1024 * 1024;

  user: any = {
    name: '',
    email: '',
    nationalId: '',
    phoneNumber: '',
    branch: '',
    accountNumber: '',
    role: '',
    lastLogin: null,
    userImageUrl: '',
    imageUrl: this.defaultImage
  };

  // Page states
  loading = true;
  openActivityPanel = false;
  editing = false;
  changingPassword = false;

  // Profile image
  imagePreview: string | null = null;
  uploadProgress = -1;

  // Activity
  activities: any[] = [];
  activityQ = '';
  activityPage = 0;
  activityLoading = false;
  activityEnd = false;

  // Forms
  editForm!: FormGroup;
  passwordForm!: FormGroup;

  // Operation states
  saving = false;
  changing = false;

  // Notifications
  notifications: any[] = [];
  notificationsCount = 0;

  constructor(
    public authService: AuthService,
    private accountService: AccountService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadUserDetails();
  }

  /* =====================================================
     ROLE ACCESSORS
  ===================================================== */

  get role(): string {
    return (
      this.user?.role ||
      this.authService.getRole() ||
      ''
    ).toString().toUpperCase();
  }

  get roleLabel(): string {
    const labels: { [key: string]: string } = {
      ADMIN: 'Administrator',
      DATA_MANAGER: 'Credit Manager',
      APPLICANT: 'Credit Customer',
      TENANT_AGENT: 'Tenant Management Agent'
    };

    return labels[this.role] || 'Platform User';
  }

  get isApplicant(): boolean {
    return this.role === 'APPLICANT';
  }

  get isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  get isDataManager(): boolean {
    return this.role === 'DATA_MANAGER';
  }

  get isTenantAgent(): boolean {
    return this.role === 'TENANT_AGENT';
  }

  get isStaff(): boolean {
    return [
      'ADMIN',
      'DATA_MANAGER',
      'TENANT_AGENT'
    ].includes(this.role);
  }

  get displayName(): string {
    return this.user?.name || 'User Profile';
  }

  get accountStatusLabel(): string {
    return this.user?.accountStatus || 'Not available';
  }

  get branchLabel(): string {
    return this.user?.branch || 'Not available';
  }

  /* =====================================================
     INITIALIZE FORMS
  ===================================================== */

  private initForms(): void {

    this.editForm = this.fb.group({
      name: ['', Validators.required],
      phoneNumber: [''],
      branch: ['']
    });

    this.passwordForm = this.fb.group({

      currentPassword: [
        '',
        Validators.required
      ],

      newPassword: [
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
  }

  /* =====================================================
     LOAD USER DETAILS
  ===================================================== */

  private loadUserDetails(): void {

    const storedUser = this.authService.getUser();

    // Show cached profile immediately.
    if (storedUser) {
      this.patchUser(storedUser);
    }

    this.authService.getLoggedInUser().subscribe({

      next: (response: any) => {

        if (!response) {
          this.finishLoading();
          return;
        }

        this.patchUser(response);

        // Credit account details are only relevant
        // to applicants in the current role structure.
        if (
          this.isApplicant &&
          this.user.nationalId
        ) {
          this.getAccountDetails(this.user.nationalId);
        } else {
          this.finishLoading();
        }
      },

      error: (error: any) => {

        console.error(
          'Unable to load profile details:',
          error
        );

        // Retain cached information if the request fails.
        if (
          this.isApplicant &&
          this.user.nationalId
        ) {
          this.getAccountDetails(this.user.nationalId);
        } else {
          this.finishLoading();
        }
      }

    });
  }

  private finishLoading(): void {
    this.loading = false;
  }

  /* =====================================================
     PATCH USER DETAILS
  ===================================================== */

  private patchUser(data: any): void {

    if (!data) {
      return;
    }

    const isValidImage = (url: any): boolean => {

      if (
        !url ||
        typeof url !== 'string' ||
        !url.trim()
      ) {
        return false;
      }

      return !(
        url.includes('default-user.png') ||
        url.includes('default-user.jpg')
      );
    };

    // Prefer the latest valid backend image.
    // Preserve an existing Cloudinary image if the
    // response only contains a default placeholder.
    const profilePhoto =
      isValidImage(data.userImageUrl)
        ? data.userImageUrl
        : isValidImage(data.imageUrl)
          ? data.imageUrl
          : isValidImage(this.user.userImageUrl)
            ? this.user.userImageUrl
            : isValidImage(this.user.imageUrl)
              ? this.user.imageUrl
              : this.defaultImage;

    this.user = {
      ...this.user,
      ...data,
      role: data.role || this.user.role || this.authService.getRole(),
      userImageUrl: profilePhoto,
      imageUrl: profilePhoto
    };

    // Do not manufacture security, compliance,
    // employment or audit information here.
    // Only values returned by the backend are retained.

    if (this.editForm) {

      this.editForm.patchValue({
        name: this.user.name || '',
        phoneNumber: this.user.phoneNumber || '',
        branch: this.user.branch || ''
      });

    }
  }

  /* =====================================================
     CREDIT ACCOUNT DETAILS
  ===================================================== */

  private getAccountDetails(nationalId: string): void {

    if (!nationalId || !this.isApplicant) {
      this.finishLoading();
      return;
    }

    this.accountService
      .getAccountDetailsByNationalId(nationalId)
      .subscribe({

        next: (account: any) => {

          if (account) {

            this.user = {
              ...this.user,

              accountNumber:
                account.accountNumber ||
                this.user.accountNumber,

              branch:
                account.branch ||
                this.user.branch,

              phoneNumber:
                account.phoneNumber ||
                this.user.phoneNumber
            };

            // Account photo is a fallback only.
            const currentPhoto =
              this.user.userImageUrl ||
              this.user.imageUrl;

            if (
              (!currentPhoto ||
                currentPhoto === this.defaultImage) &&
              account.imageUrl
            ) {
              this.user.imageUrl = account.imageUrl;
            }
          }

          this.finishLoading();
        },

        error: (error: any) => {

          console.error(
            'Unable to load credit account details:',
            error
          );

          this.finishLoading();
        }

      });
  }

  /* =====================================================
     PROFILE IMAGE UPLOAD
  ===================================================== */

  onImageSelected(event: Event): void {

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (this.uploadProgress === 0) {
      input.value = '';
      return;
    }

    if (file.size > this.maxImageSize) {

      alert('Image must not exceed 5 MB.');

      input.value = '';
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type.toLowerCase())) {

      alert('Only JPG, PNG and WEBP images are allowed.');

      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {

      this.imagePreview = reader.result as string;
      this.uploadProgress = 0;

      this.authService.uploadProfileImage(file).subscribe({

        next: (response: any) => {

          const imageUrl = response?.userImageUrl;

          if (!imageUrl) {

            this.imagePreview = null;
            this.uploadProgress = -1;

            alert(
              'The upload response did not contain a profile image URL.'
            );

            return;
          }

          this.user = {
            ...this.user,
            userImageUrl: imageUrl,
            imageUrl: imageUrl
          };

          this.authService.updateProfileImage(imageUrl);

          this.imagePreview = null;
          this.uploadProgress = 100;
        },

        error: (error: any) => {

          console.error(
            'Profile image upload failed:',
            error
          );

          this.imagePreview = null;
          this.uploadProgress = -1;

          const message =
            error?.error?.message ||
            error?.error?.detail ||
            'Unable to upload your profile photo. Please try again.';

          alert(message);
        }

      });
    };

    reader.onerror = () => {

      this.imagePreview = null;
      this.uploadProgress = -1;

      alert('Unable to read the selected image.');
    };

    reader.readAsDataURL(file);

    // Allow the same file to be selected again.
    input.value = '';
  }

  /* =====================================================
     PROFILE IMAGE ERROR HANDLING
  ===================================================== */

  onProfileImageError(event: Event): void {

    const img = event.target as HTMLImageElement;

    img.onerror = null;
    img.src = this.defaultImage;
  }

  /* =====================================================
     EDIT PROFILE
  ===================================================== */

  openEditModal(): void {

    this.editForm.patchValue({
      name: this.user.name || '',
      phoneNumber: this.user.phoneNumber || '',
      branch: this.user.branch || ''
    });

    this.editing = true;
  }

  closeEditModal(): void {

    if (!this.saving) {
      this.editing = false;
    }
  }

  saveProfile(): void {

    if (this.editForm.invalid || this.saving) {

      this.editForm.markAllAsTouched();
      return;
    }

    this.saving = true;

const payload = {
  name: this.editForm.value.name?.trim(),
  phoneNumber: this.editForm.value.phoneNumber?.trim()
};

this.accountService.updateProfile(payload).subscribe({

  next: (response: any) => {

    this.saving = false;
    this.editing = false;

    this.user = {
      ...this.user,
      ...response
    };

    this.authService.updateCurrentUser(response);

  },

  error: (error: any) => {

    console.error('Profile update failed:', error);

    this.saving = false;

    const message =
      error?.error?.message ||
      error?.error?.detail ||
      'Unable to update your profile. Please try again.';

    alert(message);
  }

});
  }

  /* =====================================================
     CHANGE PASSWORD
  ===================================================== */

  openChangePasswordModal(): void {

    this.passwordForm.reset();
    this.changingPassword = true;
  }

  closeChangePasswordModal(): void {

    if (!this.changing) {
      this.changingPassword = false;
      this.passwordForm.reset();
    }
  }

  changePassword(): void {

    if (this.passwordForm.invalid || this.changing) {

      this.passwordForm.markAllAsTouched();
      return;
    }

    const formValue = this.passwordForm.value;

    if (
      formValue.newPassword !==
      formValue.confirmPassword
    ) {

      alert('New password and confirmation do not match.');
      return;
    }

    this.changing = true;

   this.accountService.changePassword({
  currentPassword: formValue.currentPassword,
  newPassword: formValue.newPassword
})
      .subscribe({

        next: () => {

          this.changing = false;
          this.changingPassword = false;
          this.passwordForm.reset();

          alert('Your password has been changed successfully.');
        },

        error: (error: any) => {

          console.error(
            'Password change failed:',
            error
          );

          this.changing = false;

          const message =
            error?.error?.message ||
            error?.error?.detail ||
            'Unable to change your password. Please try again.';

          alert(message);
        }

      });
  }

  /* =====================================================
     LOAN SETTINGS
  ===================================================== */

  LoanSetting(): void {
    this.router.navigate(['/app/settings']);
  }

  /* =====================================================
     USER ACTIVITY
  ===================================================== */

  fetchActivity(): void {

    this.activityPage = 0;
    this.activities = [];
    this.activityEnd = false;

    this.loadMoreActivities();
  }

  loadMoreActivities(): void {

    if (
      this.activityEnd ||
      this.activityLoading
    ) {
      return;
    }

    this.activityLoading = true;

    this.accountService
      .getUserActivity(this.activityPage, this.activityQ)
      .subscribe({

        next: (response: any) => {

          const records = Array.isArray(response)
            ? response
            : response?.content || [];

          if (records.length === 0) {

            this.activityEnd = true;

          } else {

            this.activities = [
              ...this.activities,
              ...records
            ];

            this.activityPage++;
          }

          this.activityLoading = false;
        },

        error: (error: any) => {

          console.error(
            'Activity loading failed:',
            error
          );

          this.activityLoading = false;
        }

      });
  }

  /* =====================================================
     BACK NAVIGATION
  ===================================================== */

  goBack(): void {

    const routes: { [key: string]: string } = {
      ADMIN: '/dashboard',
      DATA_MANAGER: '/data-manager-dashboard',
      TENANT_AGENT: '/app/tenant-agent-dashboard',
      APPLICANT: '/applicant-dashboard'
    };

    this.router.navigate([
      routes[this.role] || '/login'
    ]);
  }

  /* =====================================================
     PROFILE IMAGE URL RESOLUTION
  ===================================================== */

  get profileImage(): string {

    const image =
      this.imagePreview ||
      this.user.userImageUrl ||
      this.user.imageUrl;

    if (!image) {
      return this.defaultImage;
    }

    if (image.startsWith('data:')) {
      return image;
    }

    if (image.startsWith('assets/')) {
      return image;
    }

    try {

      const backendOrigin =
        new URL(environment.apiUrl).origin;

      if (
        image.startsWith('http://') ||
        image.startsWith('https://')
      ) {

        const parsedUrl = new URL(image);

        // Redirect old localhost image URLs to the
        // configured backend while preserving Cloudinary.
        if (
          parsedUrl.hostname === 'localhost' ||
          parsedUrl.hostname === '127.0.0.1'
        ) {
          return (
            `${backendOrigin}` +
            `${parsedUrl.pathname}` +
            `${parsedUrl.search}` +
            `${parsedUrl.hash}`
          );
        }

        return image;
      }

      return new URL(
        image.replace(/^\/+/, ''),
        `${backendOrigin}/`
      ).toString();

    } catch (error) {

      console.error(
        'Unable to resolve profile image URL:',
        error
      );

      return this.defaultImage;
    }
  }

}
