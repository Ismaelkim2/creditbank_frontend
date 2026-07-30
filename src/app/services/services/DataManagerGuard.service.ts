import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../auth-service.service';

@Injectable({
  providedIn: 'root'
})
export class DataManagerGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

canActivate(): boolean {

  console.log('DataManagerGuard invoked');

  if (!this.authService.isLoggedIn()) {
    console.log('Not logged in');
    this.router.navigate(['/login']);
    return false;
  }

  const role = (this.authService.getRole() || '')
    .toUpperCase()
    .replace('ROLE_', '')
    .trim();

  console.log('Role in DataManagerGuard:', role);

  if (role !== 'DATA_MANAGER') {
    console.log('Access denied');
    this.router.navigate(['/unauthorized']);
    return false;
  }

  console.log('Access granted');
  return true;
}
}