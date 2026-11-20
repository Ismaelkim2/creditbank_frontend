
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export type IdentificationType = 'NATIONAL_ID' | 'PASSPORT';
export type TenantStatus = 'ACTIVE' | 'INACTIVE';

export interface TenantResidentRequest {
  fullName: string;
  identificationType: IdentificationType;
  identificationNumber: string;
  phoneNumber: string;
  email: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
}

export interface TenantResidentResponse {
  id: number;
  fullName: string;
  identificationType: IdentificationType;
  identificationNumber: string;
  phoneNumber: string;
  email: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  status: TenantStatus;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantStatusRequest {
  status: TenantStatus;
}

@Injectable({
  providedIn: 'root'
})
export class TenantResidentService {

  // environment.apiUrl already contains /api
  private readonly endpoint = `${environment.apiUrl}/tenant/residents`;

  constructor(private readonly http: HttpClient) {}

  private buildMultipartRequest(
    request: TenantResidentRequest,
    image: File
  ): FormData {

    const formData = new FormData();

    formData.append(
      'request',
      new Blob(
        [JSON.stringify(request)],
        { type: 'application/json' }
      )
    );

    formData.append('image', image, image.name);

    return formData;
  }

  createTenant(
    request: TenantResidentRequest,
    image?: File | null
  ): Observable<TenantResidentResponse> {

    if (image) {
      return this.http.post<TenantResidentResponse>(
        this.endpoint,
        this.buildMultipartRequest(request, image)
      ).pipe(catchError(this.handleError));
    }

    return this.http.post<TenantResidentResponse>(
      this.endpoint,
      request
    ).pipe(catchError(this.handleError));
  }

  getTenants(): Observable<TenantResidentResponse[]> {
    return this.http.get<TenantResidentResponse[]>(
      this.endpoint
    ).pipe(catchError(this.handleError));
  }

  getTenant(id: number): Observable<TenantResidentResponse> {
    return this.http.get<TenantResidentResponse>(
      `${this.endpoint}/${id}`
    ).pipe(catchError(this.handleError));
  }

  updateTenant(
    id: number,
    request: TenantResidentRequest,
    image?: File | null
  ): Observable<TenantResidentResponse> {

    if (image) {
      return this.http.put<TenantResidentResponse>(
        `${this.endpoint}/${id}`,
        this.buildMultipartRequest(request, image)
      ).pipe(catchError(this.handleError));
    }

    return this.http.put<TenantResidentResponse>(
      `${this.endpoint}/${id}`,
      request
    ).pipe(catchError(this.handleError));
  }

  updateTenantStatus(
    id: number,
    status: TenantStatus
  ): Observable<TenantResidentResponse> {
    return this.http.patch<TenantResidentResponse>(
      `${this.endpoint}/${id}/status`,
      { status } satisfies TenantStatusRequest
    ).pipe(catchError(this.handleError));
  }

  private handleError = (error: HttpErrorResponse) => {
    let message = 'Something went wrong. Please try again.';

    if (error.status === 0) {
      message = 'Cannot connect to the server. Check your connection and try again.';
    } else if (error.status === 400) {
      message = this.extractValidationMessage(error) ||
        'Some information is invalid. Review the form and try again.';
    } else if (error.status === 401) {
      message = 'Your session may have expired. Sign in again.';
    } else if (error.status === 403) {
      message = 'You are not authorised to perform this action.';
    } else if (error.status === 404) {
      message = 'The requested tenant record was not found.';
    } else if (error.status === 409) {
      message = 'A tenant with these identification details may already exist.';
    } else if (error.status >= 500) {
      message = 'The server encountered an error. Please try again later.';
    }

    return throwError(() => new Error(message));
  };

  private extractValidationMessage(
    error: HttpErrorResponse
  ): string | null {

    const body = error.error;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (!body || typeof body !== 'object') {
      return null;
    }

    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }

    if (typeof body.detail === 'string' && body.detail.trim()) {
      return body.detail;
    }

    if (body.errors && typeof body.errors === 'object') {
      const messages = Object.values(body.errors)
        .filter((value): value is string => typeof value === 'string');

      if (messages.length) {
        return messages.join(' ');
      }
    }

    return null;
  }
}
