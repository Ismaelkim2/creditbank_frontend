import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth-service.service';
import { IdleTimerService } from './services/idle-timer.service';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from './services/theme-service.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  isBrowser: boolean;
  isMobileSidebarActive = false;

  // Modal state and countdown
  showIdleModal = false;
  idleCountdown = 30;

  constructor(
    private authService: AuthService,
    private router: Router,
    private idleService: IdleTimerService,
    private themeService: ThemeService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Only start idle tracking if user is logged in
    if (this.authService.isLoggedIn()) {
      this.idleService.init(
        this.showModal.bind(this),
        this.hideModal.bind(this),
        this.updateCountdown.bind(this),
        this.logoutUser.bind(this)
      );
    } else {
      const currentRoute = this.router.url;
      if (currentRoute !== '/login' && currentRoute !== '/register') {
        this.router.navigate(['/login']);
      }
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    if (this.authService.isLoggedIn()) {
      this.idleService.start();
    }
  }

  toggleSidebarMobile() {
    this.isMobileSidebarActive = !this.isMobileSidebarActive;
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  /** Called by IdleTimerService when 30s remaining */
  showModal() {
    this.showIdleModal = true;
  }

  hideModal() {
    this.showIdleModal = false;
  }

  updateCountdown(seconds: number) {
    this.idleCountdown = seconds;
  }

  /** User clicked continue */
  continueSession() {
    this.hideModal();
    this.idleService.stayLoggedIn();
  }

  /** User clicked logout */
  logoutUser() {
    this.hideModal();
    this.idleService.logout();
  }
}