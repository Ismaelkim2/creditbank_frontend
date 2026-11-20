
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export type TenantUnitStatus =
  | 'VACANT'
  | 'OCCUPIED'
  | 'MAINTENANCE'
  | 'INACTIVE';

export interface TenantUnitRequest {
  unitNumber: string;
  floor?: string | null;
  unitType?: string | null;
  monthlyRent: number;
  depositAmount: number;
  description?: string | null;
}

export interface TenantUnitResponse {
  id: number;
  unitNumber: string;
  floor?: string | null;
  unitType?: string | null;
  monthlyRent: number;
  depositAmount: number;
  status: TenantUnitStatus;
  description?: string | null;
  propertyId?: number;
  propertyName?: string;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantUnitPropertyOption {
  id: number;
  name: string;
  propertyCode?: string;
  propertyType?: string | null;
  imageUrl?: string | null;
  county?: string;
  town?: string;
  address?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TenantUnitService {

  private readonly propertiesEndpoint =
    `${environment.apiUrl}/tenant/properties`;

  constructor(private readonly http: HttpClient) {}

  private unitsEndpoint(propertyId: number): string {
    return `${this.propertiesEndpoint}/${propertyId}/units`;
  }

  /**
   * Builds the request body.
   *
   * Without an image: sends the existing JSON request.
   * With an image: sends multipart/form-data containing:
   *   - request: JSON unit details
   *   - image: uploaded photograph
   */
  private buildUnitRequest(
    request: TenantUnitRequest,
    image?: File | null
  ): object | FormData {

    if (!image) {
      return request;
    }

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

  /** Load registered properties for the property selector. */
  getProperties(): Observable<TenantUnitPropertyOption[]> {
    return this.http
      .get<TenantUnitPropertyOption[]>(this.propertiesEndpoint)
      .pipe(catchError(error => this.handleError(error)));
  }

  /** Load all units belonging to a selected property. */
  getUnits(propertyId: number): Observable<TenantUnitResponse[]> {
    return this.http
      .get<TenantUnitResponse[]>(this.unitsEndpoint(propertyId))
      .pipe(catchError(error => this.handleError(error)));
  }

  /** Retrieve a single unit. */
  getUnit(
    propertyId: number,
    unitId: number
  ): Observable<TenantUnitResponse> {
    return this.http
      .get<TenantUnitResponse>(
        `${this.unitsEndpoint(propertyId)}/${unitId}`
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  /** Create a unit, optionally including its photograph. */
  createUnit(
    propertyId: number,
    request: TenantUnitRequest,
    image?: File | null
  ): Observable<TenantUnitResponse> {

    const body = this.buildUnitRequest(request, image);

    return this.http
      .post<TenantUnitResponse>(
        this.unitsEndpoint(propertyId),
        body
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  /** Update a unit, optionally replacing its photograph. */
  updateUnit(
    propertyId: number,
    unitId: number,
    request: TenantUnitRequest,
    image?: File | null
  ): Observable<TenantUnitResponse> {

    const body = this.buildUnitRequest(request, image);

    return this.http
      .put<TenantUnitResponse>(
        `${this.unitsEndpoint(propertyId)}/${unitId}`,
        body
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  /** Update a unit's operational status. */
  updateUnitStatus(
    propertyId: number,
    unitId: number,
    status: TenantUnitStatus
  ): Observable<TenantUnitResponse> {
    return this.http
      .patch<TenantUnitResponse>(
        `${this.unitsEndpoint(propertyId)}/${unitId}/status`,
        { status }
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Unable to complete the unit request. Please try again.';

    if (error.status === 0) {
      message =
        'Cannot reach the server. Check your internet connection and backend availability.';
    } else if (error.status === 400) {
      message =
        this.extractMessage(error) ||
        'Some information is invalid. Check the fields and try again.';
    } else if (error.status === 401) {
      message = 'Your session may have expired. Please sign in again.';
    } else if (error.status === 403) {
      message = 'You do not have permission to manage units for this property.';
    } else if (error.status === 404) {
      message = 'The selected property or unit could not be found.';
    } else if (error.status === 409) {
      message =
        this.extractMessage(error) ||
        'A unit with these details may already exist for this property.';
    } else if (error.status >= 500) {
      message =
        this.extractMessage(error) ||
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
        body.message ??
        body.detail ??
        body.error ??
        body.title;

      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }

    return null;
  }
}
