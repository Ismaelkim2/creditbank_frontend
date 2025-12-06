import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = 'http://localhost:8080/api/reports';

  constructor(private http: HttpClient) {}

getReport(type: string, startDate?: string, endDate?: string): Observable<any[]> {
  let params = new HttpParams().set('type', type);
  if (startDate?.trim()) params = params.set('startDate', startDate);
  if (endDate?.trim()) params = params.set('endDate', endDate);

  const token = sessionStorage.getItem('token');
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

  return this.http.get<any[]>(this.apiUrl, { headers, params });
}

// Optional: Separate endpoint for KPI summary
getKPIs(): Observable<any> {
  const token = sessionStorage.getItem('token');
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  return this.http.get<any>(`${this.apiUrl}/kpis`, { headers });
}

}
