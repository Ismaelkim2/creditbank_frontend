import { Component, EventEmitter, OnInit, OnDestroy, Output, HostListener } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';

import { AuthService } from '../services/auth-service.service';
import { AccountService } from '../services/account.service';
import { NotificationService } from '../services/services/notification.service';
import { WebSocketService, NotificationEvent } from '../services/WebSocketService';

import { AppNotification } from '../../models/loan.model';
import { LoanService } from '../services/loan.service';
import { ThemeService } from '../services/theme-service.service';

@Component({
  selector: 'app-top-nav',
  templateUrl: './top-nav.component.html',
  styleUrls: ['./top-nav.component.css']
})
export class TopNavComponent implements OnInit, OnDestroy {

  @Output() sidebarToggle = new EventEmitter<void>();
  @Output() mobileSidebarToggle = new EventEmitter<void>();

  username = '';
  userRole = 'Bank Officer';
  imageUrl = 'assets/default-user.png';
toastMessage = '';
showToast = false;
  showSearch = false;
  showDropdown = false;
  showNotifications = false;
  soundEnabled = true;

  unreadMessages = 3;
  riskAlerts = 2;

  notifications: AppNotification[] = [];
  notificationsCount = 0;
darkMode = false;
  currentPage = 1;
pageSize = 10;

portfolio = 0;

  private notificationSub?: Subscription;

  private wsSub?: Subscription;

  constructor(
    private authService: AuthService,
    private accountService: AccountService,
    private router: Router,
    private notificationService: NotificationService,
    private loanService: LoanService,
    private webSocketService: WebSocketService,
     private themeService: ThemeService
  ) {}

  ngOnInit(): void {

    this.themeService.darkMode$
.subscribe(mode => {

    this.darkMode = mode;

});

    this.loadUserDetails();

  this.notificationService.soundEnabled$
  .subscribe(enabled => {
    this.soundEnabled = enabled;
  });

this.notificationService
  .getSoundPreference()
  .subscribe({
    next: (enabled) => {
      this.notificationService
        .setSoundEnabled(enabled);
    }
  });

  this.notificationAudio =
    new Audio('assets/sounds/notification.mp3');

  this.notificationAudio.load();

    // =========================
    // LOAD INITIAL DATA
    // =========================
    this.notificationService.loadNotifications().subscribe();

    // =========================
    // LIVE NOTIFICATION LIST
    // =========================
    this.notificationSub =
      this.notificationService.notifications$
        .subscribe(list => {
          this.notifications = list;
        });

         this.loanService.portfolio$
    .subscribe(total => {
      this.portfolio = total;
    });

    // =========================
    // LIVE UNREAD COUNT
    // =========================
    this.notificationService.unreadCount$
      .subscribe(count => {
        this.notificationsCount = count;
      });

    // =========================
    // WEBSOCKET EVENTS
    // =========================
    this.wsSub =
      this.webSocketService.events$
        .subscribe((event: NotificationEvent | null) => {

          if (!event) return;

          switch (event.type) {

            // NEW NOTIFICATION
           case 'NEW':

  this.notificationService.pushNotification(event.payload);

  this.showNotificationToast(event.payload);

  this.playNotificationSound();

  break;

            // MARK AS READ (INSTANT)
            case 'READ':
              this.notificationService.markAsReadLocal(event.payload);
              break;

            // DELETE (INSTANT)
            case 'DELETE':
              this.notificationService.deleteLocal(event.payload);
              break;
          }
        });

    this.webSocketService.connect();

    this.router.events
  .pipe(
    filter(event => event instanceof NavigationStart)
  )
  .subscribe(() => {

    this.showDropdown = false;
    this.showNotifications = false;

  });

  }

  ngOnDestroy(): void {
    this.notificationSub?.unsubscribe();
    this.wsSub?.unsubscribe();
  }

  formatToMillions(value: number): string {

  if (!value) return '0';

  const millions = value / 1_000_000;

  return `${millions.toFixed(1)}M`;
}

  // =========================
  // UI ACTION: MARK AS READ
  // =========================
  markNotificationAsRead(notification: AppNotification): void {

    if (!notification?.id || notification.read) return;

    // 🔥 optimistic UI
    this.notificationService.markAsReadLocal(notification.id);

    this.notificationService.markAsRead(notification.id).subscribe();
  }


