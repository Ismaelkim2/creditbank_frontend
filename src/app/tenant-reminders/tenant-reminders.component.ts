import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, forkJoin, of } from 'rxjs';
import {
  catchError,
  finalize,
  takeUntil
} from 'rxjs/operators';

import {
  TenantRemindersService,
  TenantReminder,
  ReminderChannel,
  ReminderStatus,
  RentReminderCategory,
  RentReminderCandidate,
  SpringPage
} from '../services/tenant-reminders.service';

@Component({
  selector: 'app-tenant-reminders',
  templateUrl: './tenant-reminders.component.html',
  styleUrls: ['./tenant-reminders.component.css']
})
export class TenantRemindersComponent implements OnInit, OnDestroy {

  readonly Math = Math;

  private readonly destroy$ = new Subject<void>();

  reminders: TenantReminder[] = [];
  candidates: RentReminderCandidate[] = [];

  loading = false;
  previewLoading = false;
  generating = false;
  actionId: number | null = null;

  errorMessage = '';
  successMessage = '';

  category: RentReminderCategory = 'ALL';
  daysAhead = 7;
  channel: ReminderChannel = 'IN_APP';

  searchTerm = '';
  statusFilter = 'ALL';
  page = 0;
  pageSize = 10;

  totalElements = 0;
  totalPages = 0;
  eligibleCount = 0;

  readonly categories: {
    value: RentReminderCategory;
    label: string;
    description: string;
  }[] = [
    {
      value: 'ALL',
      label: 'All eligible rent',
      description: 'All qualifying rent charges in the selected window.'
    },
    {
      value: 'DUE_SOON',
      label: 'Due soon',
      description: 'Upcoming rent due dates.'
    },
    {
      value: 'DUE_TODAY',
      label: 'Due today',
      description: 'Rent charges due today.'
    },
    {
      value: 'OVERDUE',
      label: 'Overdue',
      description: 'Outstanding rent past its due date.'
    }
  ];

  constructor(
    private readonly remindersService: TenantRemindersService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredReminders(): TenantReminder[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.reminders.filter(reminder => {
      const matchesStatus =
        this.statusFilter === 'ALL' ||
        reminder.status === this.statusFilter;

      const searchable = [
        reminder.title,
        reminder.message,
        reminder.tenantName,
        reminder.tenantPhone,
        reminder.type,
        reminder.channel,
        reminder.status
      ].filter(Boolean).join(' ').toLowerCase();

      return matchesStatus &&
        (!term || searchable.includes(term));
    });
  }

  get pendingCount(): number {
    return this.reminders.filter(r =>
      r.status === 'PENDING' || r.status === 'SCHEDULED'
    ).length;
  }

  get failedCount(): number {
    return this.reminders.filter(r => r.status === 'FAILED').length;
  }

  get overdueCandidatesCount(): number {
    return this.candidates.filter(c => c.category === 'OVERDUE').length;
  }

  get candidateOutstandingTotal(): number {
    return this.candidates.reduce(
      (sum, candidate) => sum + Number(candidate.outstandingAmount || 0),
      0
    );
  }

 loadDashboard(): void {
  this.loading = true;
  this.errorMessage = '';

  forkJoin({
    reminders: this.remindersService
      .list(this.page, this.pageSize),

    count: this.remindersService
      .getEligibleRentRecipientCount(this.category, this.daysAhead)
      .pipe(
        catchError(() => of({ count: 0 }))
      )
  })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    )
    .subscribe({
      next: ({ reminders, count }) => {
        this.applyPage(reminders);
        this.eligibleCount = count.count ?? 0;
      },

      error: error => {
        this.errorMessage = this.messageOf(
          error,
          'Unable to load reminder records. Please try again.'
        );
      }
    });
}

 refresh(): void {
  if (this.loading || this.previewLoading || this.generating) {
    return;
  }

  this.successMessage = '';
  this.errorMessage = '';

  this.loadDashboard();
  this.previewEligible();
}

