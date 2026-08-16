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
  
    overdueLoans = 0;
    collectionEfficiency = 0;
  
    portfolioHealth = 96;
  
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

  portfolioGrowth = [
  { label: 'Mar', percentage: 42 },
  { label: 'Apr', percentage: 50 },
  { label: 'May', percentage: 58 },
  { label: 'Jun', percentage: 67 },
  { label: 'Jul', percentage: 78 },
  { label: 'Aug', percentage: 92 }
];
  
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


  
    // =====================================================
    // STATS
    // =====================================================
    calculateStats(): void {
  
      this.totalLoansAmount =
        this.loans.reduce((s, l) => s + (l.amount || 0), 0);
  
      this.repaymentStats.totalRepaid =
        this.loans.reduce((s, l) => s + (l.amountPaid || 0), 0);
  
      this.repaymentStats.outstanding =
        this.totalLoansAmount - this.repaymentStats.totalRepaid;
  
      this.collectionEfficiency =
        this.totalLoansAmount > 0
          ? Math.round((this.repaymentStats.totalRepaid / this.totalLoansAmount) * 100)
          : 0;
  
      this.calculatePAR();
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
