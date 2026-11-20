
import { Component, OnInit } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { TenantDirectoryService, TenantPropertyRecord, TenantResidentRecord, TenantUnitRecord } from '../services/tenant-directory.service';
import { TenantLeaseResponse, TenantLeaseService } from '../services/tenant-lease.service';
import { TenantRentChargeResponse, TenantRentPaymentResponse, TenantRentService } from '../services/tenant-rent.service';
import { TenantDashboardResponse, TenantDashboardService } from '../services/tenant-dashboard.service';



type ActivityCategory =
  | 'PROPERTY'
  | 'UNIT'
  | 'TENANT'
  | 'LEASE'
  | 'RENT'
  | 'PAYMENT';

type ActivitySeverity =
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'secondary';

interface PortfolioActivity {
  id: string;
  category: ActivityCategory;
  title: string;
  description: string;
  date: Date;
  dateLabel: string;
  icon: string;
  severity: ActivitySeverity;
  propertyName: string;
  propertyId: number | null;
  reference: string;
  amount: number | null;
  source: string;
}

interface ActivitySourceResult<T> {
  data: T;
  failed: boolean;
}

@Component({
  selector: 'app-tenant-portfolio-activity',
  templateUrl: './tenant-portfolio-activity.component.html',
  styleUrls: ['./tenant-portfolio-activity.component.css']
})
export class TenantPortfolioActivityComponent implements OnInit {

  loading = false;
  refreshing = false;
  errorMessage = '';
  sourceWarnings: string[] = [];

  properties: TenantPropertyRecord[] = [];
  units: TenantUnitRecord[] = [];
  residents: TenantResidentRecord[] = [];
  leases: TenantLeaseResponse[] = [];
  charges: TenantRentChargeResponse[] = [];
  payments: TenantRentPaymentResponse[] = [];

  dashboard: TenantDashboardResponse | null = null;

  activities: PortfolioActivity[] = [];
  filteredActivities: PortfolioActivity[] = [];

  searchTerm = '';
  selectedCategory = 'ALL';
  selectedProperty = 'ALL';

  dateFrom = this.getMonthStart();
  dateTo = this.getToday();

  appliedDateFrom = this.dateFrom;
  appliedDateTo = this.dateTo;

  totalActivityCount = 0;
  paymentActivityCount = 0;
  leaseActivityCount = 0;
  operationalActivityCount = 0;

  constructor(
    private readonly directoryService: TenantDirectoryService,
    private readonly leaseService: TenantLeaseService,
    private readonly rentService: TenantRentService,
    private readonly dashboardService: TenantDashboardService
  ) {}

  ngOnInit(): void {
    this.loadPortfolioActivity();
  }

  // =====================================================
  // LOAD PORTFOLIO DATA
  // =====================================================

  loadPortfolioActivity(): void {

    if (this.loading) {
      return;
    }

    this.loading = true;
    this.refreshing = true;
    this.errorMessage = '';
    this.sourceWarnings = [];

    const requests = {
      properties: this.safeRequest(
        this.directoryService.getProperties(),
        [] as TenantPropertyRecord[],
        'Properties'
      ),

      residents: this.safeRequest(
        this.directoryService.getResidents(),
        [] as TenantResidentRecord[],
        'Tenants'
      ),

      leases: this.safeRequest(
        this.leaseService.getLeases(),
        [] as TenantLeaseResponse[],
        'Leases'
      ),

      charges: this.safeRequest(
        this.rentService.getCharges(),
        [] as TenantRentChargeResponse[],
        'Rent charges'
      ),

      payments: this.safeRequest(
        this.rentService.getPayments(),
        [] as TenantRentPaymentResponse[],
        'Rent payments'
      ),

      dashboard: this.safeRequest(
        this.dashboardService.getDashboard(
          this.appliedDateFrom,
          this.appliedDateTo
        ),
        null as TenantDashboardResponse | null,
        'Portfolio dashboard'
      )
    };

    forkJoin(requests)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.refreshing = false;
        })
      )
      .subscribe({
        next: result => {

          this.properties = result.properties.data;
          this.residents = result.residents.data;
          this.leases = result.leases.data;
          this.charges = result.charges.data;
          this.payments = result.payments.data;
          this.dashboard = result.dashboard.data;

          this.collectWarnings([
            result.properties,
            result.residents,
            result.leases,
            result.charges,
            result.payments,
            result.dashboard
          ]);

          this.loadUnitsAndBuildActivity();
        },

        error: error => {
          console.error('Portfolio activity loading error:', error);
          this.errorMessage =
            'Unable to load portfolio information. Please try again.';
        }
      });
  }

 
