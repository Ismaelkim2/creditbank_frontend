
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth-service.service';
import { AccountService } from '../services/account.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  user: any = {
    name: '',
    email: '',
    nationalId: '',
    phoneNumber: '',
    branch: '',
    accountNumber: '',
    lastLogin: '',
    userImageUrl: '',
    imageUrl: 'assets/default-user.png'
  };

  // UI states
  loading = true;
  openActivityPanel = false;
  editing = false;
  changingPassword = false;

  // Image upload
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

  // Saving states
  saving = false;
  changing = false;

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

  /* ================= INIT FORMS ================= */

  private initForms(): void {

    this.editForm = this.fb.group({
      name: ['', Validators.required],
      phoneNumber: [''],
      branch: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
        ]
      ],
      confirmPassword: ['', Validators.required]
    });
  }

  /* ================= LOAD USER DETAILS ================= */

  private loadUserDetails(): void {

    const storedUser = this.authService.getUser();

    // Display cached user details immediately.
    if (storedUser) {
      this.patchUser(storedUser);
    }

    const cachedNationalId = storedUser?.nationalId;

    // Always refresh user details from the backend.
    this.authService.getLoggedInUser().subscribe({

      next: (resp: any) => {

        if (!resp) {
          this.loading = false;
          return;
        }

        this.patchUser(resp);

        const nationalId =
          resp.nationalId || cachedNationalId;

        if (nationalId) {
          this.getAccountDetails(nationalId);
        } else {
          this.loading = false;
        }
      },

      error: (error) => {

        console.error(
          'Unable to refresh profile details:',
          error
        );

        // Retain cached information if backend refresh fails.
        if (cachedNationalId) {
          this.getAccountDetails(cachedNationalId);
        } else {
          this.loading = false;
        }
      }
    });
  }

  /* ================= PATCH USER DETAILS ================= */

  private patchUser(data: any): void {

    if (!data) {
      return;
    }

    // Preserve the actual user profile photo.
    const profilePhoto =
      data.userImageUrl ||
      data.imageUrl ||
      this.user.userImageUrl ||
      this.user.imageUrl ||
      'assets/default-user.png';

    this.user = {
      ...this.user,
      ...data,

      userImageUrl:
        data.userImageUrl ||
        this.user.userImageUrl ||
        '',

      imageUrl: profilePhoto
    };

    // SECURITY
    this.user.failedAttempts =
      this.user.failedAttempts ?? 0;

    this.user.mfaEnabled =
      this.user.mfaEnabled ?? true;

    this.user.passwordChangedAt =
      this.user.passwordChangedAt ?? new Date();

    // COMPLIANCE
    this.user.accountStatus =
      this.user.accountStatus ?? 'ACTIVE';

    this.user.kycStatus =
      this.user.kycStatus ?? 'Verified';

    this.user.riskLevel =
      this.user.riskLevel ?? 'LOW';

    this.user.complianceScore =
      this.user.complianceScore ?? 100;

    this.user.createdDate =
      this.user.createdDate ?? new Date('2024-03-12');

    this.user.kycCompletedDate =
      this.user.kycCompletedDate ?? new Date('2024-03-13');

    this.user.updatedAt =
      this.user.updatedAt ?? new Date();

    this.user.createdBy =
      this.user.createdBy ?? 'System Administrator';

    this.user.approvedBy =
      this.user.approvedBy ?? 'Branch Manager';

    this.user.modifiedBy =
      this.user.modifiedBy ?? 'Profile Owner';

    // ACTIVE SESSIONS
    this.user.sessions =
      this.user.sessions ?? [
        {
          device: 'Desktop',
          browser: 'Chrome 138',
          location: 'Nakuru, Kenya',
          lastSeen: 'Now',
          current: true
        },
        {
          device: 'Mobile',
          browser: 'Android App',
          location: 'Nairobi',
          lastSeen: 'Yesterday',
          current: false
        }
      ];

    // PERMISSIONS
    this.user.permissions =
      this.user.permissions ?? [
        'Loan Approval',
        'Loan Review',
        'Customer Management',
        'Account Opening',
        'Credit Scoring',
        'Reporting',
        'Notifications',
        'Profile Management'
      ];

    // Update edit form.
    this.editForm.patchValue({
      name: this.user.name,
      phoneNumber: this.user.phoneNumber,
      branch: this.user.branch
    });
  }

  /* ================= ACCOUNT DETAILS ================= */

  private getAccountDetails(nationalId: string): void {

    if (!nationalId) {
      this.loading = false;
      return;
    }

    this.accountService
      .getAccountDetailsByNationalId(nationalId)
      .subscribe({

        next: (acct: any) => {

          if (acct) {

            this.user.accountNumber =
              acct.accountNumber || this.user.accountNumber;

            this.user.branch =
              acct.branch || this.user.branch;

            this.user.phoneNumber =
              acct.phoneNumber || this.user.phoneNumber;

            // Account photo is only a fallback.
            if (!this.user.userImageUrl) {

              this.user.imageUrl =
                acct.imageUrl || this.user.imageUrl;
            }
          }

          this.loading = false;
        },

        error: (error) => {

          console.error(
            'Unable to load account details:',
            error
          );

          this.loading = false;
        }
      });
  }

  /* ================= CLOUDINARY PROFILE PHOTO UPLOAD ================= */

  onImageSelected(event: Event): void {

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Validate file size.
    if (file.size > 5 * 1024 * 1024) {

      alert('Image must not exceed 5 MB.');

      input.value = '';
      return;
    }

    // Validate image format.
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

    // Prevent simultaneous uploads.
    if (this.uploadProgress === 0) {

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
              'Upload completed, but no image URL was returned.'
            );

            return;
          }

          // Update component user details.
          this.user.userImageUrl = imageUrl;
          this.user.imageUrl = imageUrl;

          // Update authentication session.
          this.authService.updateProfileImage(imageUrl);

          // Display permanent Cloudinary URL.
          this.imagePreview = null;
          this.uploadProgress = 100;

          console.log(
            'Profile photo uploaded:',
            imageUrl
          );
        },

        error: (error) => {

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

    // Allow selecting the same file again.
    input.value = '';
  }

  /* ================= EDIT PROFILE ================= */

  openEditModal(): void {
    this.editing = true;
  }

  closeEditModal(): void {
    this.editing = false;
  }

  saveProfile(): void {

    if (this.editForm.invalid) {
      return;
    }

    this.saving = true;

    const payload = this.editForm.value;

    this.accountService.updateProfile(payload).subscribe({

      next: () => {

        this.saving = false;
        this.editing = false;

        Object.assign(this.user, payload);
      },

      error: (error) => {

        console.error('Profile update failed:', error);

        this.saving = false;
      }
    });
  }

  /* ================= CHANGE PASSWORD ================= */

  openChangePasswordModal(): void {
    this.changingPassword = true;
  }

  LoanSetting(): void {
    this.router.navigate(['/app/settings']);
  }

  closeChangePasswordModal(): void {
    this.changingPassword = false;
  }

  changePassword(): void {

    if (this.passwordForm.invalid) {
      return;
    }

    if (
      this.passwordForm.value.newPassword !==
      this.passwordForm.value.confirmPassword
    ) {

      alert('Passwords do not match!');
      return;
    }

    this.changing = true;

    this.accountService
      .changePassword(this.passwordForm.value)
      .subscribe({

        next: () => {

          this.changing = false;
          this.changingPassword = false;
        },

        error: (error) => {

          console.error('Password change failed:', error);

          this.changing = false;
        }
      });
  }

  /* ================= ACTIVITY PANEL ================= */

  fetchActivity(): void {

    this.activityPage = 0;
    this.activities = [];
    this.activityEnd = false;

    this.loadMoreActivities();
  }

  loadMoreActivities(): void {

    if (this.activityEnd || this.activityLoading) {
      return;
    }

    this.activityLoading = true;

    this.accountService
      .getUserActivity(this.activityPage, this.activityQ)
      .subscribe({

        next: (resp: any[]) => {

          if (!resp || resp.length === 0) {

            this.activityEnd = true;

          } else {

            this.activities.push(...resp);
            this.activityPage++;
          }

          this.activityLoading = false;
        },

        error: (error) => {

          console.error('Activity loading failed:', error);

          this.activityLoading = false;
        }
      });
  }

  /* ================= BACK NAVIGATION ================= */

  goBack(): void {

    const role = this.authService.getRole();

    if (role === 'ADMIN') {

      this.router.navigate(['/dashboard']);

    } else if (role === 'DATA_MANAGER') {

      this.router.navigate(['/data-manager-dashboard']);

    } else if (role === 'TENANT_AGENT') {

      this.router.navigate(['/app/tenant-agent-dashboard']);

    } else {

      this.router.navigate(['/applicant-dashboard']);
    }
  }

  /* ================= ROLE ACCESSORS ================= */

  get isApplicant(): boolean {
    return this.authService.getRole() === 'APPLICANT';
  }

  get isAdmin(): boolean {
    return this.authService.getRole() === 'ADMIN';
  }

  /* ================= PROFILE IMAGE DISPLAY ================= */

  get profileImage(): string {

    const img =
      this.imagePreview ||
      this.user.userImageUrl ||
      this.user.imageUrl;

    if (!img) {
      return 'assets/default-user.png';
    }

    if (img.startsWith('data:')) {
      return img;
    }

    try {

      const backendOrigin = new URL(environment.apiUrl).origin;

      // Absolute URLs.
      if (
        img.startsWith('http://') ||
        img.startsWith('https://')
      ) {

        const parsedUrl = new URL(img);

        // Legacy localhost image URLs.
        if (
          parsedUrl.hostname === 'localhost' ||
          parsedUrl.hostname === '127.0.0.1'
        ) {

          return `${backendOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        }

        // Cloudinary URLs remain unchanged.
        return img;
      }

      // Legacy relative image paths.
      return new URL(
        img.replace(/^\/+/, ''),
        `${backendOrigin}/`
      ).toString();

    } catch (error) {

      console.error(
        'Unable to resolve profile image URL:',
        img,
        error
      );

      return 'assets/default-user.png';
    }
  }

}
