import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { IdleTimerService } from './idle-timer.service';
import { environment } from '../../environments/environment';



interface RegisterRequest {
  password: string;
  role: string;
  nationalId: string;
}

interface AuthResponse {
  token?: string;
  message?: string;
  name: string;
  role: string;
  nationalId: string;
  email?: string;
  imageUrl?: string;   // ✅ Corrected consistently
  phoneNumber?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`;

  private isBrowser: boolean;
  private usernameSubject = new BehaviorSubject<string>('');

  username$ = this.usernameSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private idleService: IdleTimerService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      this.usernameSubject.next(this.getUsername());
    }
  }

  /** -------------------------
   *  🔹 Register & Login
   ---------------------------*/
  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, data);
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post(`${environment.apiUrl}/auth/login`, credentials, { withCredentials: true });

  }

  /** -------------------------
   *  🔹 Set Session After Login
   ---------------------------*/
  setSession(response: AuthResponse): void {
    if (!this.isBrowser) return;

    if (response.token) {
      sessionStorage.setItem('token', response.token);
    } else {
      console.error("❌ ERROR: No token received!");
    }

    sessionStorage.setItem('username', response.name || '');
    sessionStorage.setItem('role', (response.role || '').toUpperCase());
    sessionStorage.setItem('email', response.email || '');
    sessionStorage.setItem('nationalId', response.nationalId || '');
    sessionStorage.setItem('phoneNumber', response.phoneNumber || '');
    sessionStorage.setItem('imageUrl', response.imageUrl || ''); // ✅ Corrected

    this.usernameSubject.next(response.name || '');

    this.idleService.start();
    console.log('Stored Role:', sessionStorage.getItem('role'));
  }

  /** -------------------------
   *  🔹 Getters
   ---------------------------*/
  getEmail(): string | null {
    return this.isBrowser ? sessionStorage.getItem('email') : null;
  }

  getUsername(): string {
    return this.isBrowser ? sessionStorage.getItem('username') || '' : '';
  }

  getRole(): string {
    if (!this.isBrowser) return '';
    const role = sessionStorage.getItem('role') || '';
    return role.replace('ROLE_', '').toUpperCase();
  }

  getToken(): string {
    return this.isBrowser ? sessionStorage.getItem('token') || '' : '';
  }

  getNationalId(): string {
    return this.isBrowser ? sessionStorage.getItem('nationalId') || '' : '';
  }

  getPhoneNumber(): string {
    return this.isBrowser ? sessionStorage.getItem('phoneNumber') || '' : '';
  }

  /** -------------------------
   *  🔹 GET USER (used everywhere)
   ---------------------------*/
  getUser(): {
    name: string;
    role: string;
    email: string;
    nationalId: string;
    imageUrl?: string;
    accountNumber?: string;
    phoneNumber?: string;
  } | null {
    if (!this.isBrowser) return null;

    const name = sessionStorage.getItem('username') || '';
    const role = sessionStorage.getItem('role') || '';
    const nationalId = sessionStorage.getItem('nationalId') || '';
    const imageUrl = sessionStorage.getItem('imageUrl') || ''; // ✅ FIXED
    const accountNumber = sessionStorage.getItem('accountNumber') || '';
    const phoneNumber = sessionStorage.getItem('phoneNumber') || '';
    const email = sessionStorage.getItem('email') || '';

    if (!name && !role && !nationalId) return null;

    return { name, email, role, nationalId, imageUrl, accountNumber, phoneNumber };
  }

  /** -------------------------
   *  🔹 Logout
   ---------------------------*/
  logout(): void {
    if (!this.isBrowser) return;
    sessionStorage.clear();
    this.usernameSubject.next('');
    this.idleService.stop();
    this.router.navigate(['/login']);
  }

  /** -------------------------
   *  🔹 Role Checks
   ---------------------------*/
  isAdmin(): boolean {
    return this.getRole() === 'ADMIN';
  }

  isApplicant(): boolean {
    return this.getRole() === 'APPLICANT';
  }

  isDataManager(): boolean {
    return this.getRole() === 'DATA_MANAGER';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /** -------------------------
   *  🔹 Auth Headers
   ---------------------------*/
  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.getToken()}`
    });
  }

  /** -------------------------
   *  🔹 Get Logged-in User From API
   ---------------------------*/
  getLoggedInUser(): Observable<any> {
    const storedUser = this.getUser();

    if (storedUser && storedUser.nationalId) {
      return new Observable((observer) => {
        observer.next(storedUser);
        observer.complete();
      });
    }

    const token = this.getToken();
    if (!token) {
      return new Observable((observer) => {
        observer.error('No token found');
      });
    }

    return this.http.get<any>(`${this.baseUrl}/me`, {
      headers: this.getAuthHeaders()
    });
  }

  /** -------------------------
   *  🔹 OTP Services
   ---------------------------*/

  initiateLogin(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/login-init`, credentials);
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/verify-otp`, { email, otp });
  }

  sendOtp(phoneNumber: string, email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/send-otp`, { phoneNumber, email });
  }

  sendOtpToPhone(phoneNumber: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/send-otp`, { phoneNumber });
  }
}
