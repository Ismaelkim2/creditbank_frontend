import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type PropertyType =
  | 'RESIDENTIAL'
  | 'COMMERCIAL'
  | 'MIXED_USE'
  | 'INDUSTRIAL'
  | 'LAND'
  | 'OTHER';

export interface TenantPropertyRequest {
  propertyCode: string;
  name: string;
  propertyType: PropertyType;
  county: string;
  town: string;
  address: string;
  description: string;
}

export interface TenantPropertyResponse {
  id: number;
  propertyCode: string;
  name: string;
  propertyType: PropertyType;
  county: string;
  town: string;
  address: string;
  description: string;
  imageUrl?: string | null;
  status?: string;
  ownerId?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TenantPropertyService {

  private readonly endpoint =
    `${environment.apiUrl}/tenant/properties`;

  constructor(private readonly http: HttpClient) {}

  createProperty(
    formData: FormData
  ): Observable<TenantPropertyResponse> {
    return this.http.post<TenantPropertyResponse>(
      this.endpoint,
      formData
    );
  }

  getProperties(): Observable<TenantPropertyResponse[]> {
    return this.http.get<TenantPropertyResponse[]>(
      this.endpoint
    );
  }

  getProperty(id: number): Observable<TenantPropertyResponse> {
    return this.http.get<TenantPropertyResponse>(
      `${this.endpoint}/${id}`
    );
  }

updateProperty(
  id: number,
  formData: FormData
): Observable<TenantPropertyResponse> {
  return this.http.put<TenantPropertyResponse>(
    `${this.endpoint}/${id}`,
    formData
  );
}

  updatePropertyStatus(
    id: number,
    status: string
  ): Observable<TenantPropertyResponse> {
    return this.http.patch<TenantPropertyResponse>(
      `${this.endpoint}/${id}/status`,
      { status }
    );
  }

/**
 * Converts backend-relative image paths into absolute URLs
 * and corrects old localhost image URLs for production.
 */
getPropertyImageUrl(
  imageUrl?: string | null
): string | null {
  if (!imageUrl?.trim()) {
    return null;
  }

  const cleanedUrl = imageUrl.trim();

  try {
    const backendOrigin = new URL(environment.apiUrl).origin;

    // Handle absolute URLs.
    if (/^https?:\/\//i.test(cleanedUrl)) {
      const parsedUrl = new URL(cleanedUrl);

      // Replace old local development URLs with production backend.
      if (
        parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname === '127.0.0.1'
      ) {
        return `${backendOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
      }

      // Preserve external image URLs, such as Cloudinary.
      return cleanedUrl;
    }

    // Resolve relative paths against the backend origin.
    return new URL(
      cleanedUrl.replace(/^\/+/, ''),
      `${backendOrigin}/`
    ).toString();

  } catch (error) {
    console.error(
      'Unable to resolve property image URL:',
      cleanedUrl,
      error
    );

    return null;
  }
}
}