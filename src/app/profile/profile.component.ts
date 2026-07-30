import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth-service.service';
import { AccountService } from '../services/account.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

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
    imageUrl: 'assets/default-user.png' as string | SafeUrl
  };

  // UI states
  loading = true;
  openActivityPanel = false;
  editing = false;
  changingPassword = false;

  // Image upload
  imagePreview: SafeUrl | null = null;
  uploadProgress: number = -1;

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
    private sanitizer: DomSanitizer,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadUserDetails();
  }



  /** -------------------------------------------------------------
   *  INIT FORMS
   * ------------------------------------------------------------- */
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

  /** -------------------------------------------------------------
   *  LOAD USER DETAILS
   * ------------------------------------------------------------- */
  private loadUserDetails(): void {
    const storedUser = this.authService.getUser();

    if (storedUser?.nationalId) {
      this.patchUser(storedUser);
      this.getAccountDetails(storedUser.nationalId);
      return;
    }

    this.authService.getLoggedInUser().subscribe({
      next: (resp) => {
        this.patchUser(resp);
        this.getAccountDetails(resp.nationalId);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

private patchUser(data: any): void {

  this.user = {
    ...this.user,
    ...data,
    imageUrl: data.imageUrl || 'assets/default-user.png'
  };

console.log('User from Auth:', data);
console.log('Image URL:', data.imageUrl);
console.log('Profile Image:', this.profileImage);

  //==================================================
  // SECURITY
  //==================================================

  this.user.failedAttempts =
    this.user.failedAttempts ?? 0;

  this.user.mfaEnabled =
    this.user.mfaEnabled ?? true;

  this.user.passwordChangedAt =
    this.user.passwordChangedAt ?? new Date();

  //==================================================
  // COMPLIANCE
  //==================================================

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

  //==================================================
  // ACTIVE SESSIONS
  //==================================================

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

  //==================================================
  // PERMISSIONS
  //==================================================

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

  this.editForm.patchValue({

    name: this.user.name,
    phoneNumber: this.user.phoneNumber,
    branch: this.user.branch

  });

}

private getAccountDetails(nationalId: string): void {

  this.accountService
    .getAccountDetailsByNationalId(nationalId)
    .subscribe({
      next: (acct: any) => {

        if (acct) {
          this.user.accountNumber = acct.accountNumber;
          this.user.branch = acct.branch;
          this.user.phoneNumber = acct.phoneNumber;
          this.user.imageUrl = acct.imageUrl;
        }

        this.loading = false;
      },

      error: () => {
        this.loading = false;
      }
    });

}

onImageSelected(event: any): void {

  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    this.imagePreview =
      this.sanitizer.bypassSecurityTrustUrl(
        reader.result as string
      );
  };

  reader.readAsDataURL(file);

}

  /** -------------------------------------------------------------
   *  EDIT PROFILE
   * ------------------------------------------------------------- */
  openEditModal(): void {
    this.editing = true;
  }

  closeEditModal(): void {
    this.editing = false;
  }

  saveProfile(): void {
    if (this.editForm.invalid) return;

    this.saving = true;

    const payload = this.editForm.value;

    this.accountService.updateProfile(payload).subscribe({
      next: () => {
        this.saving = false;
        this.editing = false;
        Object.assign(this.user, payload);
      },
      error: () => (this.saving = false)
    });
  }

  /** -------------------------------------------------------------
   *  CHANGE PASSWORD
   * ------------------------------------------------------------- */
  openChangePasswordModal(): void {
    this.changingPassword = true;
  }

  closeChangePasswordModal(): void {
    this.changingPassword = false;
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;

    if (this.passwordForm.value.newPassword !== this.passwordForm.value.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    this.changing = true;

    this.accountService.changePassword(this.passwordForm.value).subscribe({
      next: () => {
        this.changing = false;
        this.changingPassword = false;
      },
      error: () => (this.changing = false)
    });
  }

  /** -------------------------------------------------------------
   *  ACTIVITY PANEL
   * ------------------------------------------------------------- */
  fetchActivity(): void {
    this.activityPage = 0;
    this.activities = [];
    this.activityEnd = false;
    this.loadMoreActivities();
  }

  loadMoreActivities(): void {
    if (this.activityEnd) return;

    this.activityLoading = true;

    this.accountService.getUserActivity(this.activityPage, this.activityQ).subscribe({
      next: (resp) => {
        if (resp.length === 0) {
          this.activityEnd = true;
        } else {
          this.activities.push(...resp);
          this.activityPage++;
        }
        this.activityLoading = false;
      },
      error: () => (this.activityLoading = false)
    });
  }

  /** -------------------------------------------------------------
   *  BACK NAVIGATION
   * ------------------------------------------------------------- */
  goBack(): void {
    const role = this.authService.getRole();

    if (role === 'ADMIN') this.router.navigate(['/dashboard']);
    else if (role === 'DATA_MANAGER') this.router.navigate(['/data-manager-dashboard']);
    else this.router.navigate(['/applicant-dashboard']);
  }

  /** ROLE ACCESSORS */
  get isApplicant(): boolean {
    return this.authService.getRole() === 'APPLICANT';
  }

  get isAdmin(): boolean {
    return this.authService.getRole() === 'ADMIN';
  }

  get profileImage(): string {

  const img = this.imagePreview
    ? this.imagePreview.toString()
    : this.user.imageUrl;

  if (!img) {
    return 'assets/default-user.png';
  }

  // Already full URL
  if (
      img.startsWith('http://') ||
      img.startsWith('https://') ||
      img.startsWith('data:')
  ) {
    return img;
  }

  // Relative path from backend
  return `http://localhost:8080/${img}`;
}
}
