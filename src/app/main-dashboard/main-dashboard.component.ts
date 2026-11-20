import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  catchError,
  finalize,
  forkJoin,
  of,
  Subject,
  takeUntil
} from 'rxjs';
import { LoanService } from '../services/loan.service';
import { MpesaService } from '../services/mpesa.service';
import { AuthService } from '../services/auth-service.service';
import { Router } from '@angular/router';
import { AccountService } from '../services/account.service';

@Component({
  selector: 'app-main-dashboard',
  templateUrl: './main-dashboard.component.html',
  styleUrls: ['./main-dashboard.component.css']
})
export class MainDashboardComponent {

  
    isAdmin = false;
  
    greeting = '';
  
  username = '';
  
  currentDate = '';
  
  currentTime = '';
  
  private clockInterval: any;
  
    private destroy$ = new Subject<void>();
  
    loans: any[] = [];
    intelligentLoans: any[] = [];

    selectedRiskFilter: 'ALL' | 'PERFORMING' | 'WATCHLIST' | 'ARREARS' | 'DEFAULT' = 'ALL';
  
    loadingPortfolio = true;
    loadingRepaid = true;
    loadingOutstanding = true;
    loadingBalance = true;
  
    balance = 0;
  
    totalLoansAmount = 0;
  
    loadingAiTable = true;
  
    repaymentStats = {
      totalDisbursed: 0,
      totalRepaid: 0,
      outstanding: 0
    };
  
    portfolioMetrics = {
      par1: 0,
      par30: 0,
      npl: 0
    };

    // =====================================================
// LIVE CREDIT PORTFOLIO HEALTH
// =====================================================

portfolioHealthStats = {
  performing: 0,
  watchlist: 0,
  arrears: 0,
  default: 0
};

portfolioHealthAmounts = {
  performing: 0,
  watchlist: 0,
  arrears: 0,
  default: 0
};

portfolioHealthPercentages = {
  performing: 0,
  watchlist: 0,
  arrears: 0,
  default: 0
};

portfolioHealthTotal = 0;
  
    overdueLoans = 0;
    collectionEfficiency = 0;
  
  aiConfidence = 98.7;
  
  projectedCollections = 0;
  
  fraudLevel = 'LOW';
  
  executiveRecommendation = 'Continue Lending';

accounts: any[] = [];

totalAccounts = 0;

activeAccounts = 0;
dormantAccounts = 0;
closedAccounts = 0;

activeAccountPercentage = 0;
dormantAccountPercentage = 0;
closedAccountPercentage = 0;

loadingAccounts = true;

accountsLastUpdated = '';

// =====================================================
// LIVE MONTHLY CREDIT PORTFOLIO
// =====================================================

monthlyPortfolio: Array<{
  label: string;
  monthKey: string;
  disbursed: number;
  collected: number;
  outstanding: number;
  facilities: number;
}> = [];

portfolioChartMax = 0;

portfolioMonthlyInsight =
  'Waiting for live portfolio data...';


  
    constructor(
      private loanService: LoanService,
      private mpesaService: MpesaService,
      private authService: AuthService,
      private accountService: AccountService,
      private router: Router
    ) {}
  
  ngOnInit(): void {
  
    this.username = this.authService.getUsername() || 'User';
  
    this.isAdmin =
      (this.authService.getRole() || '')
        .toUpperCase()
        .replace('ROLE_', '')
        .trim() === 'ADMIN';
  
    this.updateDateTime();
  
    this.clockInterval = setInterval(() => {
  
      this.updateDateTime();
  
    }, 1000);
  
    this.loadDashboard();
  this.loadAccounts();
    this.loadMpesaBalance();
  
  }
  
    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
      clearInterval(this.clockInterval);
    }
  
  
    private updateDateTime(): void {
  
      const now = new Date();
  
      const hour = now.getHours();
  
      if (hour < 12) {
  
          this.greeting = 'Good Morning';
  
      }
      else if (hour < 17) {
  
          this.greeting = 'Good Afternoon';
  
      }
      else {
  
          this.greeting = 'Good Evening';
  
      }
  
      this.currentDate = now.toLocaleDateString('en-GB', {
  
          weekday: 'long',
  
          day: 'numeric',
  
          month: 'long',
  
          year: 'numeric'
  
      });
  
      this.currentTime = now.toLocaleTimeString('en-GB');
  
  }



