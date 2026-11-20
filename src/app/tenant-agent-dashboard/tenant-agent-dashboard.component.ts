
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, finalize, takeUntil, Subscription } from 'rxjs';

import {
  TenantDashboardService,
  TenantDashboardResponse
} from '../services/tenant-dashboard.service';

import { TenantAccountService } from '../services/tenant-account.service';

import {
  TenantAccountSummary,
  TenantRentStatement
} from '../../models/tenant-account.model';
import { environment } from '../../environments/environment';
import { TenantReminder, TenantRemindersService } from '../services/tenant-reminders.service';

interface DashboardCalendarDay {
  date: Date;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

interface DashboardStat {
  title: string;
  value: number;
  icon: string;
  color: string;
  description: string;
  route: string;
  actionLabel: string;
}

interface TenantQuickAction {
  title: string;
  description: string;
  route: string;
  icon: string;
  color: string;
}

interface TenantAccountTotals {
  charged: number;
  payments: number;
  outstanding: number;
  arrears: number;
  credit: number;
}

@Component({
  selector: 'app-tenant-agent-dashboard',
  templateUrl: './tenant-agent-dashboard.component.html',
  styleUrls: ['./tenant-agent-dashboard.component.css']
})
export class TenantAgentDashboardComponent
  implements OnInit, OnDestroy {

today = new Date();
    // =========================================================
// CUSTOM DASHBOARD CALENDAR
// =========================================================

readonly calendarWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

calendarViewDate = new Date();
selectedCalendarDate = new Date();
calendarDays: DashboardCalendarDay[] = [];

  dashboard: TenantDashboardResponse | null = null;

  loading = false;
  refreshing = false;
  errorMessage = '';
  lastUpdated: Date | null = null;
  quickActionsExpanded = false;

  private readonly destroy$ = new Subject<void>();

  stats: DashboardStat[] = [];

  
  // =========================================================
  // TENANT ACCOUNTS
  // =========================================================

  accounts: TenantAccountSummary[] = [];

  accountLoading = false;
  accountError = '';
  accountSearch = '';

  tenantAccountImageErrors: Record<number, boolean> = {};

dashboardDateFrom = this.getMonthStartDate();
dashboardDateTo = this.getTodayDate();

todayEvents: TenantReminder[] = [];

todayEventsLoading = false;
todayEventsError = '';

appliedDashboardDateFrom = this.dashboardDateFrom;
appliedDashboardDateTo = this.dashboardDateTo;

dateRangeError = '';
// =========================================================
// TENANT STATEMENT — INLINE EXPANSION
// =========================================================

selectedAccount: TenantAccountSummary | null = null;
selectedStatement: TenantRentStatement | null = null;

statementLoading = false;
statementError = '';

expandedStatementLeaseId: number | null = null;

private statementRequest?: Subscription;

statementFrom = this.toLocalDateString(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1)
);

statementTo = this.toLocalDateString(new Date());

printingStatement = false;

// Check whether a particular tenant's statement is expanded.
isStatementOpen(account: TenantAccountSummary): boolean {
  return Number(this.expandedStatementLeaseId) ===
         Number(account.leaseId);
}


  readonly quickActions: TenantQuickAction[] = [
    {
      title: 'Register Property',
      description: 'Add and configure a rental property.',
      route: '/app/tenant/properties/register',
      icon: 'fa-solid fa-building',
      color: 'primary'
    },
    {
      title: 'Manage Units',
      description: 'Create units and monitor availability.',
      route: '/app/tenant/units',
      icon: 'fa-solid fa-door-open',
      color: 'info'
    },
    {
      title: 'Register Tenant',
      description: 'Create a tenant profile.',
      route: '/app/tenant/register',
      icon: 'fa-solid fa-user-plus',
      color: 'success'
    },
    {
      title: 'Lease Management',
      description: 'Assign vacant units and manage tenancy agreements.',
      route: '/app/tenant/leases',
      icon: 'fa-solid fa-file-contract',
      color: 'primary'
    },
    {
      title: 'Manage Rent',
      description: 'Review rent charges, payments and arrears.',
      route: '/app/tenant/rent',
      icon: 'fa-solid fa-wallet',
      color: 'warning'
    }
  ];

