import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './auth-service.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    // Step 1: Check if logged in
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return of(false);
    }

    const expectedRole = route.data['role']?.toUpperCase();

    // Step 2: Fetch logged-in user
    return this.authService.getLoggedInUser().pipe(
      map(user => {
        // If no user, redirect to login
        if (!user) {
          this.router.navigate(['/login']);
          return false;
        }

        const role = (user.role || '').toUpperCase();

        // If route has role restriction, validate
        if (expectedRole && expectedRole !== role) {
          this.router.navigate(['/unauthorized']);
          return false;
        }

        return true;
      }),
      catchError(err => {
        console.error('AuthGuard error:', err);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
