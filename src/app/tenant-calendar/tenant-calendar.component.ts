import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  takeUntil
} from 'rxjs/operators';
import { CalendarEventPayload, TenantRecipient, TenantReminder, TenantRemindersService } from '../services/tenant-reminders.service';



type CalendarView = 'MONTH' | 'WEEK' | 'DAY';

type CalendarFilter =
  | 'ALL'
  | 'CALENDAR'
  | 'RENT_DUE'
  | 'RENT_OVERDUE'
  | 'LEASE_EXPIRY'
  | 'MAINTENANCE'
  | 'DOCUMENT'
  | 'FOLLOW_UP';

interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: TenantReminder[];
}

interface CalendarEditor {
  id: number | null;
  title: string;
  message: string;
  dueDate: string;
  startTime: string;
  hasTime: boolean;
  amount: number | null;
  tenantId: number | null;
  propertyId: number | null;
  unitId: number | null;
  tenantSearch: string;
  selectedTenant: TenantRecipient | null;
}

@Component({
  selector: 'app-tenant-calendar',
  templateUrl: './tenant-calendar.component.html',
  styleUrls: ['./tenant-calendar.component.css']
})
export class TenantCalendarComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  private tenantSearch$ = new Subject<string>();

  readonly weekdays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  readonly filters: { value: CalendarFilter; label: string; icon: string }[] = [
    { value: 'ALL', label: 'All events', icon: 'fa-layer-group' },
    { value: 'CALENDAR', label: 'Calendar events', icon: 'fa-calendar-plus' },
    { value: 'RENT_DUE', label: 'Rent due', icon: 'fa-money-bill-wave' },
    { value: 'RENT_OVERDUE', label: 'Overdue rent', icon: 'fa-triangle-exclamation' },
    { value: 'LEASE_EXPIRY', label: 'Lease expiry', icon: 'fa-file-contract' },
    { value: 'MAINTENANCE', label: 'Maintenance', icon: 'fa-screwdriver-wrench' },
    { value: 'DOCUMENT', label: 'Documents', icon: 'fa-file-lines' },
    { value: 'FOLLOW_UP', label: 'Follow-ups', icon: 'fa-phone' }
  ];

  readonly hours = Array.from({ length: 14 }, (_, index) => index + 7);

  view: CalendarView = 'MONTH';
  activeFilter: CalendarFilter = 'ALL';

  currentDate = new Date();
  selectedDate = new Date();

  calendarDays: CalendarDay[] = [];
  events: TenantReminder[] = [];
  selectedDayEvents: TenantReminder[] = [];

  loading = false;
  saving = false;
  actionLoadingId: number | null = null;

  errorMessage = '';
  successMessage = '';

  editorOpen = false;
  editorError = '';
  editingEventId: number | null = null;

  tenantResults: TenantRecipient[] = [];
  tenantSearchLoading = false;
  tenantSearchError = '';
  tenantDropdownOpen = false;

  editor: CalendarEditor = this.emptyEditor();

  constructor(
    private remindersService: TenantRemindersService
  ) {}

  ngOnInit(): void {
    this.configureTenantSearch();
    this.refreshCalendar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================================================
  // DATE HELPERS
  // =========================================================

  private emptyEditor(): CalendarEditor {
    return {
      id: null,
      title: '',
      message: '',
      dueDate: this.toDateKey(new Date()),
      startTime: '09:00',
      hasTime: false,
      amount: null,
      tenantId: null,
      propertyId: null,
      unitId: null,
      tenantSearch: '',
      selectedTenant: null
    };
  }

  toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseDate(dateValue: string | Date | null | undefined): Date | null {
    if (!dateValue) {
      return null;
    }

    if (dateValue instanceof Date) {
      return new Date(
        dateValue.getFullYear(),
        dateValue.getMonth(),
        dateValue.getDate()
      );
    }

    const parts = String(dateValue).substring(0, 10).split('-');

    if (parts.length !== 3) {
      return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

  private addDays(date: Date, amount: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  private startOfWeek(date: Date): Date {
    const result = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const day = result.getDay();
    const difference = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + difference);
    return result;
  }

  private getVisibleRange(): { from: string; to: string } {
    if (this.view === 'DAY') {
      const key = this.toDateKey(this.currentDate);
      return { from: key, to: key };
    }

    if (this.view === 'WEEK') {
      const start = this.startOfWeek(this.currentDate);
      const end = this.addDays(start, 6);

      return {
        from: this.toDateKey(start),
        to: this.toDateKey(end)
      };
    }

    const firstOfMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      1
    );

    const gridStart = this.startOfWeek(firstOfMonth);
    const gridEnd = this.addDays(gridStart, 41);

    return {
      from: this.toDateKey(gridStart),
      to: this.toDateKey(gridEnd)
    };
  }

  get calendarHeading(): string {
    if (this.view === 'DAY') {
      return this.currentDate.toLocaleDateString('en-KE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }

    if (this.view === 'WEEK') {
      const start = this.startOfWeek(this.currentDate);
      const end = this.addDays(start, 6);

      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString('en-KE', {
          month: 'long'
        })} ${start.getFullYear()}`;
      }

      return `${start.toLocaleDateString('en-KE', {
        month: 'short',
        day: 'numeric'
      })} – ${end.toLocaleDateString('en-KE', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`;
    }

    return this.currentDate.toLocaleDateString('en-KE', {
      month: 'long',
      year: 'numeric'
    });
  }

  get todayKey(): string {
    return this.toDateKey(new Date());
  }

  // =========================================================
  // CALENDAR NAVIGATION
  // =========================================================

  setView(view: CalendarView): void {
    if (this.view === view) {
      return;
    }

    this.view = view;
    this.currentDate = new Date(this.selectedDate);
    this.refreshCalendar();
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.refreshCalendar();
  }

  navigate(direction: number): void {
    const next = new Date(this.currentDate);

    if (this.view === 'MONTH') {
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
    } else if (this.view === 'WEEK') {
      next.setDate(next.getDate() + direction * 7);
    } else {
      next.setDate(next.getDate() + direction);
    }

    this.currentDate = next;
    this.selectedDate = new Date(next);
    this.refreshCalendar();
  }

  selectDate(date: Date): void {
    this.selectedDate = new Date(date);
    this.selectedDayEvents = this.getEventsForDate(this.toDateKey(date));
  }

  selectDateAndOpenDay(date: Date): void {
    this.selectedDate = new Date(date);
    this.currentDate = new Date(date);
    this.view = 'DAY';
    this.refreshCalendar();
  }

  // =========================================================
  // LOAD CALENDAR DATA
  // =========================================================

  refreshCalendar(): void {
    const range = this.getVisibleRange();

    this.loading = true;
    this.errorMessage = '';

    this.remindersService.getCalendarEvents(range.from, range.to)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (items: TenantReminder[]) => {
          this.events = (items || []).slice().sort((a, b) => {
            const first = this.eventDateTime(a);
            const second = this.eventDateTime(b);
            return first.localeCompare(second);
          });

          this.buildCalendarDays();
          this.selectedDayEvents = this.getEventsForDate(
            this.toDateKey(this.selectedDate)
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to load calendar events.'
          );

          this.events = [];
          this.buildCalendarDays();
          this.selectedDayEvents = [];
        }
      });
  }

  private buildCalendarDays(): void {
    const range = this.getVisibleRange();
    const from = this.parseDate(range.from);

    if (!from) {
      this.calendarDays = [];
      return;
    }

    let days: Date[] = [];

    if (this.view === 'MONTH') {
      days = Array.from(
        { length: 42 },
        (_, index) => this.addDays(from, index)
      );
    } else if (this.view === 'WEEK') {
      days = Array.from(
        { length: 7 },
        (_, index) => this.addDays(from, index)
      );
    } else {
      days = [new Date(this.currentDate)];
    }

    const today = this.todayKey;
    const selected = this.toDateKey(this.selectedDate);

    this.calendarDays = days.map(date => {
      const key = this.toDateKey(date);

      return {
        date,
        dateKey: key,
        dayNumber: date.getDate(),
        isCurrentMonth:
          date.getMonth() === this.currentDate.getMonth(),
        isToday: key === today,
        isSelected: key === selected,
        events: this.getEventsForDate(key)
      };
    });
  }

  // =========================================================
  // EVENT FILTERING AND DISPLAY
  // =========================================================

  get filteredEvents(): TenantReminder[] {
    if (this.activeFilter === 'ALL') {
      return this.events;
    }

    return this.events.filter(
      event => event.type === this.activeFilter
    );
  }

  getEventsForDate(dateKey: string): TenantReminder[] {
    return this.filteredEvents.filter(
      event => this.eventDate(event) === dateKey
    );
  }

  get visibleSelectedDayEvents(): TenantReminder[] {
    return this.getEventsForDate(this.toDateKey(this.selectedDate));
  }

  setFilter(filter: CalendarFilter): void {
    this.activeFilter = filter;
    this.buildCalendarDays();
    this.selectedDayEvents = this.visibleSelectedDayEvents;
  }

  private eventDate(event: TenantReminder): string {
    const date = event.dueDate || event.scheduledAt || event.createdAt;
    return date ? String(date).substring(0, 10) : '';
  }

  private eventDateTime(event: TenantReminder): string {
    return String(event.scheduledAt || event.dueDate || event.createdAt || '');
  }

  eventTime(event: TenantReminder): string {
    if (!event.scheduledAt) {
      return 'All day';
    }

    const value = String(event.scheduledAt);

    if (value.length >= 16 && value.includes('T')) {
      return value.substring(11, 16);
    }

    return 'Scheduled';
  }

  eventCategoryLabel(type: string): string {
    const labels: Record<string, string> = {
      CALENDAR: 'Calendar event',
      RENT_DUE: 'Rent due',
      RENT_OVERDUE: 'Overdue rent',
      LEASE_EXPIRY: 'Lease expiry',
      MAINTENANCE: 'Maintenance',
      DOCUMENT: 'Document',
      FOLLOW_UP: 'Follow-up'
    };

    return labels[type] || type.replace(/_/g, ' ');
  }

  eventIcon(type: string): string {
    const icons: Record<string, string> = {
      CALENDAR: 'fa-calendar-check',
      RENT_DUE: 'fa-money-bill-wave',
      RENT_OVERDUE: 'fa-triangle-exclamation',
      LEASE_EXPIRY: 'fa-file-contract',
      MAINTENANCE: 'fa-screwdriver-wrench',
      DOCUMENT: 'fa-file-lines',
      FOLLOW_UP: 'fa-phone'
    };

    return icons[type] || 'fa-calendar';
  }

  eventCssClass(event: TenantReminder): string {
    const classes: Record<string, string> = {
      CALENDAR: 'event-calendar',
      RENT_DUE: 'event-rent-due',
      RENT_OVERDUE: 'event-overdue',
      LEASE_EXPIRY: 'event-lease',
      MAINTENANCE: 'event-maintenance',
      DOCUMENT: 'event-document',
      FOLLOW_UP: 'event-follow-up'
    };

    return classes[event.type] || 'event-default';
  }

  eventStatusLabel(status: string): string {
    return (status || 'PENDING').replace(/_/g, ' ');
  }

  getTenantName(event: TenantReminder): string {
    const item = event as any;

    return item.tenantName ||
      item.residentName ||
      (item.tenant ? item.tenant.name : '') ||
      '';
  }

  getPropertyName(event: TenantReminder): string {
    const item = event as any;

    return item.propertyName ||
      (item.property ? item.property.name : '') ||
      '';
  }

  getUnitName(event: TenantReminder): string {
    const item = event as any;

    return item.unitName ||
      item.unitNumber ||
      (item.unit ? item.unit.unitNumber : '') ||
      '';
  }

  isEditable(event: TenantReminder): boolean {
    return event.type === 'CALENDAR' &&
      !['CANCELLED', 'SENT', 'DELIVERED'].includes(event.status);
  }

  // =========================================================
  // KPI SUMMARY
  // =========================================================

  get todayEvents(): TenantReminder[] {
    return this.filteredEvents.filter(
      event => this.eventDate(event) === this.todayKey
    );
  }

  get overdueEvents(): TenantReminder[] {
    return this.filteredEvents.filter(event => {
      const date = this.eventDate(event);

      return date < this.todayKey &&
        !['CANCELLED', 'SENT', 'DELIVERED', 'FOLLOWED_UP'].includes(
          event.status
        );
    });
  }

  get upcomingEvents(): TenantReminder[] {
    return this.filteredEvents.filter(event => {
      const date = this.eventDate(event);

      return date > this.todayKey &&
        !['CANCELLED', 'SENT', 'DELIVERED'].includes(event.status);
    });
  }

  // =========================================================
  // CREATE / EDIT EVENT
  // =========================================================

  openCreateEvent(date?: Date): void {
    this.editor = this.emptyEditor();

    if (date) {
      this.editor.dueDate = this.toDateKey(date);
    } else {
      this.editor.dueDate = this.toDateKey(this.selectedDate);
    }

    this.editingEventId = null;
    this.editorError = '';
    this.tenantResults = [];
    this.tenantDropdownOpen = false;
    this.editorOpen = true;
  }

  openEditEvent(event: TenantReminder): void {
    if (!this.isEditable(event)) {
      return;
    }

    const scheduled = event.scheduledAt
      ? String(event.scheduledAt)
      : '';

    const tenantId = event.tenantId ?? null;

    this.editor = {
      id: event.id,
      title: event.title || '',
      message: event.message || '',
      dueDate: this.eventDate(event),
      startTime: scheduled.length >= 16
        ? scheduled.substring(11, 16)
        : '09:00',
      hasTime: !!scheduled,
      amount: event.amount ?? null,
      tenantId,
      propertyId: event.propertyId ?? null,
      unitId: event.unitId ?? null,
      tenantSearch: this.getTenantName(event),
      selectedTenant: null
    };

    this.editingEventId = event.id;
    this.editorError = '';
    this.tenantResults = [];
    this.tenantDropdownOpen = false;
    this.editorOpen = true;
  }

  closeEditor(): void {
    if (this.saving) {
      return;
    }

    this.editorOpen = false;
    this.editorError = '';
    this.tenantDropdownOpen = false;
  }

  saveEvent(): void {
    this.editorError = '';

    if (!this.editor.title.trim()) {
      this.editorError = 'Enter an event title.';
      return;
    }

    if (!this.editor.dueDate) {
      this.editorError = 'Select an event date.';
      return;
    }

    if (!this.editor.message.trim()) {
      this.editorError = 'Enter an event description.';
      return;
    }

    if (this.editor.hasTime && !this.editor.startTime) {
      this.editorError = 'Select the event time.';
      return;
    }

    if (
      this.editor.amount !== null &&
      (!Number.isFinite(this.editor.amount) || this.editor.amount < 0)
    ) {
      this.editorError = 'Enter a valid amount.';
      return;
    }

    const scheduledAt = this.editor.hasTime
      ? `${this.editor.dueDate}T${this.editor.startTime}:00`
      : undefined;

    const payload: CalendarEventPayload = {
      type: 'CALENDAR',
      channel: 'IN_APP',
      title: this.editor.title.trim(),
      message: this.editor.message.trim(),
      dueDate: this.editor.dueDate,
      scheduledAt,
      amount: this.editor.amount || undefined,
      tenantId: this.editor.tenantId,
      propertyId: this.editor.propertyId,
      unitId: this.editor.unitId
    };

    this.saving = true;

    const request = this.editingEventId
      ? this.remindersService.updateCalendarEvent(
          this.editingEventId,
          payload
        )
      : this.remindersService.createCalendarEvent(payload);

    request
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.saving = false)
      )
      .subscribe({
        next: () => {
          this.editorOpen = false;
          this.successMessage = this.editingEventId
            ? 'Calendar event updated successfully.'
            : 'Calendar event created successfully.';

          this.editingEventId = null;
          this.refreshCalendar();
          this.clearSuccessMessage();
        },
        error: (error: HttpErrorResponse) => {
          this.editorError = this.getErrorMessage(
            error,
            'Unable to save the calendar event.'
          );
        }
      });
  }

  // =========================================================
  // TENANT SEARCH / ASSOCIATION
  // =========================================================

  private configureTenantSearch(): void {
    this.tenantSearch$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        if (!query.trim()) {
          this.tenantResults = [];
          this.tenantSearchLoading = false;
          return;
        }

        this.tenantSearchLoading = true;
        this.tenantSearchError = '';

        this.remindersService.searchRecipients(query.trim())
          .pipe(
            takeUntil(this.destroy$),
            catchError(error => {
              this.tenantSearchError = this.getErrorMessage(
                error,
                'Unable to search tenants.'
              );

              return of([] as TenantRecipient[]);
            }),
            finalize(() => this.tenantSearchLoading = false)
          )
          .subscribe(results => {
            this.tenantResults = results || [];
            this.tenantDropdownOpen = true;
          });
      });
  }

  onTenantSearch(value: string): void {
    this.editor.tenantSearch = value;
    this.editor.tenantId = null;
    this.editor.propertyId = null;
    this.editor.unitId = null;
    this.editor.selectedTenant = null;
    this.tenantDropdownOpen = true;
    this.tenantSearch$.next(value);
  }

  selectTenant(tenant: TenantRecipient): void {
    this.editor.selectedTenant = tenant;
    this.editor.tenantId = tenant.id;
    this.editor.tenantSearch = tenant.name;
    this.editor.propertyId = tenant.propertyId ?? null;
    this.editor.unitId = tenant.unitId ?? null;
    this.tenantDropdownOpen = false;
    this.tenantResults = [];
  }

  clearTenant(): void {
    this.editor.selectedTenant = null;
    this.editor.tenantId = null;
    this.editor.propertyId = null;
    this.editor.unitId = null;
    this.editor.tenantSearch = '';
    this.tenantResults = [];
  }

  // =========================================================
  // EVENT ACTIONS
  // =========================================================

  cancelEvent(event: TenantReminder): void {
    if (!this.isEditable(event) || this.actionLoadingId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel "${event.title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.actionLoadingId = event.id;

    this.remindersService.cancel(event.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.actionLoadingId = null)
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Event cancelled successfully.';
          this.refreshCalendar();
          this.clearSuccessMessage();
        },
        error: error => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to cancel this event.'
          );
        }
      });
  }

  markFollowedUp(event: TenantReminder): void {
    if (this.actionLoadingId !== null) {
      return;
    }

    this.actionLoadingId = event.id;

    this.remindersService.markFollowedUp(event.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.actionLoadingId = null)
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Follow-up recorded successfully.';
          this.refreshCalendar();
          this.clearSuccessMessage();
        },
        error: error => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to record the follow-up.'
          );
        }
      });
  }

  // =========================================================
  // DISPLAY HELPERS
  // =========================================================

  getMonthEventCount(day: CalendarDay): number {
    return day.events.length;
  }

  getFirstEvents(day: CalendarDay): TenantReminder[] {
    return day.events.slice(0, 3);
  }

  getRemainingEventCount(day: CalendarDay): number {
    return Math.max(0, day.events.length - 3);
  }

  trackByDate(_index: number, day: CalendarDay): string {
    return day.dateKey;
  }

  trackByEvent(_index: number, event: TenantReminder): number {
    return event.id;
  }

  formatAmount(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) {
      return '';
    }

    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 2
    }).format(amount);
  }

  private clearSuccessMessage(): void {
    // A new operation replaces the previous message.
    // The message remains visible until the next user action.
  }

  private getErrorMessage(
  error: any,
  fallback: string
): string {

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error?.error?.message) {
    return error.error.message;
  }

  if (error?.error?.detail) {
    return error.error.detail;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.status === 0) {
    return 'Unable to connect to the server. Check your connection and try again.';
  }

  if (error?.status === 400) {
    return 'The backend rejected the submitted event details.';
  }

  if (error?.status === 403) {
    return 'You are not authorized to perform this action.';
  }

  if (error?.status === 404) {
    return 'The requested record could not be found.';
  }

  if (error?.status >= 500) {
    return 'The server encountered an error. Please try again.';
  }

  return fallback;
}


  get calendarEventCount(): number {
  return this.events.filter(event => event.type === 'CALENDAR').length;
}

addDaysForTemplate(date: Date, amount: number): Date {
  return this.addDays(date, amount);
}

}