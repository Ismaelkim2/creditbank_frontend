import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private darkModeSubject = new BehaviorSubject<boolean>(false);

  darkMode$ = this.darkModeSubject.asObservable();

  constructor() {

    const saved =
      localStorage.getItem('darkMode');

    const isDark =
      saved === 'true';

    this.darkModeSubject.next(isDark);

    this.applyTheme(isDark);

  }

  toggleTheme(): void {

    const value =
      !this.darkModeSubject.value;

    this.darkModeSubject.next(value);

    this.applyTheme(value);

  }

  isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }

  private applyTheme(isDark: boolean): void {

    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    localStorage.setItem(
      'darkMode',
      String(isDark)
    );

  }

}