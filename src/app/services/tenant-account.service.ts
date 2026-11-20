
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

import {
  TenantAccountSummary,
  TenantRentStatement
} from '../../models/tenant-account.model';

@Injectable({
  providedIn: 'root'
})
export class TenantAccountService {

  private readonly apiUrl =
    `${environment.apiUrl}/tenant/rent`;

  constructor(private readonly http: HttpClient) {}

  getAccounts(): Observable<TenantAccountSummary[]> {
    return this.http.get<TenantAccountSummary[]>(
      `${this.apiUrl}/accounts`
    );
  }

  getAccount(leaseId: number): Observable<TenantAccountSummary> {
    return this.http.get<TenantAccountSummary>(
      `${this.apiUrl}/leases/${leaseId}/account`
    );
  }

  getStatement(
    leaseId: number,
    from: string,
    to: string
  ): Observable<TenantRentStatement> {

    const params = new HttpParams()
      .set('from', from)
      .set('to', to);

    return this.http.get<TenantRentStatement>(
      `${this.apiUrl}/leases/${leaseId}/statement`,
      { params }
    );
  }
}
