import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './auth-service.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {

    // 1. Check login
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    // 2. Get user directly from storage (NO API CALL)
    const user = this.authService.getCurrentUser();

    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }


          const role = (user.role || '')
          .toString()
          .toUpperCase()
          .replace('ROLE_', '');


    // 3. Role check
    const expectedRoles: string[] = route.data['roles'] || [];

   if (expectedRoles.length > 0 && !expectedRoles.includes(role)) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  }
}