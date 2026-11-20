
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';

import {
  TenantDirectoryService,
  TenantPropertyRecord,
  TenantUnitRecord,
  TenantResidentRecord
} from '../services/tenant-directory.service';

type DirectoryType = 'properties' | 'units' | 'tenants';

interface AnalyticsItem {
  label: string;
  count: number;
  percent: number;
}

interface StatusOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-tenant-directory',
  templateUrl: './tenant-directory.component.html',
  styleUrls: ['./tenant-directory.component.css']
})
export class TenantDirectoryComponent implements OnInit, OnDestroy {

  directoryType: DirectoryType = 'properties';

  properties: TenantPropertyRecord[] = [];
  units: TenantUnitRecord[] = [];
  residents: TenantResidentRecord[] = [];

  loading = false;
  errorMessage = '';
  warningMessage = '';
  searchTerm = '';
  statusFilter = 'ALL';
  selectedRecordId: number | null = null;

  page = 1;
  pageSize = 10;

  readonly pageSizeOptions = [5, 10, 25, 50];

  private readonly destroy$ = new Subject<void>();

  // Separate image error tracking for each directory.
  propertyImageErrors: Record<number, boolean> = {};
  unitImageErrors: Record<number, boolean> = {};
  tenantImageErrors: Record<number, boolean> = {};