  constructor(
    private readonly dashboardService: TenantDashboardService,
    private readonly accountService: TenantAccountService,
    private readonly remindersService: TenantRemindersService,
    private readonly router: Router
  ) {}

  // =========================================================
  // LIFECYCLE
  // =========================================================

ngOnInit(): void {
  this.buildCalendarDays();
  this.loadDashboard();
  this.loadTenantAccounts();
  this.loadTodayEvents();
}

 ngOnDestroy(): void {
  this.statementRequest?.unsubscribe();

  this.destroy$.next();
  this.destroy$.complete();
}

  @HostListener('window:afterprint')
  handleAfterPrint(): void {
    this.printingStatement = false;
  }

  // =========================================================
// CUSTOM CALENDAR BEHAVIOUR
// =========================================================

get calendarMonthLabel(): string {
  return this.calendarViewDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });
}

changeCalendarMonth(offset: number): void {
  this.calendarViewDate = new Date(
    this.calendarViewDate.getFullYear(),
    this.calendarViewDate.getMonth() + offset,
    1
  );

  this.buildCalendarDays();
}

goToCalendarToday(): void {
  const today = new Date();

  this.selectedCalendarDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  this.calendarViewDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  this.buildCalendarDays();
}

selectCalendarDate(date: Date): void {
  this.selectedCalendarDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  // If a date from an adjacent month is selected,
  // navigate the calendar to that month.
  this.calendarViewDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

  this.buildCalendarDays();
}

private buildCalendarDays(): void {
  const year = this.calendarViewDate.getFullYear();
  const month = this.calendarViewDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);

  // Convert JavaScript Sunday-first indexing to Monday-first.
  const mondayBasedOffset = (firstOfMonth.getDay() + 6) % 7;

  const gridStart = new Date(year, month, 1 - mondayBasedOffset);
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const selected = new Date(
    this.selectedCalendarDate.getFullYear(),
    this.selectedCalendarDate.getMonth(),
    this.selectedCalendarDate.getDate()
  );

  this.calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index
    );

    date.setHours(0, 0, 0, 0);

    return {
      date,
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
      isToday: date.getTime() === today.getTime(),
      isSelected: date.getTime() === selected.getTime()
    };
  });
}

trackByCalendarDate(
  index: number,
  day: DashboardCalendarDay
): number {
  return day.date.getTime();
}

private getTodayDate(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

private getMonthStartDate(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    '01'
  ].join('-');
}

