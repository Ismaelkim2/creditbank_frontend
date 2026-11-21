
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams
} from '@angular/common/http';

import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';

// =========================================================
// REMINDER TYPES
// =========================================================

export type RentReminderCategory =
  | 'ALL'
  | 'DUE_SOON'
  | 'DUE_TODAY'
  | 'OVERDUE';

export type ReminderType =
  | 'RENT_DUE'
  | 'RENT_OVERDUE'
  | 'LEASE_EXPIRY'
  | 'MAINTENANCE'
  | 'DOCUMENT'
  | 'FOLLOW_UP'
  | 'CALENDAR';

export type ReminderStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED'
  | 'FOLLOWED_UP';

export type ReminderChannel = 'IN_APP' | 'SMS' | 'EMAIL';

// =========================================================
// RENT REMINDER MODELS
// =========================================================

export interface RentReminderCandidate {
  tenantId: number;
  tenantName: string;
  phoneNumber?: string;
  email?: string;
  leaseId: number;
  chargeId: number;
  dueDate: string;
  outstandingAmount: number;
  category: string;
}

export interface AutoGenerateReminderResult {
  created: number;
}

export interface EligibleTenantCount {
  count: number;
}

// =========================================================
// TENANT RECIPIENT
// =========================================================

export interface TenantRecipient {
  id: number;
  name: string;
  phoneNumber?: string;
  email?: string;
  propertyId?: number;
  propertyName?: string;
  unitId?: number;
  unitNumber?: string;
}

// =========================================================
// TENANT REMINDER RESPONSE
// =========================================================

export interface TenantReminder {
  id: number;

  title: string;
  message: string;

  type: ReminderType;
  status: ReminderStatus;
  channel: ReminderChannel;

  tenantId?: number | null;
  tenantName?: string | null;
  tenantPhone?: string | null;

  propertyId?: number | null;
  propertyName?: string | null;

  unitId?: number | null;
  unitNumber?: string | null;

  amount?: number | null;

  dueDate: string;
  scheduledAt?: string | null;

  createdAt: string;
  updatedAt?: string;

  lastAttemptAt?: string | null;
  attemptCount?: number;
  attempts?: number;

  assignedTo?: string | null;
  createdBy?: string | null;

  nextAttemptAt?: string | null;
  lastError?: string | null;
}

// =========================================================
// CREATE / UPDATE REMINDER PAYLOAD
// =========================================================

export interface CreateTenantReminderPayload {
  tenantId?: number | null;

  propertyId?: number | null;
  unitId?: number | null;

  title: string;
  message: string;

  type: ReminderType;
  channel?: ReminderChannel;

  dueDate: string;

  scheduledAt?: string | null;
  amount?: number | null;

  idempotencyKey?: string;
}

// =========================================================
// CALENDAR EVENT PAYLOAD
// =========================================================

export interface CalendarEventPayload {
  tenantId?: number | null;
  propertyId?: number | null;
  unitId?: number | null;

  title: string;
  message: string;

  type: 'CALENDAR';
  channel: 'IN_APP';

  dueDate: string;
  scheduledAt?: string | null;

  amount?: number | null;
}

// =========================================================
// BULK REMINDER PAYLOAD
// =========================================================

export interface BulkTenantReminderPayload {
  tenantIds: number[];
  reminder: Omit<CreateTenantReminderPayload, 'tenantId'>;
}

export interface BulkReminderResult {
  createdCount: number;
}

// =========================================================
// SPRING PAGE RESPONSE
// =========================================================

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

// =========================================================
// TENANT REMINDERS SERVICE
// =========================================================

@Injectable({
  providedIn: 'root'
})
export class TenantRemindersService {

private readonly apiUrl = `${environment.apiUrl}/tenant/reminders`;
private readonly residentsApiUrl = `${environment.apiUrl}/tenant/residents`;

  constructor(
    private readonly http: HttpClient
  ) {}

  // =======================================================
  // LIST REMINDERS
  // =======================================================