  constructor(
    private readonly directoryService: TenantDirectoryService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  // =========================================================
  // INITIALIZATION
  // =========================================================

  ngOnInit(): void {
    this.route.data
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        const type = data['directory'] as DirectoryType;

        if (!['properties', 'units', 'tenants'].includes(type)) {
          this.errorMessage = 'The requested directory is invalid.';
          return;
        }

        this.directoryType = type;
        this.searchTerm = '';
        this.statusFilter = 'ALL';
        this.selectedRecordId = null;
        this.page = 1;

        this.loadDirectory();
      });
  }

  // =========================================================
  // PAGE INFORMATION
  // =========================================================

  get pageTitle(): string {
    return {
      properties: 'Properties',
      units: 'Units',
      tenants: 'Tenants'
    }[this.directoryType];
  }

  get pageDescription(): string {
    return {
      properties: 'Understand and manage your rental property portfolio.',
      units: 'Monitor unit availability and rental inventory across properties.',
      tenants: 'Manage tenant profiles, contact information and account status.'
    }[this.directoryType];
  }

  get registrationRoute(): string {
    return {
      properties: '/app/tenant/properties/register',
      units: '/app/tenant/units',
      tenants: '/app/tenant/register'
    }[this.directoryType];
  }

  get registrationLabel(): string {
    return {
      properties: 'Register Property',
      units: 'Manage Units',
      tenants: 'Register Tenant'
    }[this.directoryType];
  }

  get directoryIcon(): string {
    return {
      properties: 'fa-building',
      units: 'fa-door-open',
      tenants: 'fa-users'
    }[this.directoryType];
  }

  // =========================================================
  // FILTERED RECORDS
  // =========================================================

  get filteredProperties(): TenantPropertyRecord[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.properties.filter(property =>
      (
        !query ||
        [
          property.name,
          property.propertyCode,
          property.propertyType,
          property.county,
          property.town,
          property.address,
          property.status
        ].some(value => this.includes(value, query))
      ) && this.matchesStatus(property.status)
    );
  }

  get filteredUnits(): TenantUnitRecord[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.units.filter(unit =>
      (
        !query ||
        [
          unit.unitNumber,
          unit.propertyName,
          unit.propertyCode,
          unit.unitType,
          unit.floor,
          unit.status
        ].some(value => this.includes(value, query))
      ) && this.matchesStatus(unit.status)
    );
  }

  get filteredResidents(): TenantResidentRecord[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.residents.filter(resident =>
      (
        !query ||
        [
          resident.fullName,
          resident.identificationNumber,
          resident.identificationType,
          resident.phoneNumber,
          resident.email,
          resident.address,
          resident.status
        ].some(value => this.includes(value, query))
      ) && this.matchesStatus(resident.status)
    );
  }

  // =========================================================
  // RECORD COUNTS
  // =========================================================

  get totalRecords(): number {
    switch (this.directoryType) {
      case 'properties':
        return this.properties.length;

      case 'units':
        return this.units.length;

      case 'tenants':
        return this.residents.length;
    }
  }

  get visibleRecords(): number {
    switch (this.directoryType) {
      case 'properties':
        return this.filteredProperties.length;

      case 'units':
        return this.filteredUnits.length;

      case 'tenants':
        return this.filteredResidents.length;
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.visibleRecords / this.pageSize));
  }

  get pageStart(): number {
    return this.visibleRecords
      ? (this.page - 1) * this.pageSize + 1
      : 0;
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.visibleRecords);
  }

  // =========================================================
  // PAGINATED RECORDS
  // =========================================================

  get paginatedProperties(): TenantPropertyRecord[] {
    return this.paginate(this.filteredProperties);
  }

  get paginatedUnits(): TenantUnitRecord[] {
    return this.paginate(this.filteredUnits);
  }

  get paginatedResidents(): TenantResidentRecord[] {
    return this.paginate(this.filteredResidents);
  }

  // =========================================================
  // DIRECTORY ANALYTICS
  // =========================================================

  get activeRecords(): number {
    return this.currentStatuses().filter(status =>
      ['ACTIVE', 'OCCUPIED', 'APPROVED', 'CURRENT'].includes(status)
    ).length;
  }

  get attentionRecords(): number {
    return this.currentStatuses().filter(status =>
      [
        'PENDING',
        'INACTIVE',
        'VACANT',
        'UNDER_MAINTENANCE',
        'SUSPENDED',
        'TERMINATED',
        'CLOSED',
        'DELINQUENT'
      ].includes(status)
    ).length;
  }

  get statusCoverage(): number {
    return this.totalRecords
      ? Math.round((this.activeRecords / this.totalRecords) * 100)
      : 0;
  }

  get propertyTypeAnalytics(): AnalyticsItem[] {
    const types = [
      'RESIDENTIAL',
      'COMMERCIAL',
      'MIXED_USE',
      'INDUSTRIAL',
      'LAND',
      'OTHER'
    ];

    return this.toAnalytics(
      types.map(type => ({
        label: this.prettyLabel(type),
        count: this.properties.filter(
          property => (property.propertyType || '').toUpperCase() === type
        ).length
      }))
    ).filter(item => item.count > 0);
  }

  get countyAnalytics(): AnalyticsItem[] {
    const counts = new Map<string, number>();

    this.properties.forEach(property => {
      const county = (property.county || '').trim() || 'Not specified';

      counts.set(county, (counts.get(county) || 0) + 1);
    });

    return this.toAnalytics(
      Array.from(counts, ([label, count]) => ({ label, count }))
    ).slice(0, 5);
  }

  get unitStatusAnalytics(): AnalyticsItem[] {
    return this.statusAnalytics(this.units.map(unit => unit.status));
  }

  get tenantStatusAnalytics(): AnalyticsItem[] {
    return this.statusAnalytics(this.residents.map(resident => resident.status));
  }

  get statusOptions(): StatusOption[] {
    const distinct = Array.from(
      new Set(this.currentStatuses().filter(Boolean))
    ).sort();

    return [
      { value: 'ALL', label: 'All statuses' },
      ...distinct.map(status => ({
        value: status,
        label: this.prettyLabel(status)
      }))
    ];
  }

  // =========================================================
  // LOAD DIRECTORY RECORDS
  // =========================================================

  loadDirectory(): void {
    this.loading = true;
    this.errorMessage = '';
    this.warningMessage = '';

    this.properties = [];
    this.units = [];
    this.residents = [];

    // Reset image errors when fresh records are loaded.
    this.propertyImageErrors = {};
    this.unitImageErrors = {};
    this.tenantImageErrors = {};

    this.selectedRecordId = null;
    this.page = 1;

    // -------------------------------------------------------
    // PROPERTY DIRECTORY
    // -------------------------------------------------------

    if (this.directoryType === 'properties') {
      this.directoryService.getProperties()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: records => {
            this.properties = records ?? [];
            this.loading = false;
          },
          error: error => this.handleLoadError(error)
        });

      return;
    }

    // -------------------------------------------------------
    // TENANT DIRECTORY
    // -------------------------------------------------------

    if (this.directoryType === 'tenants') {
      this.directoryService.getResidents()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: records => {
            this.residents = records ?? [];
            this.loading = false;
          },
          error: error => this.handleLoadError(error)
        });

      return;
    }

    // -------------------------------------------------------
    // UNIT DIRECTORY
    // First load properties, then load units across them.
    // -------------------------------------------------------

    this.directoryService.getProperties()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: properties => {
          this.properties = properties ?? [];

          this.directoryService.getUnitsAcrossProperties(this.properties)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: result => {
                this.units = result.units ?? [];

                if (result.failedPropertyIds.length) {
                  this.warningMessage =
                    `Units could not be loaded for ${result.failedPropertyIds.length} property or properties. The directory may be incomplete.`;
                }

                this.loading = false;
              },
              error: error => this.handleLoadError(error)
            });
        },
        error: error => this.handleLoadError(error)
      });
  }

  refresh(): void {
    if (!this.loading) {
      this.loadDirectory();
    }
  }

  // =========================================================
  // SEARCH, FILTERS AND PAGINATION
  // =========================================================

  onFiltersChanged(): void {
    this.page = 1;
    this.selectedRecordId = null;
  }

  onPageSizeChanged(value: string | number): void {
    const size = Number(value);

    if (this.pageSizeOptions.includes(size)) {
      this.pageSize = size;
      this.page = 1;
      this.selectedRecordId = null;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.page = page;
      this.selectedRecordId = null;
    }
  }

  get pageNumbers(): number[] {
    const start = Math.max(
      1,
      Math.min(this.page - 2, this.totalPages - 4)
    );

    const end = Math.min(this.totalPages, start + 4);

    return Array.from(
      { length: end - start + 1 },
      (_, index) => start + index
    );
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'ALL';
    this.page = 1;
    this.selectedRecordId = null;
  }

  // =========================================================
  // EXPAND / COLLAPSE RECORD DETAILS
  // =========================================================

  toggleDetails(id: number): void {
    this.selectedRecordId = this.selectedRecordId === id ? null : id;
  }

  isExpanded(id: number): boolean {
    return this.selectedRecordId === id;
  }

  // =========================================================
  // PROPERTY IMAGE HANDLING
  // =========================================================

  getPropertyImageUrl(imageUrl: string | null | undefined): string {
    return this.directoryService.getPropertyImageUrl(imageUrl);
  }

  onPropertyImageError(propertyId: number): void {
    this.propertyImageErrors[propertyId] = true;

    console.error('Property photograph failed to load:', {
      propertyId,
      imageUrl: this.properties.find(p => p.id === propertyId)?.imageUrl
    });
  }

  // =========================================================
  // UNIT IMAGE HANDLING
  // =========================================================

  getUnitImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl) {
      return '';
    }

    return this.directoryService.getPropertyImageUrl(imageUrl);
  }

  onUnitImageError(unitId: number): void {
    this.unitImageErrors[unitId] = true;

    const unit = this.units.find(item => item.id === unitId);

    console.error('Unit photograph failed to load:', {
      unitId,
      imageUrl: unit?.imageUrl,
      resolvedImageUrl: unit?.imageUrl
        ? this.getUnitImageUrl(unit.imageUrl)
        : null
    });
  }

  // =========================================================
  // TENANT IMAGE HANDLING
  // =========================================================

  /**
   * Resolves the tenant photograph URL.
   *
   * Uses the same backend-origin resolver as properties and
   * units, supporting paths such as:
   *
   * /uploads/tenants/tenant-photo.jpg
   *
   * This prevents Angular from requesting the image from
   * the frontend hosting domain instead of the backend.
   */
  getTenantImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl) {
      return '';
    }

    return this.directoryService.getPropertyImageUrl(imageUrl);
  }

  /**
   * Displays the fallback user icon if the tenant image
   * is missing or the browser cannot load it.
   */
  onTenantImageError(tenantId: number): void {
    this.tenantImageErrors[tenantId] = true;

    const resident = this.residents.find(
      item => item.id === tenantId
    );

    console.error('Tenant photograph failed to load:', {
      tenantId,
      imageUrl: resident?.imageUrl,
      resolvedImageUrl: resident?.imageUrl
        ? this.getTenantImageUrl(resident.imageUrl)
        : null
    });
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  openRoute(path: string): void {
    if (!path.startsWith('/app/')) {
      console.error('Invalid directory navigation path:', path);
      return;
    }

    this.router.navigateByUrl(path).catch(error => {
      console.error('Directory navigation failed:', error);
      this.errorMessage = 'Navigation failed. Please try again.';
    });
  }

  // =========================================================
  // STATUS DISPLAY
  // =========================================================

  statusClass(status: string | null | undefined): string {
    const normalized = (status ?? '').toUpperCase();

    if (
      ['ACTIVE', 'OCCUPIED', 'APPROVED', 'CURRENT', 'AVAILABLE']
        .includes(normalized)
    ) {
      return 'status-positive';
    }

    if (
      ['VACANT', 'PENDING', 'INACTIVE', 'UNDER_MAINTENANCE']
        .includes(normalized)
    ) {
      return 'status-warning';
    }

    if (
      ['SUSPENDED', 'CLOSED', 'TERMINATED', 'DELINQUENT']
        .includes(normalized)
    ) {
      return 'status-negative';
    }

    return 'status-neutral';
  }

  prettyLabel(value: string | null | undefined): string {
    return (value || 'Unknown')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  trackById(index: number, item: { id: number }): number {
    return item.id;
  }

  // =========================================================
  // DIRECTORY ACTIONS
  // =========================================================

  runRecordAction(action: string, recordId: number): void {
    switch (action) {
      case 'view':
        this.toggleDetails(recordId);
        break;

      case 'edit':
        this.editRecord(recordId);
        break;

      case 'units':
        this.openRoute('/app/tenant/units');
        break;

      case 'register-tenant':
        this.openRoute('/app/tenant/register');
        break;

      case 'register-property':
        this.openRoute('/app/tenant/properties/register');
        break;

      case 'reminder':
        this.warningMessage =
          'Reminder sending is not activated in this directory yet. Connect this action to the notification service.';
        break;

      case 'payments':
        this.warningMessage =
          'Payment history requires the rent ledger/payment route to be connected.';
        break;

      case 'maintenance':
        this.warningMessage =
          'Maintenance requests require the maintenance workflow route/API to be connected.';
        break;

      case 'lease':
        this.warningMessage =
          'Lease management requires the lease workflow route/API to be connected.';
        break;

      default:
        this.warningMessage = 'This action is not available yet.';
    }
  }

  /**
   * Opens the appropriate management component and passes
   * the selected record ID to the destination component.
   */
  private editRecord(recordId: number): void {
    if (!Number.isFinite(recordId) || recordId <= 0) {
      this.errorMessage = 'Invalid record ID. Unable to edit this record.';
      return;
    }

    this.errorMessage = '';
    this.warningMessage = '';

    switch (this.directoryType) {

      case 'properties': {
        const property = this.properties.find(
          item => item.id === recordId
        );

        if (!property) {
          this.errorMessage = 'The selected property could not be found.';
          return;
        }

        this.router.navigate(
          ['/app/tenant/properties/register'],
          {
            queryParams: {
              editId: property.id
            }
          }
        ).catch(error => {
          console.error('Property edit navigation failed:', error);
          this.errorMessage = 'Unable to open the property edit form.';
        });

        break;
      }

      case 'units': {
        const unit = this.units.find(
          item => item.id === recordId
        );

        if (!unit) {
          this.errorMessage = 'The selected unit could not be found.';
          return;
        }

        this.router.navigate(
          ['/app/tenant/units'],
          {
            queryParams: {
              editId: unit.id,
              propertyId: unit.propertyId
            }
          }
        ).catch(error => {
          console.error('Unit edit navigation failed:', error);
          this.errorMessage = 'Unable to open the unit edit form.';
        });

        break;
      }

      case 'tenants': {
        const resident = this.residents.find(
          item => item.id === recordId
        );

        if (!resident) {
          this.errorMessage = 'The selected tenant could not be found.';
          return;
        }

        this.router.navigate(
          ['/app/tenant/register'],
          {
            queryParams: {
              editId: resident.id
            }
          }
        ).catch(error => {
          console.error('Tenant edit navigation failed:', error);
          this.errorMessage = 'Unable to open the tenant edit form.';
        });

        break;
      }

      default:
        this.warningMessage = 'Unsupported directory type.';
    }
  }

  // =========================================================
  // QUICK NAVIGATION
  // =========================================================

  get quickNavigation(): {
    label: string;
    icon: string;
    route: string;
    type: DirectoryType | 'payments' | 'reminders' | 'maintenance';
  }[] {
    return [
      {
        label: 'Properties',
        icon: 'fa-building',
        route: '/app/tenant/properties',
        type: 'properties'
      },
      {
        label: 'Units',
        icon: 'fa-door-open',
        route: '/app/tenant/units',
        type: 'units'
      },
      {
        label: 'Tenants',
        icon: 'fa-users',
        route: '/app/tenant/tenants',
        type: 'tenants'
      },
      {
        label: 'Rent & payments',
        icon: 'fa-money-bill-wave',
        route: '/app/tenant/rent',
        type: 'payments'
      },
      {
        label: 'Reminders',
        icon: 'fa-bell',
        route: '/app/tenant/reminders',
        type: 'reminders'
      },
      {
        label: 'Maintenance',
        icon: 'fa-screwdriver-wrench',
        route: '/app/tenant/maintenance',
        type: 'maintenance'
      }
    ];
  }

  // =========================================================
  // PRIVATE HELPERS
  // =========================================================

  private paginate<T>(records: T[]): T[] {
    const maxPage = Math.max(
      1,
      Math.ceil(records.length / this.pageSize)
    );

    if (this.page > maxPage) {
      this.page = maxPage;
    }

    const start = (this.page - 1) * this.pageSize;

    return records.slice(start, start + this.pageSize);
  }

  private currentStatuses(): string[] {
    switch (this.directoryType) {
      case 'properties':
        return this.properties.map(p => (p.status || '').toUpperCase());

      case 'units':
        return this.units.map(u => (u.status || '').toUpperCase());

      case 'tenants':
        return this.residents.map(r => (r.status || '').toUpperCase());
    }
  }

  private statusAnalytics(
    statuses: (string | null | undefined)[]
  ): AnalyticsItem[] {
    const counts = new Map<string, number>();

    statuses.forEach(value => {
      const label = this.prettyLabel(value);

      counts.set(label, (counts.get(label) || 0) + 1);
    });

    return this.toAnalytics(
      Array.from(counts, ([label, count]) => ({ label, count }))
    ).slice(0, 6);
  }

  private toAnalytics(
    items: { label: string; count: number }[]
  ): AnalyticsItem[] {
    const maximum = Math.max(1, ...items.map(item => item.count));

    return items
      .sort((a, b) =>
        b.count - a.count || a.label.localeCompare(b.label)
      )
      .map(item => ({
        ...item,
        percent: Math.round((item.count / maximum) * 100)
      }));
  }

  private matchesStatus(status: string | null | undefined): boolean {
    return this.statusFilter === 'ALL' ||
      (status ?? '').toUpperCase() === this.statusFilter;
  }

  private includes(value: unknown, query: string): boolean {
    return String(value ?? '').toLowerCase().includes(query);
  }

  private handleLoadError(error: HttpErrorResponse): void {
    console.error('Tenant directory loading failed:', error);

    this.loading = false;

    if (error.status === 401) {
      this.errorMessage =
        'Your session has expired. Please sign in again.';
    } else if (error.status === 403) {
      this.errorMessage =
        'You do not have permission to view these records.';
    } else if (error.status === 0) {
      this.errorMessage =
        'Cannot connect to the server. Check your connection and try again.';
    } else {
      this.errorMessage =
        error.error?.message ||
        'Records could not be loaded. Please try again.';
    }
  }

  // =========================================================
  // CLEANUP
  // =========================================================

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
