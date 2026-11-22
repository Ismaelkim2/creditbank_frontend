
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.css']
})
export class AuthLayoutComponent implements OnInit, OnDestroy {

  currentSlide = 0;
  currentTime = '';

  slides: string[] = [
    'assets/login/slide1.jpg',
    'assets/login/slide2.jpg',
    'assets/login/slide3.jpg',
    'assets/login/slide4.jpg',
    'assets/login/slide5.jpg',
    'assets/login/slide6.jpg'
  ];

  private sliderInterval: ReturnType<typeof setInterval> | null = null;
  private clockInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.preloadImages();
    this.startSlider();
    this.startClock();
  }

  ngOnDestroy(): void {
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
      this.sliderInterval = null;
    }

    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  // =====================================================
  // IMAGE PRELOADER
  // =====================================================

  private preloadImages(): void {
    this.slides.forEach((imageUrl: string) => {
      const img = new Image();
      img.src = imageUrl;
    });
  }

  // =====================================================
  // IMAGE SLIDER
  // =====================================================

  private startSlider(): void {
    if (this.slides.length <= 1) {
      return;
    }

    this.sliderInterval = setInterval(() => {
      this.currentSlide =
        (this.currentSlide + 1) % this.slides.length;

      this.cdr.markForCheck();
    }, 2000);
  }

  // =====================================================
  // LIVE CLOCK
  // =====================================================

  private startClock(): void {
    this.updateClock();

    this.clockInterval = setInterval(() => {
      this.updateClock();
    }, 1000);
  }

  private updateClock(): void {
    const now = new Date();

    this.currentTime = now.toLocaleString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    this.cdr.markForCheck();
  }

}