  list(
    page = 0,
    size = 10
  ): Observable<SpringPage<TenantReminder>> {

    const params = new HttpParams()
      .set('page', Math.max(0, page).toString())
      .set('size', Math.min(100, Math.max(1, size)).toString());

    return this.http
      .get<SpringPage<TenantReminder>>(this.apiUrl, { params })
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // GET ONE REMINDER
  // =======================================================

  get(id: number): Observable<TenantReminder> {

    return this.http
      .get<TenantReminder>(`${this.apiUrl}/${id}`)
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // CREATE REMINDER
  // =======================================================

  create(
    payload: CreateTenantReminderPayload
  ): Observable<TenantReminder> {

    return this.http
      .post<TenantReminder>(this.apiUrl, payload)
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // SEARCH TENANT RECIPIENTS
  // =======================================================

  searchRecipients(
    query: string
  ): Observable<TenantRecipient[]> {

    const params = new HttpParams()
      .set('q', query.trim());

    return this.http
      .get<TenantRecipient[]>(
        `${this.residentsApiUrl}/eligible`,
        { params }
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // ELIGIBLE RECIPIENT COUNT
  // =======================================================

  getEligibleRecipientCount(): Observable<EligibleTenantCount> {

    return this.http
      .get<EligibleTenantCount>(
        `${this.apiUrl}/eligible-count`
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // CREATE BULK REMINDERS
  // =======================================================

  createBulk(
    payload: BulkTenantReminderPayload
  ): Observable<TenantReminder[]> {

    return this.http
      .post<TenantReminder[]>(
        `${this.apiUrl}/bulk`,
        payload
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // CREATE REMINDERS FOR ALL ELIGIBLE TENANTS
  // =======================================================

  createForAllEligible(
    reminder: Omit<CreateTenantReminderPayload, 'tenantId'>
  ): Observable<BulkReminderResult> {

    return this.http
      .post<BulkReminderResult>(
        `${this.apiUrl}/bulk/all`,
        { reminder }
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // CANCEL REMINDER
  // =======================================================

  cancel(id: number): Observable<TenantReminder> {

    return this.http
      .post<TenantReminder>(
        `${this.apiUrl}/${id}/cancel`,
        {}
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // MARK REMINDER AS FOLLOWED UP
  // =======================================================

  markFollowedUp(id: number): Observable<TenantReminder> {

    return this.http
      .post<TenantReminder>(
        `${this.apiUrl}/${id}/follow-up`,
        {}
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // RETRY FAILED REMINDER
  // =======================================================

  retry(id: number): Observable<TenantReminder> {

    return this.http
      .post<TenantReminder>(
        `${this.apiUrl}/${id}/retry`,
        {}
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // LOAD CALENDAR EVENTS
  // GET /api/tenant/reminders/calendar?from=...&to=...
  // =======================================================

  getCalendarEvents(
    from: string,
    to: string
  ): Observable<TenantReminder[]> {

    const params = new HttpParams()
      .set('from', from)
      .set('to', to);

    return this.http
      .get<TenantReminder[]>(
        `${this.apiUrl}/calendar`,
        { params }
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // CREATE CALENDAR EVENT
  // POST /api/tenant/reminders
  // =======================================================

  createCalendarEvent(
    payload: CalendarEventPayload
  ): Observable<TenantReminder> {

    const eventPayload: CalendarEventPayload = {
      ...payload,
      type: 'CALENDAR',
      channel: 'IN_APP'
    };

    return this.http
      .post<TenantReminder>(
        this.apiUrl,
        eventPayload
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // UPDATE CALENDAR EVENT
  // PUT /api/tenant/reminders/{id}
  // =======================================================

  updateCalendarEvent(
    id: number,
    payload: CalendarEventPayload
  ): Observable<TenantReminder> {

    const eventPayload: CalendarEventPayload = {
      ...payload,
      type: 'CALENDAR',
      channel: 'IN_APP'
    };

    return this.http
      .put<TenantReminder>(
        `${this.apiUrl}/${id}`,
        eventPayload
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // RENT REMINDER ELIGIBILITY
  // =======================================================

  getEligibleRentRecipients(
    category: RentReminderCategory = 'ALL',
    daysAhead = 7
  ): Observable<RentReminderCandidate[]> {

    const params = new HttpParams()
      .set('category', category)
      .set('daysAhead', String(daysAhead));

    return this.http
      .get<RentReminderCandidate[]>(
        `${this.apiUrl}/eligible`,
        { params }
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // RENT REMINDER ELIGIBLE COUNT
  // =======================================================

  getEligibleRentRecipientCount(
    category: RentReminderCategory = 'ALL',
    daysAhead = 7
  ): Observable<EligibleTenantCount> {

    const params = new HttpParams()
      .set('category', category)
      .set('daysAhead', String(daysAhead));

    return this.http
      .get<EligibleTenantCount>(
        `${this.apiUrl}/eligible-count`,
        { params }
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // GENERATE RENT REMINDERS
  // =======================================================

  generateRentReminders(
    category: RentReminderCategory = 'ALL',
    daysAhead = 7,
    channel: ReminderChannel = 'IN_APP'
  ): Observable<AutoGenerateReminderResult> {

    const params = new HttpParams()
      .set('category', category)
      .set('daysAhead', String(daysAhead))
      .set('channel', channel);

    return this.http
      .post<AutoGenerateReminderResult>(
        `${this.apiUrl}/auto-generate`,
        {},
        { params }
      )
      .pipe(catchError(error => this.handleError(error)));
  }

  // =======================================================
  // CENTRAL ERROR HANDLER
  // =======================================================

private handleError(
  error: HttpErrorResponse
): Observable<never> {

  let message = 'The reminder request failed. Please try again.';
  const body = error?.error;

  if (error.status === 0) {
    message =
      'Cannot reach the server. Check that the backend is running and the API URL is correct.';

  } else if (error.status === 401) {
    message = 'Your session has expired. Please sign in again.';

  } else if (error.status === 403) {
    message = 'You do not have permission to perform this action.';

  } else if (error.status === 404) {
    message =
      body?.message ||
      body?.detail ||
      (typeof body === 'string' ? body : '') ||
      'The requested API endpoint or record was not found.';

  } else if (error.status === 400) {

    if (typeof body === 'string') {
      message = body;

    } else if (body?.errors && Array.isArray(body.errors)) {
      message = body.errors
        .map((item: any) => {
          if (typeof item === 'string') {
            return item;
          }

          const field = item.field || item.property || '';
          const detail =
            item.defaultMessage ||
            item.message ||
            item.error ||
            '';

          return field ? `${field}: ${detail}` : detail;
        })
        .filter(Boolean)
        .join('; ');

    } else {
      message =
        body?.message ||
        body?.detail ||
        body?.title ||
        body?.error ||
        'The backend rejected the submitted data.';

      if (body?.fieldErrors && typeof body.fieldErrors === 'object') {
        const details = Object.entries(body.fieldErrors)
          .map(([field, detail]) => `${field}: ${detail}`)
          .join('; ');

        if (details) {
          message += ` (${details})`;
        }
      }
    }

  } else if (error.status === 409) {
    message =
      body?.message ||
      'This action conflicts with an existing record.';

  } else if (error.status >= 500) {
    message =
      body?.message ||
      body?.detail ||
      'The server encountered an error while processing the request.';

  } else if (body?.message) {
    message = body.message;
  }

  return throwError(() => new Error(message));
}
}
