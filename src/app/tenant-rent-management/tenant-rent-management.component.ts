
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  Subject,
  forkJoin,
  finalize,
  takeUntil
} from 'rxjs';

import {
  TenantRentService,
  TenantRentChargeResponse,
  TenantRentPaymentResponse,
  TenantRentPaymentRequest,
  TenantRentLeaseOption,
  RentChargeStatus,
  RentPaymentMethod
} from '../services/tenant-rent.service';

type RentView = 'CHARGES' | 'PAYMENTS';
type ChargeFilter = 'ALL' | RentChargeStatus;
type PaymentFilter = 'ALL' | 'POSTED' | 'REVERSED';

@Component({
  selector: 'app-tenant-rent-management',
  templateUrl: './tenant-rent-management.component.html',
  styleUrls: ['./tenant-rent-management.component.css']
})
export class TenantRentManagementComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  paymentForm!: FormGroup;
  reversalForm!: FormGroup;

  charges: TenantRentChargeResponse[] = [];
  payments: TenantRentPaymentResponse[] = [];
  leases: TenantRentLeaseOption[] = [];

  activeView: RentView = 'CHARGES';
  chargeFilter: ChargeFilter = 'ALL';
  paymentFilter: PaymentFilter = 'ALL';

  chargeSearch = '';
  paymentSearch = '';

  loading = false;
  savingPayment = false;
  reversingPayment = false;
  loadingLeases = false;

  pageError = '';
  paymentError = '';
  paymentSuccess = '';
  reversalError = '';
  reversalSuccess = '';

  selectedPaymentForReversal: TenantRentPaymentResponse | null = null;

  readonly paymentMethods: {
    value: RentPaymentMethod;
    label: string;
  }[] = [
    { value: 'MPESA', label: 'M-Pesa' },
    { value: 'BANK_TRANSFER', label: 'Bank transfer' },
    { value: 'CASH', label: 'Cash' },
    { value: 'OTHER', label: 'Other' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly rentService: TenantRentService
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.loadData();
  }

  private buildForms(): void {
    this.paymentForm = this.fb.group({
      leaseId: [null, Validators.required],
      paymentReference: [
        '',
        [Validators.required, Validators.maxLength(100)]
      ],
      amount: [
        null,
        [Validators.required, Validators.min(0.01)]
      ],
      paymentMethod: ['MPESA', Validators.required],
      notes: ['', Validators.maxLength(1000)]
    });

    this.reversalForm = this.fb.group({
      reason: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }

  loadData(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.pageError = '';

    forkJoin({
      charges: this.rentService.getCharges(),
      payments: this.rentService.getPayments(),
      leases: this.rentService.getLeases()
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: result => {
          this.charges = result.charges || [];
          this.payments = result.payments || [];
          this.leases = result.leases || [];
        },
        error: error => {
          this.pageError = this.errorMessage(error);
        }
      });
  }

  get activeLeases(): TenantRentLeaseOption[] {
    return this.leases.filter(lease => lease.status === 'ACTIVE');
  }

  get totalCharged(): number {
    return this.charges.reduce(
      (sum, charge) => sum + Number(charge.amount || 0), 0
    );
  }

  get totalAllocated(): number {
    return this.charges.reduce(
      (sum, charge) => sum + Number(charge.paidAmount || 0), 0
    );
  }

  get totalOutstanding(): number {
    return this.charges.reduce(
      (sum, charge) => sum + Math.max(0, Number(charge.balance || 0)), 0
    );
  }

  get overdueCharges(): TenantRentChargeResponse[] {
    const today = this.localDateString();

    return this.charges.filter(charge =>
      Number(charge.balance || 0) > 0 &&
      charge.dueDate < today &&
      charge.status !== 'PAID'
    );
  }

  get overdueBalance(): number {
    return this.overdueCharges.reduce(
      (sum, charge) => sum + Math.max(0, Number(charge.balance || 0)), 0
    );
  }

  get filteredCharges(): TenantRentChargeResponse[] {
    const query = this.chargeSearch.trim().toLowerCase();

    return this.charges.filter(charge => {
      const matchesStatus =
        this.chargeFilter === 'ALL' ||
        charge.status === this.chargeFilter;

      const searchContent = [
        charge.leaseCode,
        charge.tenantName,
        charge.propertyName,
        charge.unitNumber,
        charge.dueDate,
        charge.status
      ].join(' ').toLowerCase();

      return matchesStatus &&
        (!query || searchContent.includes(query));
    });
  }

  get filteredPayments(): TenantRentPaymentResponse[] {
    const query = this.paymentSearch.trim().toLowerCase();

    return this.payments.filter(payment => {
      const matchesStatus =
        this.paymentFilter === 'ALL' ||
        payment.status === this.paymentFilter;

      const searchContent = [
        payment.leaseCode,
        payment.tenantName,
        payment.paymentReference,
        payment.paymentMethod,
        payment.status
      ].join(' ').toLowerCase();

      return matchesStatus &&
        (!query || searchContent.includes(query));
    });
  }

  get postedPaymentsTotal(): number {
    return this.payments
      .filter(payment => payment.status === 'POSTED')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }

  get reversedPaymentsTotal(): number {
    return this.payments
      .filter(payment => payment.status === 'REVERSED')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }

  
  /** Total unallocated credit across all posted payments. */
  get totalAvailableCredit(): number {
    return this.payments
      .filter(payment => payment.status === 'POSTED')
      .reduce(
        (sum, payment) => sum + this.unallocatedCredit(payment),
        0
      );
  }

  /** Calculate the unused portion of one posted payment. */
  unallocatedCredit(payment: TenantRentPaymentResponse): number {
    if (payment.status !== 'POSTED') {
      return 0;
    }

    const allocated = (payment.allocations || []).reduce(
      (sum, allocation) => sum + Number(allocation.amount || 0),
      0
    );

    const remaining = Number(payment.amount || 0) - allocated;

    // Avoid negative balances and floating-point display noise.
    return Math.max(0, Math.round((remaining + Number.EPSILON) * 100) / 100);
  }

  /** Only payments with an actual positive available credit balance. */
  get paymentsWithAvailableCredit(): TenantRentPaymentResponse[] {
    return this.payments.filter(
      payment => this.unallocatedCredit(payment) > 0
    );
  }


  setView(view: RentView): void {
    this.activeView = view;
    this.pageError = '';
  }

  selectLeaseForPayment(value: number | string | null): void {
    const leaseId = Number(value);
    const lease = this.activeLeases.find(item => item.id === leaseId);

    if (!lease) {
      return;
    }

    // Convenience only: the payment amount remains editable.
    // The backend must determine the actual outstanding allocation.
    this.paymentForm.patchValue({
      amount: lease.monthlyRent
    });
  }

  recordPayment(): void {
    this.paymentError = '';
    this.paymentSuccess = '';

    if (this.savingPayment) {
      return;
    }

    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      this.paymentError =
        'Complete the required fields and enter a valid payment amount.';
      return;
    }

    const value = this.paymentForm.getRawValue();

    const request: TenantRentPaymentRequest = {
      leaseId: Number(value.leaseId),
      paymentReference: String(value.paymentReference).trim(),
      amount: Number(value.amount),
      paymentMethod: value.paymentMethod as RentPaymentMethod,
      notes: String(value.notes || '').trim() || null
    };

    if (!request.paymentReference) {
      this.paymentError = 'Payment reference is required.';
      return;
    }

    this.savingPayment = true;

    this.rentService.recordPayment(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.savingPayment = false)
      )
      .subscribe({
        next: payment => {
          this.payments = [
            payment,
            ...this.payments.filter(item => item.id !== payment.id)
          ];

          this.paymentSuccess =
            `Payment ${payment.paymentReference} was recorded. Confirm its allocations and updated balances below.`;

          this.paymentForm.reset({
            leaseId: null,
            paymentReference: '',
            amount: null,
            paymentMethod: 'MPESA',
            notes: ''
          });

          this.loadData();
          this.activeView = 'PAYMENTS';
        },
        error: error => {
          this.paymentError = this.errorMessage(error);
        }
      });
  }

  beginReversal(payment: TenantRentPaymentResponse): void {
    if (payment.status !== 'POSTED' || this.reversingPayment) {
      return;
    }

    this.selectedPaymentForReversal = payment;
    this.reversalError = '';
    this.reversalSuccess = '';
    this.reversalForm.reset({ reason: '' });
  }

  cancelReversal(): void {
    if (this.reversingPayment) {
      return;
    }

    this.selectedPaymentForReversal = null;
    this.reversalError = '';
    this.reversalForm.reset({ reason: '' });
  }

  confirmReversal(): void {
    this.reversalError = '';
    this.reversalSuccess = '';

    const payment = this.selectedPaymentForReversal;

    if (!payment || payment.status !== 'POSTED') {
      this.reversalError = 'Select a posted payment to reverse.';
      return;
    }

    if (this.reversalForm.invalid) {
      this.reversalForm.markAllAsTouched();
      this.reversalError = 'Enter a reason for reversing this payment.';
      return;
    }

    const reason = String(
      this.reversalForm.getRawValue().reason || ''
    ).trim();

    if (!reason) {
      this.reversalError = 'A reversal reason is required.';
      return;
    }

    const confirmed = window.confirm(
      `Reverse payment ${payment.paymentReference} for ${payment.tenantName}? This is a financial action and may restore outstanding rent balances.`
    );

    if (!confirmed) {
      return;
    }

    this.reversingPayment = true;

    this.rentService.reversePayment(payment.id, reason)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.reversingPayment = false)
      )
      .subscribe({
        next: updatedPayment => {
          this.payments = this.payments.map(item =>
            item.id === updatedPayment.id ? updatedPayment : item
          );

          this.reversalSuccess =
            `Payment ${updatedPayment.paymentReference} was reversed. Review the refreshed charge balances.`;

          this.selectedPaymentForReversal = null;
          this.reversalForm.reset({ reason: '' });
          this.loadData();
        },
        error: error => {
          this.reversalError = this.errorMessage(error);
        }
      });
  }

  chargeStatusClass(status: RentChargeStatus): string {
    switch (status) {
      case 'PAID': return 'rent-status-paid';
      case 'PARTIALLY_PAID': return 'rent-status-partial';
      case 'OVERDUE': return 'rent-status-overdue';
      default: return 'rent-status-open';
    }
  }

  paymentStatusClass(status: 'POSTED' | 'REVERSED'): string {
    return status === 'POSTED'
      ? 'rent-status-paid'
      : 'rent-status-reversed';
  }

  paymentMethodLabel(method: RentPaymentMethod): string {
    return this.paymentMethods.find(item => item.value === method)?.label
      || method;
  }

  isInvalid(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    return !!control && control.invalid &&
      (control.dirty || control.touched);
  }

  trackCharge(_index: number, charge: TenantRentChargeResponse): number {
    return charge.id;
  }

  trackPayment(_index: number, payment: TenantRentPaymentResponse): number {
    return payment.id;
  }

  private localDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error && error.message
      ? error.message
      : 'An unexpected error occurred. Please try again.';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
