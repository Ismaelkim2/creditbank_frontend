import { Injectable, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class IdleTimerService {
 private idleTimeout = 5 * 60 * 1000; 
private warningTime = 30 * 1000;     

  private idleTimer: any;
  private countdownTimer: any;
  private remaining: number = 0;

  private isBrowser = false;
  private userIsLoggedIn = false;

  private readonly events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
  private readonly boundResetHandler = this.resetTimer.bind(this); // ✅ single reference

  constructor(
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /** ✅ Start inactivity tracking */
  start(): void {
    if (!this.isBrowser) return;

    this.userIsLoggedIn = true;
    console.log('⏳ Idle timer started (30s total, 5s warning)...');

    // Attach listeners once
    this.ngZone.runOutsideAngular(() => {
      this.events.forEach((event) =>
        window.addEventListener(event, this.boundResetHandler, true)
      );
    });

    this.resetTimer();
  }

  /** ✅ Stop tracking */
  stop(): void {
    if (!this.isBrowser) return;

    console.log('🛑 Idle timer stopped.');
    this.userIsLoggedIn = false;

    clearTimeout(this.idleTimer);
    clearInterval(this.countdownTimer);
    this.hideWarning();

    this.events.forEach((event) =>
      window.removeEventListener(event, this.boundResetHandler, true)
    );
  }

  /** 🔁 Reset idle timer on user activity */
  private resetTimer(): void {
    if (!this.userIsLoggedIn) return;

    clearTimeout(this.idleTimer);
    clearInterval(this.countdownTimer);
    this.hideWarning();

    // Start new idle countdown
    this.ngZone.runOutsideAngular(() => {
      this.idleTimer = setTimeout(() => {
        this.ngZone.run(() => this.showWarning());
      }, this.idleTimeout - this.warningTime);
    });
  }

  /** ⚠️ Show countdown warning modal */
  private showWarning(): void {
    if (!this.userIsLoggedIn) return;

    console.log('⚠️ Showing idle warning modal...');
    const modal = document.getElementById('idleWarningModal');
    const countdown = document.getElementById('countdown');

    if (!modal || !countdown) return;

    modal.style.display = 'flex';
    this.remaining = this.warningTime / 1000;
    countdown.textContent = this.remaining.toString();

    this.countdownTimer = setInterval(() => {
      this.remaining--;
      countdown.textContent = this.remaining.toString();

      if (this.remaining <= 0) {
        clearInterval(this.countdownTimer);
        this.handleIdleLogout();
      }
    }, 1000);
  }

  /** 🫥 Hide the modal */
  private hideWarning(): void {
    const modal = document.getElementById('idleWarningModal');
    if (modal) modal.style.display = 'none';
  }

  /** 🚪 Perform logout after inactivity */
  private handleIdleLogout(): void {
    console.warn('🚪 Logging out due to inactivity...');
    this.hideWarning();
    this.userIsLoggedIn = false;
    clearTimeout(this.idleTimer);
    clearInterval(this.countdownTimer);

    sessionStorage.clear();

    this.router.navigate(['/login'])
  }

  /** 🙌 Stay logged in manually */
  stayLoggedIn(): void {
    console.log('✅ User chose to stay logged in.');
    this.hideWarning();
    this.resetTimer();
  }
}