  previewEligible(): void {
    this.previewLoading = true;
    this.errorMessage = '';
    this.candidates = [];

    this.remindersService
      .getEligibleRentRecipients(this.category, this.daysAhead)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.previewLoading = false)
      )
      .subscribe({
        next: candidates => {
          this.candidates = candidates ?? [];
          this.eligibleCount = new Set(
            this.candidates.map(c => c.tenantId)
          ).size;
        },
        error: error => {
          this.errorMessage = this.messageOf(
            error,
            'Unable to load eligible tenants.'
          );
        }
      });
  }

 onCriteriaChange(): void {
  this.daysAhead = Math.min(
    60,
    Math.max(1, Number(this.daysAhead) || 1)
  );

  this.page = 0;
  this.successMessage = '';
  this.errorMessage = '';

  this.previewEligible();
  this.loadDashboard();
}

  generateAutomatically(): void {
    if (this.generating) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.generating = true;

    this.remindersService
      .generateRentReminders(
        this.category,
        this.daysAhead,
        this.channel
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.generating = false)
      )
      .subscribe({
        next: result => {
          const created = Number(result?.created ?? 0);

          this.successMessage =
            created === 0
              ? 'No new reminders were created. Eligible reminders may already exist.'
              : `${created} rent reminder${created === 1 ? '' : 's'} created successfully.`;

          this.page = 0;
          this.loadDashboard();
          this.previewEligible();
        },
        error: error => {
          this.errorMessage = this.messageOf(
            error,
            'Automatic reminder generation failed.'
          );
        }
      });
  }

  cancelReminder(reminder: TenantReminder): void {
    if (this.actionId !== null) {
      return;
    }

    if (!confirm(`Cancel reminder "${reminder.title}"?`)) {
      return;
    }

    this.runAction(
      reminder.id,
      () => this.remindersService.cancel(reminder.id),
      'Reminder cancelled successfully.'
    );
  }

  markFollowedUp(reminder: TenantReminder): void {
    if (this.actionId !== null) {
      return;
    }

    this.runAction(
      reminder.id,
      () => this.remindersService.markFollowedUp(reminder.id),
      'Reminder marked as followed up.'
    );
  }

  retryReminder(reminder: TenantReminder): void {
    if (this.actionId !== null) {
      return;
    }

    if (!confirm('Request a retry for this failed reminder?')) {
      return;
    }

    this.runAction(
      reminder.id,
      () => this.remindersService.retry(reminder.id),
      'Reminder retry requested.'
    );
  }

  changePage(nextPage: number): void {
    if (
      nextPage < 0 ||
      (this.totalPages > 0 && nextPage >= this.totalPages)
    ) {
      return;
    }

    this.page = nextPage;
    this.loadDashboard();
  }

  changePageSize(size: number): void {
    this.pageSize = Math.min(100, Math.max(1, size));
    this.page = 0;
    this.loadDashboard();
  }

  statusClass(status: ReminderStatus): string {
    switch (status) {
      case 'DELIVERED':
      case 'SENT':
        return 'status-success';
      case 'FAILED':
        return 'status-danger';
      case 'PROCESSING':
        return 'status-info';
      case 'SCHEDULED':
        return 'status-primary';
      case 'CANCELLED':
        return 'status-muted';
      case 'FOLLOWED_UP':
        return 'status-purple';
      default:
        return 'status-warning';
    }
  }

  formatMoney(value?: number | null): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  }

 formatDate(value?: string | null): string {
  if (!value) {
    return '—';
  }

  let date: Date;

  // Handle date-only values without UTC timezone shifting.
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dateOnlyMatch) {
    date = new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3])
    );
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

  trackByReminderId(
    index: number,
    reminder: TenantReminder
  ): number {
    return reminder.id;
  }

  private applyPage(page: SpringPage<TenantReminder>): void {
    this.reminders = page.content ?? [];
    this.totalElements = page.totalElements ?? 0;
    this.totalPages = page.totalPages ?? 0;
  }

  private runAction(
    id: number,
    action: () => import('rxjs').Observable<TenantReminder>,
    success: string
  ): void {
    this.actionId = id;
    this.errorMessage = '';
    this.successMessage = '';

    action()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.actionId = null)
      )
      .subscribe({
        next: () => {
          this.successMessage = success;
          this.loadDashboard();
        },
        error: error => {
          this.errorMessage = this.messageOf(
            error,
            'The reminder action failed.'
          );
        }
      });
  }

  private messageOf(error: unknown, fallback: string): string {

  if (error instanceof HttpErrorResponse) {
    return error.error?.message ||
           error.error?.error ||
           fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

selectedReminder: TenantReminder | null = null;

viewReminderDetails(reminder: TenantReminder): void {
  this.selectedReminder = reminder;
}

closeReminderDetails(): void {
  this.selectedReminder = null;
}

}