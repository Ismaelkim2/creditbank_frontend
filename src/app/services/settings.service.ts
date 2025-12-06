import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface SystemSettings {
  durationInWeeks: number;
  interestRate: number;
  penaltyRate: number;
  gracePeriodDays: number;
  maxLoanAmount: number;
  autoApproval: boolean;
}

export interface LoanSetting {
  id?: number;
  durationInWeeks: number;
  interestRate: number;
  penaltyRate: number;
  gracePeriodDays: number;
  maxLoanAmount: number;
  autoApproval: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = 'http://localhost:8080/api/settings';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders().set('Authorization', 'Bearer ' + token);
  }

  getLoanSettings(): Observable<LoanSetting[]> {
    return this.http.get<LoanSetting[]>(`${this.apiUrl}/all`, {
      headers: this.getAuthHeaders()
    });
  }

  saveLoanSetting(setting: LoanSetting): Observable<LoanSetting> {
    return this.http.post<LoanSetting>(this.apiUrl, setting, {
      headers: this.getAuthHeaders()
    });
  }

  getSettingsByDuration(weeks: number): Observable<LoanSetting> {
    return this.http.get<LoanSetting>(`${this.apiUrl}/duration/${weeks}`, {
      headers: this.getAuthHeaders()
    });
  }

  getSettings(): Observable<SystemSettings> {
    return this.http.get<SystemSettings>(`${this.apiUrl}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateSettings(settings: SystemSettings): Observable<SystemSettings> {
    return this.http.put<SystemSettings>(`${this.apiUrl}`, settings, {
      headers: this.getAuthHeaders()
    });
  }

  deleteLoanSetting(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }
}
