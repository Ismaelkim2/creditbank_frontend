import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Loan } from '../../models/loan.model';
import { DataServiceService } from '../services/data.service';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, catchError, timeout } from 'rxjs/operators';
import { AuthService } from '../services/auth-service.service';
import { ActivatedRoute } from '@angular/router';
  import { from } from 'rxjs';
import { concatMap } from 'rxjs/operators';


@Component({
  selector: 'app-repayment-form',
  templateUrl: './repayment-form.component.html',
  styleUrls: ['./repayment-form.component.css']
})
export class RepaymentFormComponent implements OnInit, AfterViewInit, OnDestroy {

  repayment = {
    identifier: '',
    amountPaid: null as number | null,
    repaymentDate: '',
    phoneNumber: '',
    location: '',
    idNo: '',
    accountNumber: ''
  };

  isApplicant = false;
  loanDetails: Loan[] = [];
  selectedLoan: Loan | null = null;
  errorMessage = '';
  loading = false;
  originalIdentifier = '';
  searchType: 'loanId' | 'idNo' | 'phone' = 'loanId';

  private identifierChange$ = new Subject<string>();
  private currentLookupSub: Subscription | null = null;
  private loanIdFromRoute: string | null = null;
  private suppressIdentifier = false; // prevents reacting to programmatic changes
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private dataService: DataServiceService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

 ngOnInit(): void {
  this.isApplicant = this.authService.getRole() === 'APPLICANT';

  // Debounced identifier changes
  this.identifierChange$
    .pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    )
    .subscribe(id => {
      if (!id || this.suppressIdentifier) return;
      this.lookupLoan(id);
    });

  // Handle query params safely
  this.route.queryParams
    .pipe(
      debounceTime(50), // small debounce to avoid flooding
      distinctUntilChanged((p1, p2) => p1['loanId'] === p2['loanId']),
      takeUntil(this.destroy$)
    )
    .subscribe(params => {
      const newLoanId = params['loanId']?.toString();
      if (newLoanId && newLoanId !== this.repayment.identifier) {
        this.suppressIdentifier = true;
        this.repayment.identifier = newLoanId;
        this.suppressIdentifier = false;

        // Fire asynchronously to avoid blocking
        setTimeout(() => this.identifierChange$.next(newLoanId), 0);
      }
    });

  // Default repayment date
  this.repayment.repaymentDate = new Date().toISOString().split('T')[0];

