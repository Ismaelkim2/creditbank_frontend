import { Component } from '@angular/core';
import { AppRoutingModule } from "../app-routing.module";

@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.css'],

})
export class AuthLayoutComponent {

  currentSlide = 0;

  currentTime = '';

  slides = [
    'assets/login/slide1.jpg',
    'assets/login/slide2.jpg',
    'assets/login/slide3.jpg',
    'assets/login/slide4.jpg',
    'assets/login/slide5.jpg',
    'assets/login/slide6.jpg'
  ];

  private sliderInterval: any;
  private clockInterval: any;


   ngOnInit(): void {
    this.preloadImages();
    this.startSlider();
    this.startClock();
  }

  ngOnDestroy(): void {
    clearInterval(this.sliderInterval);
    clearInterval(this.clockInterval);
  }


  /*=====================================================
IMAGE PRELOADER
=====================================================*/

private preloadImages(): void {

    this.slides.forEach(image => {

        const img = new Image();

        img.src = image;

    });

}

/*=====================================================
SLIDER
=====================================================*/

private startSlider(): void {

    this.sliderInterval = setInterval(() => {

        this.currentSlide++;

        if (this.currentSlide >= this.slides.length) {

            this.currentSlide = 0;

        }

    }, 2000);

}

/*=====================================================
LIVE CLOCK
=====================================================*/

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

        second: '2-digit'

    });

}

}