applyDashboardDateRange(): void {

  this.dateRangeError = '';

  if (!this.dashboardDateFrom || !this.dashboardDateTo) {
    this.dateRangeError = 'Please select both start and end dates.';
    return;
  }

  if (this.dashboardDateFrom > this.dashboardDateTo) {
    this.dateRangeError = 'The start date cannot be after the end date.';
    return;
  }

  // Prevent selecting a future reporting period.
  if (this.dashboardDateTo > this.getTodayDate()) {
    this.dateRangeError = 'The end date cannot be in the future.';
    return;
  }

  this.appliedDashboardDateFrom = this.dashboardDateFrom;
  this.appliedDashboardDateTo = this.dashboardDateTo;

  this.loadDashboard();
}
  // =========================================================
  // DASHBOARD
  // =========================================================

  loadDashboard(isRefresh = false): void {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.refreshing = isRefresh;
    this.errorMessage = '';

    this.dashboardService.getDashboard(
  this.appliedDashboardDateFrom,
  this.appliedDashboardDateTo
)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.refreshing = false;
        })
      )
      .subscribe({
        next: (response: TenantDashboardResponse) => {
          this.dashboard = response;
          this.lastUpdated = new Date();
          this.buildStats(response);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Tenant dashboard loading failed:', error);

          if (error.status === 401) {
            this.errorMessage =
              'Your session may have expired. Please sign in again.';
          } else if (error.status === 403) {
            this.errorMessage =
              'You do not have permission to view this dashboard.';
          } else if (error.status === 0) {
            this.errorMessage =
              'Unable to connect to the server. Check your connection and try again.';
          } else {
            this.errorMessage =
              error.error?.message ??
              'We could not load your dashboard. Please try again.';
          }
        }
      });
  }

  private buildStats(data: TenantDashboardResponse): void {
    this.stats = [
      {
        title: 'Properties',
        value: data.totalProperties ?? 0,
        icon: 'fa-solid fa-building',
        color: 'primary',
        description: 'Registered rental properties',
        route: '/app/tenant/properties',
        actionLabel: 'View Properties'
      },
      {
        title: 'Total Units',
        value: data.totalUnits ?? 0,
        icon: 'fa-solid fa-table-cells-large',
        color: 'info',
        description: 'Units across your properties',
        route: '/app/tenant/units/directory',
        actionLabel: 'View Units'
      },
      {
        title: 'Active Tenants',
        value: data.activeTenants ?? 0,
        icon: 'fa-solid fa-users',
        color: 'success',
        description: 'Currently active tenants',
        route: '/app/tenant/tenants',
        actionLabel: 'View Tenants'
      },
      {
        title: 'Vacant Units',
        value: data.vacantUnits ?? 0,
        icon: 'fa-solid fa-house',
        color: 'warning',
        description: 'Available rental units',
        route: '/app/tenant/units/directory',
        actionLabel: 'Check Availability'
      }
    ];
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  openRoute(route: string): void {
    if (!route || !route.startsWith('/app/')) {
      console.error('Invalid tenant navigation route:', route);
      return;
    }

    this.router.navigateByUrl(route)
      .then((navigated: boolean) => {
        if (!navigated) {
          console.warn('Angular could not navigate to:', route);
        }
      })
      .catch((error: unknown) => {
        console.error('Tenant navigation failed:', route, error);
      });
  }

  trackByTitle(
    index: number,
    item: DashboardStat
  ): string {
    return item.title;
  }

  trackByAction(
    index: number,
    action: TenantQuickAction
  ): string {
    return action.title;
  }

  trackByAccount(
    index: number,
    account: TenantAccountSummary
  ): number {
    return account.leaseId;
  }

  // =========================================================
  // TENANT ACCOUNT SUMMARIES
  // =========================================================

  loadTenantAccounts(): void {
    if (this.accountLoading) {
      return;
    }

    this.accountLoading = true;
    this.accountError = '';

    this.accountService.getAccounts()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.accountLoading = false;
        })
      )
      .subscribe({
        next: (accounts: TenantAccountSummary[] | null) => {
          this.accounts = Array.isArray(accounts) ? accounts : [];
        },
        error: (error: HttpErrorResponse) => {
          console.error('Tenant accounts loading failed:', error);

          if (error.status === 401) {
            this.accountError =
              'Your session may have expired. Please sign in again.';
          } else if (error.status === 403) {
            this.accountError =
              'You are not authorized to view these accounts.';
          } else if (error.status === 0) {
            this.accountError =
              'Unable to connect to the server. Please try again.';
          } else {
            this.accountError =
              error.error?.message ??
              'Unable to load tenant accounts.';
          }
        }
      });
  }

  get filteredAccounts(): TenantAccountSummary[] {
    const query = this.accountSearch.trim().toLowerCase();

    if (!query) {
      return this.accounts;
    }

    return this.accounts.filter(account =>
      (account.tenantName ?? '').toLowerCase().includes(query) ||
      String(account.leaseId ?? '').includes(query) ||
      (account.leaseReference ?? '').toLowerCase().includes(query)
    );
  }

  get accountTotals(): TenantAccountTotals {
    return this.accounts.reduce<TenantAccountTotals>(
      (totals, account) => ({
        charged:
          totals.charged + this.toNumber(account.totalRentCharged),

        payments:
          totals.payments + this.toNumber(account.totalValidPayments),

        outstanding:
          totals.outstanding + this.toNumber(account.totalOutstanding),

        arrears:
          totals.arrears + this.toNumber(account.overdueArrears),

        credit:
          totals.credit + this.toNumber(account.availableCredit)
      }),
      {
        charged: 0,
        payments: 0,
        outstanding: 0,
        arrears: 0,
        credit: 0
      }
    );
  }

  // =========================================================
  // TENANT STATEMENTS
  // =========================================================

 
  // =========================================================
  // TENANT STATEMENTS — INLINE TENANT-SPECIFIC EXPANSION
  // =========================================================

  openTenantStatement(account: TenantAccountSummary): void {

    if (!account || !Number.isFinite(Number(account.leaseId))) {
      this.statementError =
        'A valid lease is required to generate a statement.';
      return;
    }

    const leaseId = Number(account.leaseId);

    // Clicking the already-open tenant collapses the statement.
    if (this.expandedStatementLeaseId === leaseId) {
      this.closeTenantStatement();
      return;
    }

    // Cancel any previous statement request.
    this.statementRequest?.unsubscribe();

    // Open the selected tenant's statement.
    this.expandedStatementLeaseId = leaseId;
    this.selectedAccount = account;
    this.selectedStatement = null;
    this.statementError = '';
    this.printingStatement = false;
    this.statementLoading = false;

    // Load the selected tenant's payment history.
    this.loadTenantStatement();
  }

  loadTenantStatement(): void {

    if (!this.selectedAccount) {
      return;
    }

    if (
      !this.statementFrom ||
      !this.statementTo ||
      this.statementFrom > this.statementTo
    ) {
      this.statementError =
        'Please select a valid statement date range.';
      return;
    }

    const leaseId = Number(this.selectedAccount.leaseId);

    if (!Number.isFinite(leaseId) || leaseId <= 0) {
      this.statementError = 'The selected lease ID is invalid.';
      return;
    }

    // Cancel any outstanding request before starting another.
    this.statementRequest?.unsubscribe();

    this.statementLoading = true;
    this.statementError = '';
    this.selectedStatement = null;

    this.statementRequest = this.accountService.getStatement(
      leaseId,
      this.statementFrom,
      this.statementTo
    )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.statementLoading = false;
        })
      )
      .subscribe({

        next: (statement: TenantRentStatement) => {

          // Never display a response belonging to another lease.
          if (this.expandedStatementLeaseId !== leaseId) {
            return;
          }

          this.selectedStatement = statement;
        },

        error: (error: HttpErrorResponse) => {

          if (this.expandedStatementLeaseId !== leaseId) {
            return;
          }

          console.error(
            'Tenant statement loading failed:',
            error
          );

          if (error.status === 401) {
            this.statementError =
              'Your session may have expired. Please sign in again.';

          } else if (error.status === 403) {
            this.statementError =
              'You are not authorized to view this lease statement.';

          } else if (error.status === 404) {
            this.statementError =
              'The lease or statement could not be found.';

          } else if (error.status === 0) {
            this.statementError =
              'Unable to connect to the server. Please try again.';

          } else {
            this.statementError =
              error.error?.message ??
              'Unable to generate this statement. Please try again.';
          }
        }
      });
  }

  closeTenantStatement(): void {

    this.statementRequest?.unsubscribe();
    this.statementRequest = undefined;

    this.expandedStatementLeaseId = null;
    this.selectedAccount = null;
    this.selectedStatement = null;

    this.statementError = '';
    this.statementLoading = false;
    this.printingStatement = false;
  }


  printTenantStatement(): void {
    if (!this.selectedStatement || this.statementLoading) {
      return;
    }

    this.printingStatement = true;

    // Allow Angular to apply the print-specific class before printing.
    setTimeout(() => {
      if (this.printingStatement) {
        window.print();
      }
    }, 0);
  }

  // =========================================================
  // UTILITIES
  // =========================================================

  formatKes(value: number | string | null | undefined): string {
    const amount = this.toNumber(value);

    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  private toNumber(value: number | string | null | undefined): number {
    const amount = Number(value ?? 0);

    return Number.isFinite(amount) ? amount : 0;
  }

  private toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  clampPercent(value: number | string | null | undefined): number {
  const percentage = Number(value);

  if (!Number.isFinite(percentage)) {
    return 0;
  }

  return Math.min(100, Math.max(0, percentage));
}

// =========================================================
// TENANT ACCOUNT IMAGE HANDLING
// =========================================================

getTenantAccountImageUrl(
  imageUrl: string | null | undefined
): string {

  if (!imageUrl) {
    return '';
  }

  const trimmedUrl = imageUrl.trim();

  if (!trimmedUrl) {
    return '';
  }

  // Already an absolute URL, for example a Cloudinary URL.
  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  // Resolve backend-relative image paths such as:
  // /uploads/tenants/abc123.jpg
  try {
    const apiOrigin = new URL(environment.apiUrl).origin;

    return new URL(
      trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`,
      apiOrigin
    ).toString();

  } catch (error) {
    console.error(
      'Unable to resolve tenant account image URL:',
      trimmedUrl,
      error
    );

    return '';
  }
}

onTenantAccountImageError(leaseId: number): void {

  this.tenantAccountImageErrors[leaseId] = true;

  console.warn(
    'Tenant photograph could not be loaded for lease:',
    leaseId
  );
}


// =====================================================
// TODAY'S REMINDERS / CALENDAR EVENTS
// =====================================================

loadTodayEvents(): void {

  this.todayEventsLoading = true;
  this.todayEventsError = '';

  const todayDate = this.getTodayDate();

  this.remindersService.getCalendarEvents(
    todayDate,
    todayDate
  )
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.todayEventsLoading = false;
      })
    )
    .subscribe({

      next: (events: TenantReminder[] | null) => {

        this.todayEvents = (Array.isArray(events) ? events : [])
          .filter(event =>
            event.dueDate === todayDate &&
            event.status !== 'CANCELLED'
          )
          .sort((a, b) => {

            const first = a.scheduledAt ?? '';
            const second = b.scheduledAt ?? '';

            return first.localeCompare(second);
          });

      },

      error: (error: HttpErrorResponse) => {

        console.error(
          'Unable to load today\'s calendar events:',
          error
        );

        this.todayEventsError =
          'Unable to load today\'s events.';

        this.todayEvents = [];

      }
    });
}

openTenantCalendar(): void {
  this.openRoute('/app/tenant/calendar');
}


// =====================================================
// RENT COLLECTION FINANCIAL CHART
// =====================================================

getRentCollectionGradient(): string {
  const collected = Math.max(
    0,
    this.toNumber(this.dashboard?.rentCollectedThisMonth)
  );

  const outstanding = Math.max(
    0,
    this.toNumber(this.dashboard?.outstandingRent)
  );

  const total = collected + outstanding;

  if (total <= 0) {
    return 'conic-gradient(#e8eef5 0deg 360deg)';
  }

  const collectedAngle = (collected / total) * 360;

  return `conic-gradient(
    #16a34a 0deg ${collectedAngle}deg,
    #f59e0b ${collectedAngle}deg 360deg
  )`;
}

getRentCollectionRate(): number {
  const charged = this.toNumber(
    this.dashboard?.rentChargedThisMonth
  );

  const collected = this.toNumber(
    this.dashboard?.rentCollectedThisMonth
  );

  if (charged <= 0) {
    return 0;
  }

  return (collected / charged) * 100;
}


formatCompactCurrency(value: number | null | undefined): string {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return 'KSh 0';
  }

  if (amount >= 1_000_000) {
    return `KSh ${(amount / 1_000_000).toFixed(2)}M`;
  }

  if (amount >= 1_000) {
    return `KSh ${(amount / 1_000).toFixed(1)}K`;
  }

  return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
}

}
