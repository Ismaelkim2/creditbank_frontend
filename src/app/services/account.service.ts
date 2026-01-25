import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Account } from '../../models/User.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AccountService {

  // ✅ Separate endpoints to avoid duplicate identifier errors
  private accountsUrl = `${environment.apiUrl}/accounts`;
  private activityUrl = `${environment.apiUrl}/activity`;
  private passwordUrl = `${environment.apiUrl}/auth/change-password`;
  private statementsUrl = `${environment.apiUrl}/statements`;
  private loansUrl = `${environment.apiUrl}/loans`;

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
      `${this.accountsUrl}/by-id/${nationalId}`,
      { headers: this.getHeaders() }
    );
  }

  getLoanDetailsByNationalId(nationalId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.loansUrl}/by-nationalId/${nationalId}`,
      { headers: this.getHeaders() }
    );
  }

  createAccount(formData: FormData): Observable<any> {
    return this.http.post(`${this.accountsUrl}`, formData, {
      headers: this.getHeaders(),
    });
  }

  getAllAccounts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.accountsUrl}`, {
      headers: this.getHeaders(),
    });
  }

  deleteAccount(accountNumber: string): Observable<any> {
    return this.http.delete(`${this.accountsUrl}/${accountNumber}`, {
      headers: this.getHeaders(),
    });
  }

  getByNationalId(nationalId: string): Observable<Account> {
    return this.http.get<Account>(`${this.accountsUrl}/by-id/${nationalId}`, {
      headers: this.getHeaders(),
    });
  }

  /** ----------------------------------------------------------------------
   *  STATEMENTS
   * ---------------------------------------------------------------------- */
  saveStatement(nationalId: string, transactions: any[]): Observable<any> {
    return this.http.post(
      `${this.statementsUrl}/${nationalId}`,
      transactions,
      { headers: this.getHeaders() }
    );
  }

  getStatements(nationalId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.statementsUrl}/${nationalId}`,
      { headers: this.getHeaders() }
    );
  }

  /** ----------------------------------------------------------------------
   *  UPDATE PROFILE
   * ---------------------------------------------------------------------- */
  updateUserProfile(payload: any): Observable<any> {
    return this.http.put(
      `${this.accountsUrl}/updateProfile`,
      payload,
      { headers: this.getHeaders() }
    );
  }

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
