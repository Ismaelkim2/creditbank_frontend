
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface TenantPropertyRecord {
  id: number;
  propertyCode: string;
  name: string;
  propertyType: string;
  county: string;
  town: string;
  address: string;
  description: string;
  imageUrl?: string | null;
  status: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUnitRecord {
  id: number;
  propertyId: number;
  propertyCode: string;
  propertyName: string;
  unitNumber: string;
  floor: string;
  unitType: string;
  monthlyRent: number;
  depositAmount: number;
  status: string;
  description: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantResidentRecord {
  id: number;
  fullName: string;
  identificationType: string;
  identificationNumber: string;
  phoneNumber: string;
  email: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  imageUrl?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnitDirectoryResult {
  units: TenantUnitRecord[];
  failedPropertyIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class TenantDirectoryService {

  private readonly propertiesUrl =
    `${environment.apiUrl}/tenant/properties`;

  private readonly residentsUrl =
    `${environment.apiUrl}/tenant/residents`;

  constructor(private readonly http: HttpClient) {}

  getProperties(): Observable<TenantPropertyRecord[]> {
    return this.http.get<TenantPropertyRecord[]>(
      this.propertiesUrl
    );
  }

  /**
 * Resolves property image paths against the Spring Boot backend.
 *
 * Supports:
 * 1. Relative paths: /uploads/properties/property.jpg
 * 2. Absolute HTTP/HTTPS image URLs.
 */
getPropertyImageUrl(
  imageUrl: string | null | undefined
): string {
  if (!imageUrl) {
    return '';
  }

  const cleanedUrl = imageUrl.trim();

  if (!cleanedUrl) {
    return '';
  }

  // Preserve already complete image URLs.
  if (/^https?:\/\//i.test(cleanedUrl)) {
    return cleanedUrl;
  }

  try {
    // Static uploads are served from the backend root.
    const backendOrigin = new URL(environment.apiUrl).origin;

    return `${backendOrigin}/${cleanedUrl.replace(/^\/+/, '')}`;
  } catch (error) {
    console.error('Could not resolve property image URL:', error);
    return '';
  }
}

  getProperty(id: number): Observable<TenantPropertyRecord> {
    return this.http.get<TenantPropertyRecord>(
      `${this.propertiesUrl}/${id}`
    );
  }

  getUnits(propertyId: number): Observable<TenantUnitRecord[]> {
    return this.http.get<TenantUnitRecord[]>(
      `${this.propertiesUrl}/${propertyId}/units`
    );
  }

  getResidents(): Observable<TenantResidentRecord[]> {
    return this.http.get<TenantResidentRecord[]>(
      this.residentsUrl
    );
  }

  getResident(id: number): Observable<TenantResidentRecord> {
    return this.http.get<TenantResidentRecord>(
      `${this.residentsUrl}/${id}`
    );
  }

  /**
   * The backend currently exposes units by property.
   * Fetch each property's units and preserve successful results
   * if one property's request fails.
   */
  getUnitsAcrossProperties(
    properties: TenantPropertyRecord[]
  ): Observable<UnitDirectoryResult> {

    if (!properties.length) {
      return of({
        units: [],
        failedPropertyIds: []
      });
    }

    return forkJoin(
      properties.map(property =>
        this.getUnits(property.id).pipe(
          map(units => ({
            propertyId: property.id,
            units,
            failed: false
          })),
          catchError(error => {
            console.error(
              `Could not load units for property ${property.id}`,
              error
            );

            return of({
              propertyId: property.id,
              units: [] as TenantUnitRecord[],
              failed: true
            });
          })
        )
      )
    ).pipe(
      map(results => ({
        units: results.flatMap(result => result.units),
        failedPropertyIds: results
          .filter(result => result.failed)
          .map(result => result.propertyId)
      }))
    );
  }
}
