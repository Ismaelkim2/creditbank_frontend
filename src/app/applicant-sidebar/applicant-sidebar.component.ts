import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { AuthService } from '../services/auth-service.service';
import { AccountService } from '../services/account.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router'; // ✅ Correct import

interface UserDetails {
  name: string;
  email: string;
  accountNumber: string;
  profileImage: string | SafeUrl;
  nationalId?: string;
}

@Component({
  selector: 'app-applicant-sidebar',
  templateUrl: './applicant-sidebar.component.html',
  styleUrls: ['./applicant-sidebar.component.css']
})
export class ApplicantSidebarComponent implements OnInit {
  @Input() sidebarOpen = false;
  @Input() notifications: any[] = [];

  @Output() navigateToLoans = new EventEmitter<void>();
  @Output() openProfileEvent = new EventEmitter<void>();
  @Output() openSettingsEvent = new EventEmitter<void>();
  @Output() transferFundsEvent = new EventEmitter<void>();
  @Output() logoutEvent = new EventEmitter<void>();

  user: UserDetails = {
    name: '',
    email: '',
    accountNumber: '',
    profileImage: 'assets/default-user.png',
    nationalId: ''
  };

  preferences = { darkMode: false, compactMode: false, currency: 'KES' };
  balance = 0;
  showNotifications = false;

  constructor(
    private authService: AuthService,
    private accountService: AccountService,
    private router: Router, // ✅ Correct Angular Router
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadUserDetails();
    this.loadPreferences();
  }

  /** ✅ Load logged-in user and account details */
  private loadUserDetails(): void {
    this.authService.getLoggedInUser().subscribe({
      next: (data) => {
        if (data?.nationalId) {
          const imageUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
            `http://localhost:8080/api/accounts/image/${data.nationalId}?t=${Date.now()}`
          );

          this.user = {
            name: data.name || 'User',
            email: data.email || '',
            profileImage: imageUrl,
            nationalId: data.nationalId,
            accountNumber: data.accountNumber || ''
          };

          this.fetchAccount(data.nationalId);
        }
      },
      error: (err) => console.error('❌ Failed to fetch logged-in user:', err)
    });
  }

  /** ✅ Fetch account balance & number */
  private fetchAccount(nationalId: string): void {
    this.accountService.getAccountDetailsByNationalId(nationalId).subscribe({
      next: (data) => {
        this.balance = data.balance || 0;
        this.user.accountNumber = data.accountNumber || '';
      },
      error: (err) => console.error('❌ Account fetch failed:', err)
    });
  }

  /** ✅ Navigation Actions */
  goToLoans(): void {
    this.router.navigate(['/debtloans']); // ✅ Angular navigation
  }

  transferFunds(): void {
    this.transferFundsEvent.emit();
    this.router.navigate(['/payments'])
  }

  logout(): void {
    this.logoutEvent.emit();
    this.authService.logout();
  }

  /** ✅ UI Controls */
  private openModal(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const modal = new (window as any).bootstrap.Modal(el);
    modal.show();
  }

  private openOffcanvas(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const canvas = new (window as any).bootstrap.Offcanvas(el);
    canvas.show();
  }



  openSettings(): void {
    this.openOffcanvas('settingsCanvas');
  }

  /** ✅ Toast Feedback */
  private showToast(message: string, type: 'success' | 'danger' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0 position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = '2000';
    toast.role = 'alert';
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    document.body.appendChild(toast);

    const bsToast = new (window as any).bootstrap.Toast(toast, { delay: 4000 });
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
  }

  /** ✅ Preferences */
  applyPreferences(): void {
    const root = document.querySelector('.dashboard-shell') as HTMLElement;
    if (!root) return;
    root.classList.toggle('compact', this.preferences.compactMode);
    root.classList.toggle('dark', this.preferences.darkMode);
  }

  savePreferences(): void {
    localStorage.setItem('dashboardPreferences', JSON.stringify(this.preferences));
    this.applyPreferences();
    this.showToast('✅ Preferences saved successfully', 'success');
  }

  private loadPreferences(): void {
    const saved = localStorage.getItem('dashboardPreferences');
    if (saved) {
      this.preferences = JSON.parse(saved);
      this.applyPreferences();
    }
  }

  /** ✅ Profile */
  private closeModal(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const modal = (window as any).bootstrap.Modal.getInstance(el);
    modal?.hide();
  }

  saveProfile(): void {
    if (!this.user.nationalId) return;

    const payload = {
      name: this.user.name,
      email: this.user.email,
      nationalId: this.user.nationalId
    };

    this.accountService.updateUserProfile(payload).subscribe({
      next: () => {
        this.showToast('✅ Profile updated successfully', 'success');
        this.closeModal('profileModal');
      },
      error: (err) => {
        console.error('❌ Profile update failed:', err);
        this.showToast('❌ Failed to update profile', 'danger');
      }
    });
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  onSearch(query: string): void {
    console.log('🔍 Searching:', query);
  }
}
