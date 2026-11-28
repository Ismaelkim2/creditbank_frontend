
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  Subject,
  forkJoin,
  finalize,
  takeUntil
} from 'rxjs';

import {
  TenantLeaseService,
  TenantLeaseRequest,
  TenantLeaseResponse,
  TenantLeaseStatus,
  LeaseTenantOption,
  LeasePropertyOption,
  LeaseUnitOption
} from '../services/tenant-lease.service';

@Component({
  selector: 'app-tenant-lease-management',
  templateUrl: './tenant-lease-management.component.html',
  styleUrls: ['./tenant-lease-management.component.css']
})
export class TenantLeaseManagementComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  leaseForm!: FormGroup;

  leases: TenantLeaseResponse[] = [];
  tenants: LeaseTenantOption[] = [];
  properties: LeasePropertyOption[] = [];
  units: LeaseUnitOption[] = [];

  selectedPropertyId: number | null = null;

  loading = false;
  loadingLookups = false;
  loadingUnits = false;
  saving = false;
  actionLeaseId: number | null = null;

  pageError = '';
  formError = '';
  successMessage = '';

  searchTerm = '';
  statusFilter: 'ALL' | TenantLeaseStatus = 'ALL';

  showLeaseForm = false;

  readonly statusOptions: TenantLeaseStatus[] = [
    'DRAFT',
    'ACTIVE',
    'TERMINATED',
    'EXPIRED'
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly leaseService: TenantLeaseService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadInitialData();
  }

  private buildForm(): void {
    this.leaseForm = this.fb.group({
      tenantId: [null, Validators.required],
      propertyId: [null, Validators.required],
      unitId: [null, Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      monthlyRent: [
        null,
        [Validators.required, Validators.min(0.01)]
      ],
      depositAmount: [
        0,
        [Validators.required, Validators.min(0)]
      ],
      rentDueDay: [
        1,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(28)
        ]
      ],
      terms: ['', Validators.maxLength(10000)]
    });

    this.leaseForm.get('propertyId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        const propertyId = Number(value);

        this.selectedPropertyId =
          Number.isFinite(propertyId) && propertyId > 0
            ? propertyId
            : null;

        this.units = [];
        this.leaseForm.patchValue(
          { unitId: null },
          { emitEvent: false }
        );

        if (this.selectedPropertyId) {
          this.loadUnits(this.selectedPropertyId);
        }
      });

    this.leaseForm.get('unitId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        const unit = this.units.find(item => item.id === Number(value));

        if (!unit) {
          return;
        }

        // Use the unit's defaults to speed up registration.
        // The values remain editable because the lease may agree a
        // different rent or deposit from the unit's advertised values.
        this.leaseForm.patchValue({
          monthlyRent: unit.monthlyRent,
          depositAmount: unit.depositAmount
        }, { emitEvent: false });
      });
  }

  private loadInitialData(): void {
    this.loadingLookups = true;
    this.pageError = '';

    forkJoin({
      tenants: this.leaseService.getTenants(),
      properties: this.leaseService.getProperties(),
      leases: this.leaseService.getLeases()
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingLookups = false)
      )
      .subscribe({
        next: result => {
          this.tenants = result.tenants || [];
          this.properties = result.properties || [];
          this.leases = result.leases || [];

          if (!this.tenants.length) {
            this.pageError =
              'No tenants were returned. Register a tenant before creating a lease.';
          } else if (!this.properties.length) {
            this.pageError =
              'No properties were returned. Register a property and its units first.';
          }
        },
        error: error => {
          this.pageError = this.errorMessage(error);
        }
      });
  }

  private loadUnits(propertyId: number): void {
    this.loadingUnits = true;
    this.formError = '';

    this.leaseService.getUnits(propertyId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingUnits = false)
      )
      .subscribe({
        next: units => {
          this.units = (units || []).filter(
            unit => unit.status === 'VACANT'
          );

          if (!this.units.length) {
            this.formError =
              'No vacant units are available for this property.';
          }
        },
        error: error => {
          this.units = [];
          this.formError = this.errorMessage(error);
        }
      });
  }

  refresh(): void {
    this.loadInitialData();
  }

  get filteredLeases(): TenantLeaseResponse[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.leases.filter(lease => {
      const matchesStatus =
        this.statusFilter === 'ALL' ||
        lease.status === this.statusFilter;

      const searchable = [
        lease.leaseCode,
        lease.tenantName,
        lease.propertyName,
        lease.unitNumber
      ].join(' ').toLowerCase();

      return matchesStatus &&
        (!query || searchable.includes(query));
    });
  }

  get draftCount(): number {
    return this.leases.filter(lease => lease.status === 'DRAFT').length;
  }

  get activeCount(): number {
    return this.leases.filter(lease => lease.status === 'ACTIVE').length;
  }

  get terminatedCount(): number {
    return this.leases.filter(
      lease => lease.status === 'TERMINATED'
    ).length;
  }

  get activeMonthlyRent(): number {
    return this.leases
      .filter(lease => lease.status === 'ACTIVE')
      .reduce((total, lease) => total + Number(lease.monthlyRent || 0), 0);
  }

  get availableTenants(): LeaseTenantOption[] {
    return this.tenants.filter(
      tenant => !tenant.status || tenant.status === 'ACTIVE'
    );
  }

  get availableProperties(): LeasePropertyOption[] {
    return this.properties;
  }

  submitLease(): void {
    this.formError = '';
    this.successMessage = '';

    if (this.saving) {
      return;
    }

    if (this.leaseForm.invalid) {
      this.leaseForm.markAllAsTouched();
      this.formError = 'Please correct the highlighted fields before saving.';
      return;
    }

    const value = this.leaseForm.getRawValue();

    if (value.endDate < value.startDate) {
      this.formError = 'The lease end date cannot be earlier than its start date.';
      return;
    }

    const unitId = Number(value.unitId);
    const selectedUnit = this.units.find(unit => unit.id === unitId);

    if (!selectedUnit || selectedUnit.status !== 'VACANT') {
      this.formError =
        'The selected unit is no longer available. Refresh the units and select a vacant unit.';
      return;
    }

    const request: TenantLeaseRequest = {
      tenantId: Number(value.tenantId),
      unitId,
      startDate: value.startDate,
      endDate: value.endDate,
      monthlyRent: Number(value.monthlyRent),
      depositAmount: Number(value.depositAmount),
      rentDueDay: Number(value.rentDueDay),
      terms: value.terms?.trim() || null
    };

    this.saving = true;

    this.leaseService.createLease(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.saving = false)
      )
      .subscribe({
        next: lease => {
          this.leases = [lease, ...this.leases.filter(
            item => item.id !== lease.id
          )];

          this.successMessage =
            `Lease ${lease.leaseCode} was created successfully. It is currently ${lease.status.toLowerCase()}.`;

          this.resetForm();
          this.loadInitialData();
        },
        error: error => {
          this.formError = this.errorMessage(error);
        }
      });
  }

  activateLease(lease: TenantLeaseResponse): void {
    if (lease.status !== 'DRAFT' || this.actionLeaseId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Activate lease ${lease.leaseCode} for ${lease.tenantName} in unit ${lease.unitNumber}? Ensure the lease details have been verified.`
    );

    if (!confirmed) {
      return;
    }

    this.runLeaseAction(
      lease,
      () => this.leaseService.activateLease(lease.id),
      `Lease ${lease.leaseCode} has been activated.`
    );
  }

  terminateLease(lease: TenantLeaseResponse): void {
    if (lease.status !== 'ACTIVE' || this.actionLeaseId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Terminate lease ${lease.leaseCode} for ${lease.tenantName}? This action may affect occupancy and future rent charging.`
    );

    if (!confirmed) {
      return;
    }

    this.runLeaseAction(
      lease,
      () => this.leaseService.terminateLease(lease.id),
      `Lease ${lease.leaseCode} has been terminated.`
    );
  }

  private runLeaseAction(
    lease: TenantLeaseResponse,
    action: () => import('rxjs').Observable<TenantLeaseResponse>,
    message: string
  ): void {
    this.pageError = '';
    this.successMessage = '';
    this.actionLeaseId = lease.id;

    action()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.actionLeaseId = null)
      )
      .subscribe({
        next: updatedLease => {
          this.leases = this.leases.map(item =>
            item.id === updatedLease.id ? updatedLease : item
          );

          this.successMessage = message;
          this.loadInitialData();
        },
        error: error => {
          this.pageError = this.errorMessage(error);
        }
      });
  }

  resetForm(): void {
    this.leaseForm.reset({
      tenantId: null,
      propertyId: null,
      unitId: null,
      startDate: '',
      endDate: '',
      monthlyRent: null,
      depositAmount: 0,
      rentDueDay: 1,
      terms: ''
    });

    this.selectedPropertyId = null;
    this.units = [];
    this.formError = '';
    this.leaseForm.markAsPristine();
    this.leaseForm.markAsUntouched();
  }

  isInvalid(controlName: string): boolean {
    const control = this.leaseForm.get(controlName);
    return !!control && control.invalid &&
      (control.touched || control.dirty);
  }

  statusClass(status: TenantLeaseStatus): string {
    switch (status) {
      case 'ACTIVE':
        return 'status-active';
      case 'DRAFT':
        return 'status-draft';
      case 'TERMINATED':
        return 'status-terminated';
      case 'EXPIRED':
        return 'status-expired';
      default:
        return 'status-draft';
    }
  }

  trackByLease(_index: number, lease: TenantLeaseResponse): number {
    return lease.id;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