  // Pre-fill from DataService if available
  const repaymentData = this.dataService.getRepaymentData();
  if (repaymentData) {
    this.suppressIdentifier = true;
    this.repayment.identifier = repaymentData.loanId?.toString() || '';
    this.repayment.phoneNumber = repaymentData.phoneNumber?.toString() || '';
    this.repayment.location = repaymentData.location || '';
    this.repayment.idNo = repaymentData.idNo || '';
    this.repayment.accountNumber = repaymentData.accountNumber || '';
    this.suppressIdentifier = false;

    if (this.repayment.identifier) {
      setTimeout(() => this.identifierChange$.next(this.repayment.identifier), 50);
    }
  }
}


  ngAfterViewInit(): void {
    if (this.loanIdFromRoute && this.loanDetails.length === 0) {
    
    }
  }

  ngOnDestroy(): void {
    this.currentLookupSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  getPlaceholder(): string {
    switch (this.searchType) {
      case 'loanId': return 'e.g. 1001';
      case 'idNo': return 'e.g. 12345678';
      case 'phone': return 'e.g. 07xxxxxxxx';
      default: return '';
    }
  }

  onLoanIdentifierChange(identifier: string) {
    if (this.suppressIdentifier) return;
    if (/^\d{9}$/.test(identifier)) identifier = '0' + identifier;

    this.suppressIdentifier = true;
    this.repayment.identifier = identifier;
    this.suppressIdentifier = false;

    this.identifierChange$.next(identifier);
  }

  get latestLoan(): Loan | null {
    return this.loanDetails.length ? this.loanDetails[this.loanDetails.length - 1] : null;
  }

private lookupLoan(identifier: string) {
  if (!identifier.trim()) {
    this.loanDetails = [];
    this.errorMessage = '';
    this.loading = false;
    return;
  }

  // Cancel previous HTTP call if still running
  this.currentLookupSub?.unsubscribe();

  this.loading = true;
  this.errorMessage = '';
  this.loanDetails = [];
  this.originalIdentifier = identifier;

  const urls = {
    loanId: `http://localhost:8080/api/loans/${identifier}`,
    idNo: `http://localhost:8080/api/loans/by-idno/${identifier}`,
    phone: `http://localhost:8080/api/loans/by-phone/${identifier}`
  };

  this.currentLookupSub = this.http.get<any>(urls[this.searchType])
    .pipe(
      timeout(5000),
      catchError(err => of({ __error: err })),
      takeUntil(this.destroy$)
    )
    .subscribe(result => {
      this.loading = false;

      if ((result as any).__error) {
        const err = (result as any).__error;
        if (err.status === 404) this.errorMessage = '❌ Loan details not found.';
        else if (err.name === 'TimeoutError') this.errorMessage = '❌ Loan lookup timed out.';
        else this.errorMessage = '❌ Unexpected error occurred.';
        return;
      }

      const data = result;
      this.loanDetails = Array.isArray(data) ? data : data ? [data] : [];

      const latest = this.latestLoan;
      this.repayment.phoneNumber = latest?.phoneNumber?.toString() || this.repayment.phoneNumber;
      this.repayment.location = latest?.location || this.repayment.location;
      this.repayment.accountNumber = latest?.accountNumber?.trim() || this.repayment.accountNumber?.trim() || this.authService.getUser()?.accountNumber?.trim() || '';
      this.repayment.idNo = (latest?.idNo ?? this.authService.getUser()?.nationalId ?? '').toString();

      this.errorMessage = '';
    });
}



  get balanceDue(): number {
    return this.latestLoan?.dueAmount ?? 0;
  }

  selectLoanForRepayment(loan: Loan) {
    this.selectedLoan = loan;
    this.suppressIdentifier = true;
    this.repayment.identifier = loan.id?.toString() || '';
    this.suppressIdentifier = false;

    this.repayment.phoneNumber = loan.phoneNumber?.toString() || '';
    this.repayment.location = loan.location || '';
    this.repayment.amountPaid = loan.dueAmount ?? 0;
    this.repayment.accountNumber = loan.accountNumber?.trim() || this.repayment.accountNumber?.trim() || this.authService.getUser()?.accountNumber?.trim() || '';
    this.repayment.idNo = (loan.idNo ?? this.authService.getUser()?.nationalId ?? '').toString();

    // Non-blocking confirmation
    if (window.confirm(`💳 Repay KES ${loan.dueAmount} for Loan ID ${loan.id}?`)) {
      this.submitSingleRepayment(loan);
    }
  }

  submitSingleRepayment(loan: Loan) {
    const user = this.authService.getUser();
    const payload = {
      loanId: loan.id,
      amountPaid: loan.dueAmount,
      repaymentDate: this.repayment.repaymentDate,
      phoneNumber: loan.phoneNumber || user?.phoneNumber || this.repayment.phoneNumber,
      location: loan.location || this.repayment.location,
      idNo: (loan.idNo ?? user?.nationalId ?? this.repayment.idNo)?.toString(),
      accountNumber: this.repayment.accountNumber?.trim() || loan.accountNumber?.trim() || user?.accountNumber?.trim() || ''
    };

    if (!payload.accountNumber) return;

    this.http.post<any>('http://localhost:8080/api/repayments', payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          // non-blocking message
          console.log(`✅ Payment successful for Loan ID ${loan.id}`);
          loan.dueAmount = res.remainingDue ?? 0;
          this.repayment.amountPaid = null;
        },
        error: err => console.error(err.error?.message || '❌ Unexpected error')
      });
  }

  submitRepayment() {
    const entered = this.repayment.amountPaid ?? 0;
    const latest = this.latestLoan;
    if (!latest || entered <= 0 || entered > this.balanceDue) return;

    const user = this.authService.getUser();
    const payload = {
      loanId: latest.id,
      amountPaid: entered,
      repaymentDate: this.repayment.repaymentDate,
      phoneNumber: this.repayment.phoneNumber || user?.phoneNumber,
      location: this.repayment.location,
      idNo: user?.nationalId || latest.idNo || '',
      accountNumber: this.repayment.accountNumber?.trim() || user?.accountNumber || latest.accountNumber || ''
    };

    if (!payload.accountNumber) return;

    this.http.post<any>('http://localhost:8080/api/repayments', payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          console.log(res.message || '✅ Repayment successful.');
          latest.dueAmount = res.remainingDue ?? 0;
          this.repayment.amountPaid = null;
        },
        error: err => console.error(err.error?.message || '❌ Unexpected error')
      });
  }

  get displayAccount(): string {
    const acc = this.latestLoan?.accountNumber || this.repayment.accountNumber || this.authService.getUser()?.accountNumber;
    return acc?.trim() ? acc : 'N/A';
  }



repayAll() {
  const unpaidLoans = this.loanDetails.filter(l => l?.dueAmount! > 0);
  if (!unpaidLoans.length) return;

  from(unpaidLoans).pipe(
    concatMap(loan => {
      const payload = {
        loanId: loan.id,
        amountPaid: loan.dueAmount,
        repaymentDate: this.repayment.repaymentDate,
        phoneNumber: loan.phoneNumber,
        location: loan.location
      };
      return this.http.post<any>('http://localhost:8080/api/repayments', payload).pipe(
        catchError(err => {
          console.error(`Loan ${loan.id} error:`, err.error || err);
          return of(null);
        })
      );
    })
  ).subscribe(res => {
    if (res) {
      const loan = unpaidLoans.find(l => l.id === res.loanId);
      if (loan) loan.dueAmount = res.remainingDue ?? 0;
    }
  }, null, () => console.log("✅ All repayments processed sequentially."));
}


  allLoansCleared(): boolean {
    return this.loanDetails.length ? this.loanDetails.every(l => l.dueAmount === 0) : true;
  }
}