// =====================================================
// BUILD LIVE MONTHLY PORTFOLIO
// =====================================================

buildMonthlyPortfolio(): void {

  const months = 6;

  const now = new Date();

  const monthlyMap = new Map<string, {
    label: string;
    monthKey: string;
    disbursed: number;
    collected: number;
    outstanding: number;
    facilities: number;
  }>();


  // ---------------------------------------------------
  // CREATE LAST 6 MONTHS
  // ---------------------------------------------------

  for (let i = months - 1; i >= 0; i--) {

    const date = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    const year = date.getFullYear();

    const month = date.getMonth();

    const monthKey =
      `${year}-${String(month + 1).padStart(2, '0')}`;

    const label = date.toLocaleDateString(
      'en-GB',
      {
        month: 'short'
      }
    );

    monthlyMap.set(monthKey, {
      label,
      monthKey,
      disbursed: 0,
      collected: 0,
      outstanding: 0,
      facilities: 0
    });
  }


  // ---------------------------------------------------
  // PROCESS LOANS
  // ---------------------------------------------------

  (this.loans || []).forEach(loan => {

    const disbursedDate =
      this.getLoanDisbursedDate(loan);

    if (disbursedDate) {

      const monthKey =
        this.getMonthKey(disbursedDate);

      const month =
        monthlyMap.get(monthKey);

      if (month) {

        month.disbursed +=
          this.getTotalFacilityAmount(loan);

        month.facilities++;
      }
    }


    // -------------------------------------------------
    // REPAYMENTS
    // -------------------------------------------------

    const repayments =
      Array.isArray(loan?.repayments)
        ? loan.repayments
        : [];

    repayments.forEach((repayment: any) => {

      const repaymentDate =
        repayment?.paymentDate ||
        repayment?.repaymentDate ||
        repayment?.date ||
        repayment?.createdAt;

      if (!repaymentDate) {
        return;
      }

      const monthKey =
        this.getMonthKey(
          new Date(repaymentDate)
        );

      const month =
        monthlyMap.get(monthKey);

      if (!month) {
        return;
      }

      const amount = this.toNumber(
        repayment?.amount ??
        repayment?.paymentAmount ??
        repayment?.paidAmount ??
        0
      );

      month.collected += amount;
    });

  });


  // ---------------------------------------------------
  // CALCULATE CURRENT OUTSTANDING
  // ---------------------------------------------------

  monthlyMap.forEach(month => {

    month.outstanding =
      this.calculateMonthlyOutstanding(
        month.monthKey
      );

  });


  // ---------------------------------------------------
  // FINAL ARRAY
  // ---------------------------------------------------

  this.monthlyPortfolio =
    Array.from(monthlyMap.values());


  // ---------------------------------------------------
  // CHART SCALE
  // ---------------------------------------------------

  this.portfolioChartMax =
    Math.max(
      ...this.monthlyPortfolio.flatMap(month => [
        month.disbursed,
        month.collected,
        month.outstanding
      ]),
      1
    );


  // ---------------------------------------------------
  // INSIGHT
  // ---------------------------------------------------

  this.buildPortfolioMonthlyInsight();
}


// =====================================================
// GET DISBURSEMENT DATE
// =====================================================

private getLoanDisbursedDate(
  loan: any
): Date | null {

  const value =
    loan?.disbursedDate ??
    loan?.disbursementDate;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  return isNaN(date.getTime())
    ? null
    : date;
}


// =====================================================
// MONTH KEY
// =====================================================