private safeRequest<T>(
  request: Observable<T>,
  fallback: T,
  sourceName: string
): Observable<ActivitySourceResult<T>> {

  return request.pipe(
    map(data => ({
      data,
      failed: false
    })),

    catchError(error => {
      console.error(`${sourceName} request failed:`, error);

      return of({
        data: fallback,
        failed: true
      });
    })
  );
}

  private collectWarnings(
    results: ActivitySourceResult<unknown>[]
  ): void {
    // Warnings are populated by the source-specific requests below.
    // This method is intentionally retained as a single place to
    // centralise partial-data warnings.
    this.sourceWarnings = results
      .filter(result => result.failed)
      .map(() => 'Some portfolio information could not be loaded.');
  }

  // =====================================================
  // LOAD UNITS
  // =====================================================

  private loadUnitsAndBuildActivity(): void {

    this.directoryService
      .getUnitsAcrossProperties(this.properties)
      .pipe(
        catchError(error => {
          console.error('Could not load portfolio units:', error);
          this.sourceWarnings.push('Property units could not be loaded.');

          return of({
            units: [] as TenantUnitRecord[],
            failedPropertyIds: []
          });
        })
      )
      .subscribe(result => {

        this.units = result.units;

        if (result.failedPropertyIds.length) {
          this.sourceWarnings.push(
            `${result.failedPropertyIds.length} property unit list(s) could not be loaded.`
          );
        }

        this.buildActivityTimeline();
        this.applyFilters();
      });
  }

  // =====================================================
  // BUILD UNIFIED ACTIVITY TIMELINE
  // =====================================================

  private buildActivityTimeline(): void {

    const events: PortfolioActivity[] = [];

    // PROPERTY REGISTRATION
    this.properties.forEach(property => {

      this.addActivity(events, {
        id: `property-${property.id}`,
        category: 'PROPERTY',
        title: 'Property registered',
        description: `${property.name} was added to the property portfolio.`,
        date: property.createdAt,
        icon: 'fa-building',
        severity: 'success',
        propertyName: property.name,
        propertyId: property.id,
        reference: property.propertyCode || `Property #${property.id}`,
        amount: null,
        source: 'Property records'
      });
    });

    // UNIT REGISTRATION
    this.units.forEach(unit => {

      const propertyName =
        unit.propertyName ||
        this.getPropertyName(unit.propertyId);

      this.addActivity(events, {
        id: `unit-${unit.id}`,
        category: 'UNIT',
        title: 'Unit registered',
        description:
          `Unit ${unit.unitNumber} was added to ${propertyName}.`,
        date: unit.createdAt,
        icon: 'fa-door-open',
        severity: 'info',
        propertyName,
        propertyId: unit.propertyId,
        reference: `Unit ${unit.unitNumber}`,
        amount: unit.monthlyRent,
        source: 'Unit records'
      });
    });

    // TENANT REGISTRATION
    this.residents.forEach(tenant => {

      this.addActivity(events, {
        id: `tenant-${tenant.id}`,
        category: 'TENANT',
        title: 'Tenant registered',
        description:
          `${tenant.fullName} was registered in the tenant directory.`,
        date: tenant.createdAt,
        icon: 'fa-user-plus',
        severity: 'success',
        propertyName: 'Portfolio-wide',
        propertyId: null,
        reference: `Tenant #${tenant.id}`,
        amount: null,
        source: 'Tenant records'
      });
    });

    // LEASE REGISTRATION
    this.leases.forEach(lease => {

      this.addActivity(events, {
        id: `lease-created-${lease.id}`,
        category: 'LEASE',
        title: 'Lease recorded',
        description:
          `${lease.tenantName} — ${lease.propertyName}, Unit ${lease.unitNumber}. Current status: ${this.normaliseStatus(lease.status)}.`,
        date: lease.createdAt,
        icon: 'fa-file-contract',
        severity: lease.status === 'ACTIVE' ? 'success' : 'info',
        propertyName: lease.propertyName,
        propertyId: lease.propertyId,
        reference: lease.leaseCode,
        amount: lease.monthlyRent,
        source: 'Lease records'
      });

      if (lease.terminatedAt) {
        this.addActivity(events, {
          id: `lease-terminated-${lease.id}`,
          category: 'LEASE',
          title: 'Lease terminated',
          description:
            `The lease for ${lease.tenantName}, Unit ${lease.unitNumber}, was terminated.`,
          date: lease.terminatedAt,
          icon: 'fa-file-circle-xmark',
          severity: 'warning',
          propertyName: lease.propertyName,
          propertyId: lease.propertyId,
          reference: lease.leaseCode,
          amount: null,
          source: 'Lease records'
        });
      }
    });

    // RENT CHARGES
    this.charges.forEach(charge => {

      this.addActivity(events, {
        id: `charge-${charge.id}`,
        category: 'RENT',
        title: this.getChargeTitle(charge.status),
        description:
          `Rent for ${charge.tenantName}, ${charge.propertyName}, Unit ${charge.unitNumber}. Balance: ${this.formatCurrency(charge.balance)}.`,
        date: charge.dueDate,
        icon: 'fa-file-invoice-dollar',
        severity: charge.status === 'OVERDUE'
          ? 'danger'
          : charge.status === 'PAID'
            ? 'success'
            : 'warning',
        propertyName: charge.propertyName,
        propertyId: charge.propertyId,
        reference: charge.leaseCode,
        amount: charge.amount,
        source: 'Rent charge records'
      });
    });

    // RENT PAYMENTS AND REVERSALS
    this.payments.forEach(payment => {

      this.addActivity(events, {
        id: `payment-${payment.id}`,
        category: 'PAYMENT',
        title: payment.status === 'REVERSED'
          ? 'Payment originally recorded'
          : 'Rent payment received',
        description:
          `${payment.tenantName} paid ${this.formatCurrency(payment.amount)} via ${this.normaliseStatus(payment.paymentMethod)}.`,
        date: payment.receivedAt,
        icon: 'fa-money-bill-transfer',
        severity: payment.status === 'REVERSED'
          ? 'warning'
          : 'success',
        propertyName: this.getLeasePropertyName(payment.leaseId),
        propertyId: this.getLeasePropertyId(payment.leaseId),
        reference: payment.paymentReference || `Payment #${payment.id}`,
        amount: payment.amount,
        source: 'Rent payment records'
      });

      if (payment.status === 'REVERSED' && payment.reversedAt) {
        this.addActivity(events, {
          id: `payment-reversed-${payment.id}`,
          category: 'PAYMENT',
          title: 'Payment reversed',
          description:
            `A payment of ${this.formatCurrency(payment.amount)} for ${payment.tenantName} was reversed. Reason: ${payment.reversalReason || 'No reason supplied'}.`,
          date: payment.reversedAt,
          icon: 'fa-rotate-left',
          severity: 'danger',
          propertyName: this.getLeasePropertyName(payment.leaseId),
          propertyId: this.getLeasePropertyId(payment.leaseId),
          reference: payment.paymentReference || `Payment #${payment.id}`,
          amount: payment.amount,
          source: 'Rent payment records'
        });
      }
    });

    this.activities = events
      .filter(event => !isNaN(event.date.getTime()))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    this.totalActivityCount = this.activities.length;

    this.paymentActivityCount = this.activities.filter(
      event => event.category === 'PAYMENT'
    ).length;

    this.leaseActivityCount = this.activities.filter(
      event => event.category === 'LEASE'
    ).length;

    this.operationalActivityCount = this.activities.filter(
      event =>
        event.category === 'PROPERTY' ||
        event.category === 'UNIT' ||
        event.category === 'TENANT'
    ).length;
  }

  private addActivity(
    target: PortfolioActivity[],
    input: {
      id: string;
      category: ActivityCategory;
      title: string;
      description: string;
      date: string | null | undefined;
      icon: string;
      severity: ActivitySeverity;
      propertyName: string;
      propertyId: number | null;
      reference: string;
      amount: number | null;
      source: string;
    }
  ): void {

    if (!input.date) {
      return;
    }

    const date = new Date(input.date);

    if (isNaN(date.getTime())) {
      return;
    }

    target.push({
      ...input,
      date,
      dateLabel: this.formatDateTime(date)
    });
  }

  // =====================================================
  // FILTERS
  // =====================================================

  applyDateFilter(): void {

    if (!this.dateFrom || !this.dateTo) {
      this.errorMessage = 'Please select both dates.';
      return;
    }

    if (this.dateFrom > this.dateTo) {
      this.errorMessage =
        'The start date cannot be after the end date.';
      return;
    }

    this.errorMessage = '';
    this.appliedDateFrom = this.dateFrom;
    this.appliedDateTo = this.dateTo;

    this.loadPortfolioActivity();
  }

  applyFilters(): void {

    const from = new Date(`${this.appliedDateFrom}T00:00:00`);
    const to = new Date(`${this.appliedDateTo}T23:59:59.999`);

    const search = this.searchTerm.trim().toLowerCase();

    this.filteredActivities = this.activities.filter(activity => {

      const inDateRange =
        activity.date >= from &&
        activity.date <= to;

      const matchesCategory =
        this.selectedCategory === 'ALL' ||
        activity.category === this.selectedCategory;

      const matchesProperty =
        this.selectedProperty === 'ALL' ||
        activity.propertyId?.toString() === this.selectedProperty;

      const searchableText = [
        activity.title,
        activity.description,
        activity.propertyName,
        activity.reference,
        activity.source
      ].join(' ').toLowerCase();

      const matchesSearch =
        !search || searchableText.includes(search);

      return (
        inDateRange &&
        matchesCategory &&
        matchesProperty &&
        matchesSearch
      );
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.applyFilters();
  }

  onCategoryChange(value: string): void {
    this.selectedCategory = value;
    this.applyFilters();
  }

  onPropertyChange(value: string): void {
    this.selectedProperty = value;
    this.applyFilters();
  }

  clearFilters(): void {

    this.searchTerm = '';
    this.selectedCategory = 'ALL';
    this.selectedProperty = 'ALL';

    this.dateFrom = this.getMonthStart();
    this.dateTo = this.getToday();

    this.appliedDateFrom = this.dateFrom;
    this.appliedDateTo = this.dateTo;

    this.loadPortfolioActivity();
  }

  // =====================================================
  // PORTFOLIO INSIGHTS
  // =====================================================
get occupancyRate(): number {
  return Math.min(100, Math.max(0,
    this.toNumber(this.dashboard?.occupancyRate)
  ));
}

get collectionRate(): number {
  return Math.min(100, Math.max(0,
    this.toNumber(this.dashboard?.collectionRate)
  ));
}

  get outstandingRent(): number {
    return this.toNumber(this.dashboard?.outstandingRent);
  }

  get overdueArrears(): number {
    return this.toNumber(this.dashboard?.overdueArrears);
  }

  get totalProperties(): number {
    return this.toNumber(this.dashboard?.totalProperties);
  }

  get totalUnits(): number {
    return this.toNumber(this.dashboard?.totalUnits);
  }

  get occupiedUnits(): number {
    return this.toNumber(this.dashboard?.occupiedUnits);
  }

  get activeTenants(): number {
    return this.toNumber(this.dashboard?.activeTenants);
  }

  get activeLeases(): number {
    return this.toNumber(this.dashboard?.activeLeases);
  }

  get rentCollected(): number {
    return this.toNumber(this.dashboard?.rentCollectedThisMonth);
  }

  get rentCharged(): number {
    return this.toNumber(this.dashboard?.rentChargedThisMonth);
  }

  get vacantUnits(): number {
    return this.toNumber(this.dashboard?.vacantUnits);
  }

  get occupancyRemaining(): number {
    return Math.max(0, 100 - this.occupancyRate);
  }

  get collectionRemaining(): number {
    return Math.max(0, 100 - this.collectionRate);
  }

  get paymentTotal(): number {
    return this.payments
      .filter(payment => payment.status === 'POSTED')
      .reduce((sum, payment) => sum + this.toNumber(payment.amount), 0);
  }

  get reversedPaymentTotal(): number {
    return this.payments
      .filter(payment => payment.status === 'REVERSED')
      .reduce((sum, payment) => sum + this.toNumber(payment.amount), 0);
  }

  // =====================================================
  // DISPLAY HELPERS
  // =====================================================

  getPropertyName(propertyId: number): string {
    return this.properties.find(p => p.id === propertyId)?.name
      || 'Property';
  }

  getLeasePropertyName(leaseId: number): string {
    return this.leases.find(lease => lease.id === leaseId)?.propertyName
      || 'Portfolio-wide';
  }

  getLeasePropertyId(leaseId: number): number | null {
    return this.leases.find(lease => lease.id === leaseId)?.propertyId
      ?? null;
  }

  getChargeTitle(status: string): string {

    switch (status) {
      case 'PAID':
        return 'Rent charge settled';

      case 'OVERDUE':
        return 'Rent payment overdue';

      case 'PARTIALLY_PAID':
        return 'Rent partially settled';

      default:
        return 'Rent charge due';
    }
  }

  getCategoryLabel(category: string): string {

    const labels: Record<string, string> = {
      PROPERTY: 'Property',
      UNIT: 'Unit',
      TENANT: 'Tenant',
      LEASE: 'Lease',
      RENT: 'Rent charge',
      PAYMENT: 'Payment'
    };

    return labels[category] || category;
  }

  getSeverityClass(severity: ActivitySeverity): string {
    return `activity-${severity}`;
  }

  normaliseStatus(value: string | null | undefined): string {
    return (value || 'Unknown')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  formatCurrency(value: number | null | undefined): string {
    const amount = this.toNumber(value);

    return `KSh ${amount.toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  }

  formatDateTime(date: Date): string {
    return date.toLocaleString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private toNumber(value: unknown): number {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
  }

  private getToday(): string {
    return this.toDateInput(new Date());
  }

  private getMonthStart(): string {
    const date = new Date();
    date.setDate(1);
    return this.toDateInput(date);
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  trackByActivity(
    index: number,
    activity: PortfolioActivity
  ): string {
    return activity.id;
  }

  // =====================================================
  // CSV EXPORT
  // =====================================================

  exportCsv(): void {

    if (!this.filteredActivities.length) {
      return;
    }

    const headers = [
      'Date',
      'Category',
      'Activity',
      'Description',
      'Property',
      'Reference',
      'Amount',
      'Source'
    ];

    const rows = this.filteredActivities.map(activity => [
      activity.date.toISOString(),
      this.getCategoryLabel(activity.category),
      activity.title,
      activity.description,
      activity.propertyName,
      activity.reference,
      activity.amount ?? '',
      activity.source
    ]);

    const csv = [
      headers,
      ...rows
    ].map(row =>
      row.map(value =>
        `"${String(value).replace(/"/g, '""')}"`
      ).join(',')
    ).join('\r\n');

    const blob = new Blob(
      ['\uFEFF' + csv],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `portfolio-activity-${this.getToday()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  printReport(): void {
    window.print();
  }

  // =====================================================
// ACTIVITY FEED PAGINATION
// =====================================================

visibleActivityLimit = 5;

viewMoreActivities(): void {
  this.visibleActivityLimit = Math.min(
    this.visibleActivityLimit + 5,
    this.filteredActivities.length
  );
}

showLessActivities(): void {
  this.visibleActivityLimit = 5;
}

}
