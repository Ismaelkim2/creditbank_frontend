import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Account } from '../../models/User.model';

@Injectable({
  providedIn: 'root'
})
export class AccountService {

  private baseUrl = 'http://localhost:8080/api/accounts';
  private activityUrl = 'http://localhost:8080/api/activity';
  private passwordUrl = 'http://localhost:8080/api/auth/change-password';

  constructor(private http: HttpClient) {}

  /** ----------------------------------------------------------------------
   *  HELPER: ATTACH TOKEN
   * ---------------------------------------------------------------------- */
  private getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  /** ----------------------------------------------------------------------
   *  ACCOUNT DETAILS
   * ---------------------------------------------------------------------- */
  getAccountDetailsByNationalId(nationalId: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/by-id/${nationalId}`,
      { headers: this.getHeaders() }
    );
  }

  getLoanDetailsByNationalId(nationalId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `http://localhost:8080/api/loans/by-nationalId/${nationalId}`,
      { headers: this.getHeaders() }
    );
  }

  createAccount(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}`, formData, {
      headers: this.getHeaders(),
    });
  }

  getAllAccounts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}`, {
      headers: this.getHeaders(),
    });
  }

  deleteAccount(accountNumber: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${accountNumber}`, {
      headers: this.getHeaders(),
    });
  }

  getByNationalId(nationalId: string): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/by-id/${nationalId}`, {
      headers: this.getHeaders(),
    });
  }

  /** ----------------------------------------------------------------------
   *  STATEMENTS
   * ---------------------------------------------------------------------- */
  saveStatement(nationalId: string, transactions: any[]): Observable<any> {
    return this.http.post(
      `http://localhost:8080/api/statements/${nationalId}`,
      transactions,
      { headers: this.getHeaders() }
    );
  }

  getStatements(nationalId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `http://localhost:8080/api/statements/${nationalId}`,
      { headers: this.getHeaders() }
    );
  }

  /** ----------------------------------------------------------------------
   *  UPDATE PROFILE (alias for updateUserProfile)
   * ---------------------------------------------------------------------- */
  updateUserProfile(payload: any): Observable<any> {
    return this.http.put(
      `http://localhost:8080/api/accounts/updateProfile`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /** ✔ REQUIRED by your component */
  updateProfile(payload: any): Observable<any> {
    return this.updateUserProfile(payload);
  }

  /** ----------------------------------------------------------------------
   *  CHANGE PASSWORD
   * ---------------------------------------------------------------------- */
  changePassword(payload: any): Observable<any> {
    return this.http.put(
      this.passwordUrl,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /** ----------------------------------------------------------------------
   *  USER ACTIVITY LOG (pagination + search)
   * ---------------------------------------------------------------------- */
  getUserActivity(page: number, query: string): Observable<any[]> {
    const q = query ? `&q=${query}` : '';
    return this.http.get<any[]>(
      `${this.activityUrl}/user?page=${page}${q}`,
      { headers: this.getHeaders() }
    );
  }
}
