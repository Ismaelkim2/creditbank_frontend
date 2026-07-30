import { Injectable, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class IdleTimerService {
  private readonly idleTimeout = 5 * 60 * 1000; // 5 mins
  private readonly warningDuration = 30 * 1000; // last 30s

  private idleTimer: any;
  private countdownTimer: any;
  private remaining = 0;

  private userIsLoggedIn = false;
  private isBrowser = false;

  private readonly events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
  private boundResetHandler = this.resetTimer.bind(this);

  // Callbacks from component
  private showModalCallback: () => void = () => {};
  private hideModalCallback: () => void = () => {};
  private updateCountdownCallback: (seconds: number) => void = () => {};
  private logoutCallback: () => void = () => {};

  constructor(
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  init(
    showModal: () => void,
    hideModal: () => void,
    updateCountdown: (seconds: number) => void,
    logout: () => void
  ) {
    this.showModalCallback = showModal;
    this.hideModalCallback = hideModal;
    this.updateCountdownCallback = updateCountdown;
    this.logoutCallback = logout;
  }

  start(): void {
    if (!this.isBrowser) return;
    this.userIsLoggedIn = true;

    this.ngZone.runOutsideAngular(() => {
      this.events.forEach(event => window.addEventListener(event, this.boundResetHandler, true));
    });

    this.resetTimer();
  }

  stop(): void {
    if (!this.isBrowser) return;
    this.userIsLoggedIn = false;

    clearTimeout(this.idleTimer);
    clearInterval(this.countdownTimer);
    this.hideModalCallback();

    this.events.forEach(event => window.removeEventListener(event, this.boundResetHandler, true));
  }

  private resetTimer(): void {
    if (!this.userIsLoggedIn) return;

    clearTimeout(this.idleTimer);
    clearInterval(this.countdownTimer);
    this.hideModalCallback();

    this.ngZone.runOutsideAngular(() => {
      this.idleTimer = setTimeout(() => this.ngZone.run(() => this.startWarning()), this.idleTimeout - this.warningDuration);
    });
  }

  private startWarning(): void {
    if (!this.userIsLoggedIn) return;

    this.remaining = this.warningDuration / 1000;
    this.showModalCallback();
    this.updateCountdownCallback(this.remaining);

    this.countdownTimer = setInterval(() => {
      this.remaining--;
      this.updateCountdownCallback(this.remaining);

      if (this.remaining <= 0) {
        clearInterval(this.countdownTimer);
        this.logout();
      }
    }, 1000);
  }

  stayLoggedIn(): void {
    this.hideModalCallback();
    clearInterval(this.countdownTimer);
    this.resetTimer();
  }

  logout(): void {
    this.hideModalCallback();
    this.userIsLoggedIn = false;

    clearTimeout(this.idleTimer);
    clearInterval(this.countdownTimer);

    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}