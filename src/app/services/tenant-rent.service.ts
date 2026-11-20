
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export type RentChargeStatus =
  | 'OPEN'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE';

export type RentPaymentMethod =
  | 'MPESA'
  | 'BANK_TRANSFER'
  | 'CASH'
  | 'OTHER';

export type RentPaymentStatus = 'POSTED' | 'REVERSED';

export interface TenantRentChargeResponse {
  id: number;
  leaseId: number;
  leaseCode: string;
  tenantId: number;
  tenantName: string;
  propertyId: number;
  propertyName: string;
  unitId: number;
  unitNumber: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: RentChargeStatus;
}

export interface TenantRentPaymentAllocation {
  chargeId: number;
  rentalPeriod: string;
  amount: number;
}

export interface TenantRentPaymentResponse {
  id: number;
  leaseId: number;
  leaseCode: string;
  tenantName: string;
  paymentReference: string;
  amount: number;
  paymentMethod: RentPaymentMethod;
  status: RentPaymentStatus;
  receivedAt: string;
  notes: string | null;
  allocations: TenantRentPaymentAllocation[];
  reversedAt: string | null;
  reversalReason: string | null;
}

export interface TenantRentPaymentRequest {
  leaseId: number;
  paymentReference: string;
  amount: number;
  paymentMethod: RentPaymentMethod;
  notes: string | null;
}

export interface TenantRentLeaseOption {
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
  status: 'DRAFT' | 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
  monthlyRent: number;
}

@Injectable({
  providedIn: 'root'
})
export class TenantRentService {
  private readonly rentUrl = `${environment.apiUrl}/tenant/rent`;
  private readonly leasesUrl = `${environment.apiUrl}/tenant/leases`;

  constructor(private readonly http: HttpClient) {}

  getCharges(): Observable<TenantRentChargeResponse[]> {
    return this.http.get<TenantRentChargeResponse[]>(
      `${this.rentUrl}/charges`
    ).pipe(catchError(error => this.handleError(error)));
  }

  getChargesForLease(
    leaseId: number
  ): Observable<TenantRentChargeResponse[]> {
    return this.http.get<TenantRentChargeResponse[]>(
      `${this.rentUrl}/leases/${leaseId}/charges`
    ).pipe(catchError(error => this.handleError(error)));
  }

  getPayments(): Observable<TenantRentPaymentResponse[]> {
    return this.http.get<TenantRentPaymentResponse[]>(
      `${this.rentUrl}/payments`
    ).pipe(catchError(error => this.handleError(error)));
  }

  recordPayment(
    request: TenantRentPaymentRequest
  ): Observable<TenantRentPaymentResponse> {
    return this.http.post<TenantRentPaymentResponse>(
      `${this.rentUrl}/payments`,
      request
    ).pipe(catchError(error => this.handleError(error)));
  }

  reversePayment(
    paymentId: number,
    reason: string
  ): Observable<TenantRentPaymentResponse> {
    return this.http.patch<TenantRentPaymentResponse>(
      `${this.rentUrl}/payments/${paymentId}/reverse`,
      { reason }
    ).pipe(catchError(error => this.handleError(error)));
  }

  getLeases(): Observable<TenantRentLeaseOption[]> {
    return this.http.get<TenantRentLeaseOption[]>(
      this.leasesUrl
    ).pipe(catchError(error => this.handleError(error)));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message =
      'Unable to complete the rent request. Please try again.';

    if (error.status === 0) {
      message =
        'Cannot reach the server. Check your internet connection and backend availability.';
    } else if (error.status === 400) {
      message = this.extractMessage(error) ||
        'The request contains invalid information. Check the amount, reference and required fields.';
    } else if (error.status === 401) {
      message = 'Your session may have expired. Please sign in again.';
    } else if (error.status === 403) {
      message = 'You do not have permission to manage rent for this account.';
    } else if (error.status === 404) {
      message = this.extractMessage(error) ||
        'The requested rent charge, lease or payment could not be found.';
    } else if (error.status === 409) {
      message = this.extractMessage(error) ||
        'This payment reference may already exist. Verify the transaction before retrying.';
    } else if (error.status >= 500) {
      message = this.extractMessage(error) ||
        'A server error occurred while processing rent. Please try again later.';
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
