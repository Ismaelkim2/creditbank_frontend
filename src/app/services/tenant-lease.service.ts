
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export type TenantLeaseStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'TERMINATED'
  | 'EXPIRED';

export type TenantUnitStatus =
  | 'VACANT'
  | 'OCCUPIED'
  | 'MAINTENANCE'
  | 'INACTIVE';

export interface TenantLeaseRequest {
  tenantId: number;
  unitId: number;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  rentDueDay: number;
  terms: string | null;
}

export interface TenantLeaseResponse {
  id: number;
  leaseCode: string;
  tenantId: number;
  tenantName: string;
  propertyId: number;
  propertyName: string;
  unitId: number;
  unitNumber: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  rentDueDay: number;
  status: TenantLeaseStatus;
  terms: string | null;
  terminatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaseTenantOption {
  id: number;
  fullName: string;
  identificationNumber?: string;
  phoneNumber?: string;
  status?: string;
}

export interface LeasePropertyOption {
  id: number;
  name: string;
  propertyCode?: string;
  county?: string;
  town?: string;
  address?: string;
}

export interface LeaseUnitOption {
  id: number;
  unitNumber: string;
  floor?: string | null;
  unitType?: string | null;
  monthlyRent: number;
  depositAmount: number;
  status: TenantUnitStatus;
  propertyId?: number;
  propertyName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TenantLeaseService {
  private readonly baseUrl = `${environment.apiUrl}/tenant`;
  private readonly leasesUrl = `${this.baseUrl}/leases`;
  private readonly propertiesUrl = `${this.baseUrl}/properties`;
  private readonly residentsUrl = `${this.baseUrl}/residents`;

  constructor(private readonly http: HttpClient) {}

  getLeases(): Observable<TenantLeaseResponse[]> {
    return this.http.get<TenantLeaseResponse[]>(this.leasesUrl)
      .pipe(catchError(error => this.handleError(error)));
  }

  getLease(leaseId: number): Observable<TenantLeaseResponse> {
    return this.http.get<TenantLeaseResponse>(`${this.leasesUrl}/${leaseId}`)
      .pipe(catchError(error => this.handleError(error)));
  }

  createLease(request: TenantLeaseRequest): Observable<TenantLeaseResponse> {
    return this.http.post<TenantLeaseResponse>(this.leasesUrl, request)
      .pipe(catchError(error => this.handleError(error)));
  }

  activateLease(leaseId: number): Observable<TenantLeaseResponse> {
    return this.http.patch<TenantLeaseResponse>(
      `${this.leasesUrl}/${leaseId}/activate`,
      {}
    ).pipe(catchError(error => this.handleError(error)));
  }

  terminateLease(leaseId: number): Observable<TenantLeaseResponse> {
    return this.http.patch<TenantLeaseResponse>(
      `${this.leasesUrl}/${leaseId}/terminate`,
      {}
    ).pipe(catchError(error => this.handleError(error)));
  }

  getTenants(): Observable<LeaseTenantOption[]> {
    return this.http.get<LeaseTenantOption[]>(this.residentsUrl)
      .pipe(catchError(error => this.handleError(error)));
  }

  getProperties(): Observable<LeasePropertyOption[]> {
    return this.http.get<LeasePropertyOption[]>(this.propertiesUrl)
      .pipe(catchError(error => this.handleError(error)));
  }

  getUnits(propertyId: number): Observable<LeaseUnitOption[]> {
    return this.http.get<LeaseUnitOption[]>(
      `${this.propertiesUrl}/${propertyId}/units`
    ).pipe(catchError(error => this.handleError(error)));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'The request could not be completed. Please try again.';

    if (error.status === 0) {
      message = 'Cannot reach the server. Check your connection and backend availability.';
    } else if (error.status === 400) {
      message = this.extractMessage(error) ||
        'The submitted information is invalid. Check the dates, rent and required fields.';
    } else if (error.status === 401) {
      message = 'Your session may have expired. Please sign in again.';
    } else if (error.status === 403) {
      message = 'You do not have permission to manage these leases.';
    } else if (error.status === 404) {
      message = this.extractMessage(error) ||
        'The requested lease, tenant, property or unit could not be found.';
    } else if (error.status === 409) {
      message = this.extractMessage(error) ||
        'This unit may already have an active lease. Refresh the list and check its status.';
    } else if (error.status >= 500) {
      message = this.extractMessage(error) ||
        'A server error occurred. Please try again later.';
    } else {
      message = this.extractMessage(error) || message;
    }

    return throwError(() => new Error(message));
  }

  private extractMessage(error: HttpErrorResponse): string | null {
    const body = error.error;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body === 'object') {
      const candidate =
        body.message ?? body.detail ?? body.error ?? body.title;

      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }

    return null;
  }
}
