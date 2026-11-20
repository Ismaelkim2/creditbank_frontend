
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TenantDashboardResponse {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  activeTenants: number;
  activeLeases: number;
  occupancyRate: number;
  rentChargedThisMonth: number;
  rentCollectedThisMonth: number;
  outstandingRent: number;
  overdueArrears: number;
  overdueCharges: number;
  collectionRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class TenantDashboardService {

  private readonly endpoint =
    `${environment.apiUrl}/tenant/dashboard`;

  constructor(private http: HttpClient) {}

  getDashboard(
    from: string,
    to: string
  ): Observable<TenantDashboardResponse> {

    const params = new HttpParams()
      .set('from', from)
      .set('to', to);

    return this.http.get<TenantDashboardResponse>(
      this.endpoint,
      { params }
    );
  }
}
