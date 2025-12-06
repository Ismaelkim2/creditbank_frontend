import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth-service.service';
import { IdleTimerService } from './services/idle-timer.service';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'credit-management';
  isBrowser: boolean;

    // Add this line:
  isMobileSidebarActive: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private idleService: IdleTimerService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      console.log('✅ Session active. Will start idle timer after view init.');
    } else {
      const currentRoute = this.router.url;
      if (currentRoute !== '/login' && currentRoute !== '/register') {
        this.router.navigate(['/login']);
      }
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return; // 🚫 Skip SSR

    if (this.authService.isLoggedIn()) {
      this.idleService.start();
    }

    const stayBtn = document.getElementById('stayBtn');
    if (stayBtn) {
      stayBtn.addEventListener('click', () => this.idleService.stayLoggedIn());
    }
  }

   // Add this:
  toggleMobileSidebar() {
    this.isMobileSidebarActive = !this.isMobileSidebarActive;
  }
}
