import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth-service.service';


@Injectable({
  providedIn: 'root'
})
export class AdminOrDataManagerGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    const role = (this.authService.getRole() || '')
      .toUpperCase()
      .replace('ROLE_', '')
      .trim();

    if (role === 'ADMIN' || role === 'DATA_MANAGER') {
      return true;
    }

    this.router.navigate(['/unauthorized']);
    return false;
  }
}