private getMonthKey(date: Date): string {

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}`;
}


// =====================================================
// MONTHLY OUTSTANDING
// =====================================================

private calculateMonthlyOutstanding(
  monthKey: string
): number {

  let total = 0;

  const [year, month] =
    monthKey.split('-').map(Number);


  (this.loans || []).forEach(loan => {

    const disbursedDate =
      this.getLoanDisbursedDate(loan);

    if (!disbursedDate) {
      return;
    }

    const loanMonthKey =
      this.getMonthKey(disbursedDate);

    // Facility had not yet entered portfolio
    if (loanMonthKey > monthKey) {
      return;
    }


    // -------------------------------------------------
    // CURRENT OUTSTANDING
    // -------------------------------------------------

    const facility =
      this.getTotalFacilityAmount(loan);

    const amountPaid =
      this.toNumber(
        loan?.amountPaid ??
        loan?.paidAmount ??
        loan?.totalPaid ??
        0
      );

    const outstanding =
      Math.max(
        facility - amountPaid,
        0
      );

    total += outstanding;

  });


  return total;
}


// =====================================================
// CHART BAR HEIGHT
// =====================================================

getMonthlyBarHeight(
  amount: number
): number {

  if (
    !this.portfolioChartMax ||
    this.portfolioChartMax <= 0
  ) {
    return 0;
  }

  const percentage =
    (amount / this.portfolioChartMax) * 100;

  return Math.max(
    Math.min(percentage, 100),
    amount > 0 ? 4 : 0
  );
}


// =====================================================
// MONTHLY PORTFOLIO INSIGHT
// =====================================================

private buildPortfolioMonthlyInsight(): void {

  if (!this.monthlyPortfolio.length) {

    this.portfolioMonthlyInsight =
      'No portfolio activity available.';

    return;
  }


  const current =
    this.monthlyPortfolio[
      this.monthlyPortfolio.length - 1
    ];


  const previous =
    this.monthlyPortfolio[
      this.monthlyPortfolio.length - 2
    ];


  if (!previous) {

    this.portfolioMonthlyInsight =
      `${current.label}: KES ${
        current.disbursed.toLocaleString()
      } in facilities originated.`;

    return;
  }


  const growth =
    previous.disbursed > 0
      ? (
          (
            current.disbursed -
            previous.disbursed
          ) /
          previous.disbursed
        ) * 100
      : 0;


  if (growth > 0) {

    this.portfolioMonthlyInsight =
      `${current.label} portfolio originations increased by ${
        growth.toFixed(1)
      }% compared with the previous month.`;

  } else if (growth < 0) {

    this.portfolioMonthlyInsight =
      `${current.label} portfolio originations decreased by ${
        Math.abs(growth).toFixed(1)
      }% compared with the previous month.`;

  } else {

    this.portfolioMonthlyInsight =
      `${current.label} portfolio originations remained stable compared with the previous month.`;
  }
}



  // =====================================================
// FACILITY CALCULATIONS
// Facility = Principal + Interest + Penalties
// =====================================================

getPrincipalAmount(loan: any): number {
  return this.toNumber(loan?.amount);
}

getInterestAmount(loan: any): number {
  const principal = this.getPrincipalAmount(loan);

  // totalRepayableAmount should represent:
  // Principal + Contractual Interest
  const totalRepayable = this.toNumber(
    loan?.totalRepayableAmount
  );

  if (totalRepayable > 0 && totalRepayable >= principal) {
    return Math.max(totalRepayable - principal, 0);
  }

  // Fallback if totalRepayableAmount is not available
  const interestRate = this.toNumber(
    loan?.interestRate
  );

  return interestRate > 0
    ? principal * (interestRate / 100)
    : 0;
}

getPenaltyAmount(loan: any): number {
  return Math.max(
    this.toNumber(
      loan?.penaltyAmount ??
      loan?.penalties ??
      loan?.totalPenalties ??
      loan?.penalty ??
      0
    ),
    0
  );
}

getTotalFacilityAmount(loan: any): number {
  const principal = this.getPrincipalAmount(loan);
  const interest = this.getInterestAmount(loan);
  const penalty = this.getPenaltyAmount(loan);

  return Math.max(
    principal + interest + penalty,
    0
  );
}

private toNumber(value: any): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

// =====================================================
// LOAN STATUS
// =====================================================

getLoanStatusLabel(loan: any): string {
  const status = String(
    loan?.status ??
    loan?.loanStatus ??
    ''
  )
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  switch (status) {
    case 'ACTIVE':
      return 'Active';

    case 'DISBURSED':
      return 'Disbursed';

    case 'PARTIALLY_PAID':
    case 'PARTIALLYPAID':
      return 'Partially Paid';

    case 'COMPLETED':
    case 'PAID':
    case 'FULLY_PAID':
      return 'Completed';

    case 'PENDING':
      return 'Pending';

    case 'UNDER_REVIEW':
    case 'UNDERREVIEW':
      return 'Under Review';

    case 'APPROVED':
      return 'Approved';

    case 'REJECTED':
    case 'DECLINED':
      return 'Rejected';

    case 'BLOCKED':
      return 'Blocked';

    case 'CANCELLED':
    case 'CANCELED':
      return 'Cancelled';

    default:
      return status
        ? this.formatLoanStatus(status)
        : 'Unknown';
  }
}


// =====================================================
// STATUS CSS CLASS
// =====================================================

getLoanStatusClass(loan: any): string {
  const status = String(
    loan?.status ??
    loan?.loanStatus ??
    ''
  )
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  switch (status) {

    // 🟢 Healthy / active
    case 'ACTIVE':
    case 'DISBURSED':
      return 'status-active';

    // 🔵 Partial repayment
    case 'PARTIALLY_PAID':
    case 'PARTIALLYPAID':
      return 'status-partial';

    // 🟢 Successfully completed
    case 'COMPLETED':
    case 'PAID':
    case 'FULLY_PAID':
      return 'status-completed';

    // 🟡 Pending / review
    case 'PENDING':
      return 'status-pending';

    case 'UNDER_REVIEW':
    case 'UNDERREVIEW':
      return 'status-review';

    case 'APPROVED':
      return 'status-approved';

    // 🔴 Negative outcomes
    case 'REJECTED':
    case 'DECLINED':
      return 'status-rejected';

    case 'BLOCKED':
      return 'status-blocked';

    case 'CANCELLED':
    case 'CANCELED':
      return 'status-cancelled';

    default:
      return 'status-unknown';
  }
}


// =====================================================
// STATUS ICON
// =====================================================

getLoanStatusIcon(loan: any): string {
  const status = String(
    loan?.status ??
    loan?.loanStatus ??
    ''
  )
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  switch (status) {

    case 'ACTIVE':
    case 'DISBURSED':
      return 'fa-check-circle';

    case 'PARTIALLY_PAID':
    case 'PARTIALLYPAID':
      return 'fa-adjust';

    case 'COMPLETED':
    case 'PAID':
    case 'FULLY_PAID':
      return 'fa-check-double';

    case 'PENDING':
      return 'fa-clock';

    case 'UNDER_REVIEW':
    case 'UNDERREVIEW':
      return 'fa-search';

    case 'APPROVED':
      return 'fa-thumbs-up';

    case 'REJECTED':
    case 'DECLINED':
      return 'fa-times-circle';

    case 'BLOCKED':
      return 'fa-ban';

    case 'CANCELLED':
    case 'CANCELED':
      return 'fa-minus-circle';

    default:
      return 'fa-info-circle';
  }
}


// =====================================================
// DUE DATE
// =====================================================

getLoanDueDate(loan: any): string {
  if (!loan?.dueDate) {
    return 'No due date';
  }

  const date = new Date(loan.dueDate);

  if (isNaN(date.getTime())) {
    return 'No due date';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}


// =====================================================
// STATUS FALLBACK FORMATTER
// =====================================================

private formatLoanStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}


  
    // =====================================================
    // LOAD DASHBOARD
    // =====================================================
    loadDashboard(): void {
  
      this.loadingPortfolio = true;
      this.loadingRepaid = true;
      this.loadingOutstanding = true;
  
      this.loanService.getLoans()
        .pipe(
          takeUntil(this.destroy$),
          catchError(err => {
            console.error('Loan load error', err);
            return of([]);
          }),
          finalize(() => {
            this.loadingPortfolio = false;
            this.loadingRepaid = false;
            this.loadingOutstanding = false;
          })
        )
.subscribe((loans: any[]) => {

  this.loans = loans || [];

  this.calculateStats();

  // LIVE MONTHLY PORTFOLIO
  this.buildMonthlyPortfolio();

  this.buildIntelligentLoans();
});
    }
  
  
   // =====================================================
  // ENTERPRISE AI INTELLIGENCE LOADER (OPTIMIZED)
  // =====================================================
  buildIntelligentLoans(): void {
  
    // =====================================================
    // SHOW TABLE IMMEDIATELY
    // =====================================================
  
    this.loadingAiTable = false;
  
    // =====================================================
    // CREATE TABLE IMMEDIATELY
    // Every row starts with placeholder values.
    // =====================================================
  
    this.intelligentLoans = this.loans.map(loan => ({
  
      ...loan,
  
      riskScore: null,
      behavioralScore: null,
      kycScore: null,
  
      fraudFlag: false,
  
      daysPastDue: 0,
      completedLoans: 0,
      overdueLoans: 0,
  
      parCategory: 'Loading...',
      predictiveRisk: 'Loading...',
  
      recommendation: 'Analyzing...',
      aiReason: 'Credit Intelligence Engine Processing...',
      aiConfidence: null,
  
      eligibleAmount: 0
  
    }));
  
  
    // =====================================================
    // LOAD AI FOR EACH CUSTOMER INDEPENDENTLY
    // =====================================================
  
    this.intelligentLoans.forEach((loan, index) => {
  
      const payload = {
  
        nationalId: loan.nationalId,
  
        requestedAmount: loan.amount || 0,
  
        monthlyIncome: loan.income || 50000,
  
        phoneNumber:
          loan.derivedPhoneNumber ||
          loan.phoneNumber ||
          'UNKNOWN'
  
      };
  
  
      this.loanService
  
        .getCreditIntelligence(
          loan.nationalId,
          payload
        )
  
        .pipe(
  
          takeUntil(this.destroy$),
  
          catchError(() => {
  
            return of({
  
              riskScore: 0,
  
              behavioralScore: 0,
  
              kycScore: 0,
  
              fraudFlag: false,
  
              daysPastDue: 0,
  
              completedLoans: 0,
  
              overdueLoans: 0,
  
              parCategory: 'CURRENT',
  
              predictiveRisk: 'LOW',
  
              recommendation: 'SYSTEM ERROR',
  
              aiReason: 'Backend unavailable',
  
              aiConfidence: 0,
  
              eligibleAmount: 0
  
            });
  
          })
  
        )
  
        .subscribe(ai => {
  
          // =================================================
          // UPDATE ONLY THIS ROW
          // =================================================
  
          this.intelligentLoans[index] = {
  
            ...this.intelligentLoans[index],
  
            riskScore:
              ai.riskScore ?? 0,
  
            behavioralScore:
              ai.behavioralScore ?? 0,
  
            kycScore:
              ai.kycScore ?? 0,
  
            fraudFlag:
              ai.fraudFlag ?? false,
  
            daysPastDue:
              ai.daysPastDue ?? 0,
  
            completedLoans:
              ai.completedLoans ?? 0,
  
            overdueLoans:
              ai.overdueLoans ?? 0,
  
            parCategory:
              ai.parCategory ?? 'CURRENT',
  
            predictiveRisk:
              ai.predictiveRisk ?? 'LOW',
  
            recommendation:
              ai.recommendation ?? 'REVIEW',
  
            aiReason:
              ai.aiReason ?? 'Not evaluated',
  
            aiConfidence:
              ai.aiConfidence ?? 0,
  
            eligibleAmount:
              ai.eligibleAmount ?? 0
  
          };
  
        });
  
    });
  
  }


  // =====================================================
// CREDIT RISK PORTFOLIO FILTER
// =====================================================

setRiskFilter(
  filter: 'ALL' | 'PERFORMING' | 'WATCHLIST' | 'ARREARS' | 'DEFAULT'
): void {

  this.selectedRiskFilter = filter;

}


// =====================================================
// FILTERED CREDIT INTELLIGENCE TABLE
// =====================================================

get filteredIntelligentLoans(): any[] {

  if (!this.intelligentLoans) {
    return [];
  }

  // Show everything
  if (this.selectedRiskFilter === 'ALL') {
    return this.intelligentLoans;
  }

  return this.intelligentLoans.filter(loan => {

    const dpd = this.calculateDaysPastDue(loan);

    switch (this.selectedRiskFilter) {

      case 'PERFORMING':
        return dpd <= 0;

      case 'WATCHLIST':
        return dpd >= 1 && dpd < 30;

      case 'ARREARS':
        return dpd >= 30 && dpd < 90;

      case 'DEFAULT':
        return dpd >= 90;

      default:
        return true;
    }

  });

}
  
  
  trackByLoan(index: number, loan: any): number | string {
    return loan.id || loan.loanId || index;
  }


// =====================================================
// LOAD LIVE ACCOUNT INTELLIGENCE
// =====================================================

loadAccounts(): void {

  this.loadingAccounts = true;

  console.log('========================================');
  console.log('LOADING LIVE ACCOUNTS');
  console.log('========================================');

  this.accountService
    .getAllAccounts()
    .pipe(
      takeUntil(this.destroy$),

      catchError(error => {

        console.error('========================================');
        console.error('ACCOUNT API ERROR');
        console.error('========================================');

        console.error('Status:', error?.status);
        console.error('Status Text:', error?.statusText);
        console.error('URL:', error?.url);
        console.error('Message:', error?.message);
        console.error('Error Body:', error?.error);

        console.error('========================================');

        /*
         * IMPORTANT:
         * Do not hide the error by pretending there are
         * zero accounts.
         */
        this.accounts = [];
        this.totalAccounts = 0;
        this.activeAccounts = 0;
        this.dormantAccounts = 0;
        this.closedAccounts = 0;

        return of(null);

      }),

      finalize(() => {

        this.loadingAccounts = false;

      })
    )

    .subscribe((response: any) => {

      console.log('========================================');
      console.log('RAW ACCOUNT API RESPONSE');
      console.log(response);
      console.log('========================================');

      if (response === null || response === undefined) {

        console.error(
          'No account response received from backend.'
        );

        return;
      }


      /*
       * Most likely response:
       *
       * [
       *   {...},
       *   {...}
       * ]
       */

      if (Array.isArray(response)) {

        this.accounts = response;

      }

      /*
       * In case backend returns:
       *
       * {
       *   content: [...]
       * }
       */

      else if (Array.isArray(response.content)) {

        this.accounts = response.content;

      }

      /*
       * In case backend returns:
       *
       * {
       *   accounts: [...]
       * }
       */

      else if (Array.isArray(response.accounts)) {

        this.accounts = response.accounts;

      }

      else {

        console.error(
          'Unexpected account API response structure:',
          response
        );

        this.accounts = [];

      }


      console.log(
        'NORMALIZED ACCOUNTS:',
        this.accounts
      );

      console.log(
        'ACCOUNT COUNT:',
        this.accounts.length
      );


      this.calculateAccountStats();

    });
}


normalizeAccountStatus(status: any): string {

  if (
    status === null ||
    status === undefined
  ) {
    return '';
  }

  return String(status)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

// =====================================================
// GET ACCOUNT STATUS
// =====================================================

getAccountStatus(account: any): string {

  const status =
    account?.status ??
    account?.accountStatus ??
    account?.accountState ??
    account?.state ??
    account?.account_status ??
    account?.account_state ??
    '';

  return this.normalizeAccountStatus(status);
}


// =====================================================
// CALCULATE LIVE ACCOUNT STATISTICS
// =====================================================

calculateAccountStats(): void {

  // ---------------------------------------------------
  // TOTAL
  // ---------------------------------------------------

  this.totalAccounts = this.accounts?.length || 0;


  // ---------------------------------------------------
  // ACTIVE
  // ---------------------------------------------------

  this.activeAccounts =
    this.accounts.filter(account =>
      this.getAccountStatus(account) === 'ACTIVE'
    ).length;


  // ---------------------------------------------------
  // DORMANT
  // ---------------------------------------------------

  this.dormantAccounts =
    this.accounts.filter(account =>
      this.getAccountStatus(account) === 'DORMANT'
    ).length;


  // ---------------------------------------------------
  // CLOSED
  // ---------------------------------------------------

  this.closedAccounts =
    this.accounts.filter(account =>
      this.getAccountStatus(account) === 'CLOSED'
    ).length;


  // ---------------------------------------------------
  // PERCENTAGES
  // ---------------------------------------------------

  this.activeAccountPercentage =
    this.totalAccounts > 0
      ? (this.activeAccounts / this.totalAccounts) * 100
      : 0;


  this.dormantAccountPercentage =
    this.totalAccounts > 0
      ? (this.dormantAccounts / this.totalAccounts) * 100
      : 0;


  this.closedAccountPercentage =
    this.totalAccounts > 0
      ? (this.closedAccounts / this.totalAccounts) * 100
      : 0;


  // ---------------------------------------------------
  // LAST UPDATED
  // ---------------------------------------------------

  this.accountsLastUpdated =
    new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });


  // ---------------------------------------------------
  // DEBUG
  // ---------------------------------------------------

  console.log('ACCOUNT STATISTICS');
  console.log('------------------');
  console.log('Total:', this.totalAccounts);
  console.log('Active:', this.activeAccounts);
  console.log('Dormant:', this.dormantAccounts);
  console.log('Closed:', this.closedAccounts);
}


  
calculateStats(): void {

  // ===================================================
  // TOTAL CREDIT PORTFOLIO
  // Principal + Interest + Penalties
  // ===================================================

  this.totalLoansAmount =
    this.loans.reduce(
      (sum, loan) =>
        sum + this.getTotalFacilityAmount(loan),
      0
    );


  // ===================================================
  // TOTAL REPAYMENTS
  // ===================================================

  this.repaymentStats.totalRepaid =
    this.loans.reduce(
      (sum, loan) =>
        sum +
        this.toNumber(
          loan?.amountPaid ??
          loan?.paidAmount ??
          loan?.totalPaid ??
          0
        ),
      0
    );


  // ===================================================
  // OUTSTANDING
  // ===================================================

  this.repaymentStats.outstanding =
    Math.max(
      this.totalLoansAmount -
      this.repaymentStats.totalRepaid,
      0
    );


  // ===================================================
  // COLLECTION EFFICIENCY
  // ===================================================

  this.collectionEfficiency =
    this.totalLoansAmount > 0
      ? Math.round(
          (
            this.repaymentStats.totalRepaid /
            this.totalLoansAmount
          ) * 100
        )
      : 0;


  this.calculatePAR();

  this.calculatePortfolioHealth();

  this.buildMonthlyPortfolio();
}


// =====================================================
// LIVE CREDIT PORTFOLIO HEALTH
// =====================================================

calculatePortfolioHealth(): void {

  // ---------------------------------------------------
  // RESET
  // ---------------------------------------------------

  this.portfolioHealthStats = {
    performing: 0,
    watchlist: 0,
    arrears: 0,
    default: 0
  };

  this.portfolioHealthAmounts = {
    performing: 0,
    watchlist: 0,
    arrears: 0,
    default: 0
  };

  this.portfolioHealthPercentages = {
    performing: 0,
    watchlist: 0,
    arrears: 0,
    default: 0
  };

  this.portfolioHealthTotal = 0;


  // ---------------------------------------------------
  // NO LOANS
  // ---------------------------------------------------

  if (!this.loans || this.loans.length === 0) {
    return;
  }


  // ---------------------------------------------------
  // CLASSIFY ACTIVE OUTSTANDING LOANS
  // ---------------------------------------------------

  this.loans.forEach(loan => {

    const originalAmount = Number(loan.amount || 0);

    const amountPaid = Number(
      loan.amountPaid ??
      loan.paidAmount ??
      loan.totalPaid ??
      0
    );

    // Never allow negative outstanding exposure
    const outstandingAmount = Math.max(
      originalAmount - amountPaid,
      0
    );


    // Fully repaid loans should not form part of
    // the current credit portfolio health.
    if (outstandingAmount <= 0) {
      return;
    }


    const dpd = this.calculateDaysPastDue(loan);


    // Add only current outstanding exposure
    this.portfolioHealthTotal += outstandingAmount;


    // -------------------------------------------------
    // PERFORMING
    // 0 DAYS PAST DUE
    // -------------------------------------------------

    if (dpd <= 0) {

      this.portfolioHealthStats.performing++;

      this.portfolioHealthAmounts.performing +=
        outstandingAmount;

    }


    // -------------------------------------------------
    // WATCHLIST
    // 1 - 29 DAYS PAST DUE
    // -------------------------------------------------

    else if (dpd < 30) {

      this.portfolioHealthStats.watchlist++;

      this.portfolioHealthAmounts.watchlist +=
        outstandingAmount;

    }


    // -------------------------------------------------
    // ARREARS
    // 30 - 89 DAYS PAST DUE
    // -------------------------------------------------

    else if (dpd < 90) {

      this.portfolioHealthStats.arrears++;

      this.portfolioHealthAmounts.arrears +=
        outstandingAmount;

    }


    // -------------------------------------------------
    // DEFAULT
    // 90+ DAYS PAST DUE
    // -------------------------------------------------

    else {

      this.portfolioHealthStats.default++;

      this.portfolioHealthAmounts.default +=
        outstandingAmount;

    }

  });


  // ---------------------------------------------------
  // CALCULATE PORTFOLIO HEALTH PERCENTAGES
  // ---------------------------------------------------

  if (this.portfolioHealthTotal > 0) {

    this.portfolioHealthPercentages.performing =
      (this.portfolioHealthAmounts.performing /
        this.portfolioHealthTotal) * 100;

    this.portfolioHealthPercentages.watchlist =
      (this.portfolioHealthAmounts.watchlist /
        this.portfolioHealthTotal) * 100;

    this.portfolioHealthPercentages.arrears =
      (this.portfolioHealthAmounts.arrears /
        this.portfolioHealthTotal) * 100;

    this.portfolioHealthPercentages.default =
      (this.portfolioHealthAmounts.default /
        this.portfolioHealthTotal) * 100;

  }

}
  
    // =====================================================
    // PAR METRICS
    // =====================================================
    calculatePAR(): void {
  
      let par30 = 0;
      let npl = 0;
      this.overdueLoans = 0;
  
      this.loans.forEach(l => {
  
        const amount = l.amount || 0;
        const dpd = this.calculateDaysPastDue(l);
  
        if (dpd > 0) this.overdueLoans++;
        if (dpd >= 30) par30 += amount;
        if (dpd >= 90) npl += amount;
      });
  
      this.portfolioMetrics.par30 =
        this.totalLoansAmount ? (par30 / this.totalLoansAmount) * 100 : 0;
  
      this.portfolioMetrics.npl =
        this.totalLoansAmount ? (npl / this.totalLoansAmount) * 100 : 0;
    }
  
    // =====================================================
    // DPD
    // =====================================================
    calculateDaysPastDue(loan: any): number {
  
      if (!loan.dueDate) return 0;
  
      const diff =
        new Date().getTime() - new Date(loan.dueDate).getTime();
  
      return Math.max(0, Math.floor(diff / (1000 * 3600 * 24)));
    }
  
    // =====================================================
    // KYC SCORE (FIX FOR MISSING BACKEND FIELD)
    // =====================================================
    calculateKycScore(loan: any): number {
      return (loan.nationalId && loan.phoneNumber && loan.email)
        ? 95
        : 60;
    }
  
    // =====================================================
    // MPESA BALANCE
    // =====================================================
    loadMpesaBalance(): void {
  
      this.loadingBalance = true;
  
      this.mpesaService.getBalance()
        .pipe(
          takeUntil(this.destroy$),
          catchError(() => of(null)),
          finalize(() => this.loadingBalance = false)
        )
        .subscribe(res => {
          this.balance = this.parseBalance(res);
        });
    }
  
  parseBalance(res: any): number {
  
    if (!res) return 0;
  
    const match =
      JSON.stringify(res).match(/KES\s?([\d,]+\.\d{2})/);
  
    return match
      ? parseFloat(match[1].replace(/,/g, ''))
      : 0;
  }
  
  // =====================================================
  // NAVIGATION
  // =====================================================
  openCustomerDetails(id: number): void {
  
    this.router.navigate(['/app/customer-details'], {
      queryParams: { loanId: id }
    });
  
  }

}