 testSound() {
  const audio = new Audio('assets/sounds/notification.mp3');
  audio.play();
} 

 openNotifications(): void {
  this.showNotifications = true;
}

  toggleSidebar() {
    this.sidebarToggle.emit();
  }

  toggleSidebarMobile() {
    this.mobileSidebarToggle.emit();
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

 toggleDarkMode(): void {
  this.themeService.toggleTheme();
}

  profile(){
    this.showDropdown = false;
    this.router.navigate(['/app/user-profile'])
  }

  openMessages() {
    this.unreadMessages = 0;
  }

  openRiskAlerts() {
    this.riskAlerts = 0;
  }

  signOut() {
     this.showDropdown = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private loadUserDetails(): void {
    const user = this.authService.getUser();

    if (!user) {
      this.loadFromBackend();
      return;
    }

    this.username = user.name || '';
    this.userRole = user.role || 'Bank Officer';

    if (user.nationalId) {
      this.accountService.getByNationalId(user.nationalId).subscribe({
        next: (res: any) => {
          this.imageUrl = res?.imageUrl || 'assets/default-user.png';
        },
        error: () => this.imageUrl = 'assets/default-user.png'
      });
    }
  }

  private loadFromBackend(): void {
    this.authService.getLoggedInUser().subscribe({
      next: (res: any) => {
        this.username = res?.fullName || res?.name || '';
        this.userRole = res?.role || 'Bank Officer';
        this.imageUrl = res?.imageUrl || 'assets/default-user.png';
      },
      error: () => this.imageUrl = 'assets/default-user.png'
    });
  }

  markAllNotificationsRead(): void {

  this.notifications.forEach(n => {

    if (!n.read && n.id) {
      this.notificationService
        .markAsReadLocal(n.id);
    }

  });

  this.notificationService
    .markAllAsRead()
    .subscribe();

  this.toastMessage =
    'All notifications marked as read';

  this.showToast = true;

  setTimeout(() => {
    this.showToast = false;
  }, 2500);
}


 @HostListener('document:click', ['$event'])
onOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement;

  const clickedInside = target.closest('.nav-icon-wrapper');

  if (!clickedInside) {
    this.showNotifications = false;
  }

  // Close notifications
  if (!target.closest('.nav-icon-wrapper')) {
    this.showNotifications = false;
  }

  // Close profile dropdown
  if (!target.closest('.profile-menu')) {
    this.showDropdown = false;
  }
}

@HostListener('document:keydown.escape')
onEscape(): void {

  this.showDropdown = false;

  this.showNotifications = false;

}

closeNotifications(): void {
  this.showNotifications = false;
}


showNotificationToast(notification: AppNotification): void {

  this.toastMessage = notification.message;
  this.showToast = true;

  setTimeout(() => {
    this.showToast = false;
  }, 4000);
}

private notificationAudio =
  new Audio('assets/sounds/notification.mp3');

playNotificationSound(): void {

  if (!this.soundEnabled) {
    return;
  }

  const audio =
    new Audio('assets/sounds/notification.mp3');

  audio.volume = 0.7;

  audio.play()
    .catch(err => {
      console.error('Sound blocked:', err);
    });
}

toggleNotificationSound(): void {

  const newValue = !this.soundEnabled;

  // instant UI update
  this.notificationService
    .setSoundEnabled(newValue);

  this.notificationService
    .updateSoundPreference(newValue)
    .subscribe({
      next: () => {

        this.toastMessage =
          newValue
            ? 'Notification sound enabled'
            : 'Notification sound disabled';

        this.showToast = true;

        setTimeout(() => {
          this.showToast = false;
        }, 2000);
      },

      error: () => {

        // rollback
        this.notificationService
          .setSoundEnabled(!newValue);
      }
    });
}


get paginatedNotifications(): AppNotification[] {

  const start =
    (this.currentPage - 1) * this.pageSize;

  return this.notifications.slice(
    start,
    start + this.pageSize
  );
}

get totalPages(): number {

  return Math.ceil(
    this.notifications.length /
    this.pageSize
  );
}

nextPage(): void {

  if (this.currentPage < this.totalPages) {
    this.currentPage++;
  }
}

previousPage(): void {

  if (this.currentPage > 1) {
    this.currentPage--;
  }
}

}