import { Component, OnInit, OnDestroy } from '@angular/core';
import { AccountService } from '../services/account.service';
import { AuthService } from '../services/auth-service.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LoanService } from '../services/loan.service';
import { interval, Subscription } from 'rxjs';
import { Loan } from '../../models/loan.model';

interface Transaction {
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  date: string | Date;
  dueDate?: string | Date;
  debit?: number;
  credit?: number;
  balanceAfter?: number;
}

interface LoanDetails {
  id?: number;
  amount?: number;
  totalRepayableAmount?: number;
  dueAmount?: number;
  dueDate?: string | Date;
  userImageUrl?: string;
  status?: string;
}

interface UserDetails {
  name: string;
  email: string;
  accountNumber: string;
  profileImage: string;
}

@Component({
  selector: 'app-applicant-dashboard',
  templateUrl: './applicant-dashboard.component.html',
  styleUrls: ['./applicant-dashboard.component.css'],
})
export class ApplicantDashboardComponent implements OnInit, OnDestroy {
  balance = 0;
  netBalance = 0;
  paymentType: 'full' | 'partial' | '' = '';
  payLoanAmount = 0;
  isLoading = true;
  showNotifications = false;
  sidebarOpen = false;
  greeting = 'Evening';
  depositLoading = false;
  depositSuccess = false;
  phoneNumber = '';

  userAccounts: any[] = [];
  selectedAccount = '';

  durationOptions: { [key: number]: string } = {
    1: '1 week',
    2: '2 weeks',
    4: '1 month',
    8: '2 months',
    12: '3 months',
  };

  loan: LoanDetails = { totalRepayableAmount: 0, dueDate: '', userImageUrl: '' };
  transactions: Transaction[] = [];
  filterTerm = '';
  currentPage = 1;
  itemsPerPage = 4;
  Math = Math;

  user: UserDetails = { name: '', email: '', accountNumber: '', profileImage: 'assets/default-user.png' };
  notifications: { message: string; date: Date }[] = [];
  preferences = { darkMode: false, compactMode: false, currency: 'KES' };

  transferForm: {
    to: string;
    amount: number;
    ref: string;
    type: string;
  } = {
    to: '',
    amount: 0,
    ref: '',
    type: '',
  };

  depositAmount = 0;
  withdrawAmount = 0;
  borrowAmount = 0;
  duration = 12;
  qualifiedAmount = 0;
  showDashboardContent = true;
  loanMessage = '';

  private loanUpdateSubscription?: Subscription;
  private suppressPollingUntil = 0;

  constructor(
    private accountService: AccountService,
    private authService: AuthService,
    private http: HttpClient,
    private loanService: LoanService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      this.showDashboardContent = event.urlAfterRedirects === '/applicant-dashboard';
    });

    this.initializeDashboard();
    this.startLoanAutoUpdate();
    this.loadUserAccounts();
  }

  ngOnDestroy(): void {
    this.loanUpdateSubscription?.unsubscribe();
  }

  /** ============================
   *  AUTO-LOAN POLLING
   * ============================ */
  private startLoanAutoUpdate(): void {
    const nationalId = this.authService.getNationalId();
    if (!nationalId) return;

    this.loanUpdateSubscription = interval(1000).subscribe(() => {
      if (Date.now() < this.suppressPollingUntil) return;
      this.fetchLoanDetails(nationalId);
    });
  }

  /** ============================
   *  INITIALIZE DASHBOARD DATA
   * ============================ */
  private initializeDashboard(): void {
    this.setGreeting();
    this.loadPreferences();
    this.notifications = [
      { message: 'Welcome back!', date: new Date() },
      { message: 'Your statement is ready.', date: new Date() },
    ];

    const nationalId = this.authService.getNationalId();
    if (!nationalId) {
      console.warn('⚠️ No national ID found.');
      this.isLoading = false;
      return;
    }

    this.accountService.getAccountDetailsByNationalId(nationalId).subscribe({
      next: (account) => {
        this.user = {
          name: account.fullName,
          email: account.email,
          accountNumber: account.accountNumber,
          profileImage: account.imageUrl ? `http://localhost:8080/api/accounts/image/${account.nationalId}?t=${Date.now()}` : 'assets/default-user.png',
        };
        this.balance = account.balance || 0;

        this.fetchLoanDetails(nationalId, () => {
          this.calculateNetBalance();
          this.fetchStatements(nationalId);
          this.refreshBalancesInstantly();
        });
      },
      error: (err) => {
        console.error('❌ Account fetch failed:', err);
        this.isLoading = false;
      },
    });
  }

  private updateDisplayedBalance(): void {
    const borrowed = this.loan.amount || 0;
    this.netBalance = (this.netBalance || 0) + borrowed;
  }

  private fetchAccount(nationalId: string): void {
    this.accountService.getAccountDetailsByNationalId(nationalId).subscribe({
      next: (data) => {
        this.balance = data.balance || 0;
        this.user = {
          name: data.fullName,
          email: data.email,
          accountNumber: data.accountNumber,
          profileImage: data.imageUrl ? `http://localhost:8080/api/accounts/image/${data.nationalId}?t=${Date.now()}` : 'assets/default-user.png',
        };
        this.calculateNetBalance();
      },
      error: (err) => console.error('❌ Account fetch failed:', err),
    });
  }

   loadUserAccounts(): void {
  const nationalId = this.authService.getNationalId();
  if (!nationalId) {
    console.warn('⚠️ No national ID found. Cannot load accounts.');
    return;
  }

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

this.http.get<any>(`http://localhost:8080/api/accounts/by-id/${nationalId}`, { headers })
  .subscribe({
    next: (response) => {
      // If API returns a single object instead of array, wrap it in array
      this.userAccounts = Array.isArray(response) ? response : [response];
      if (this.userAccounts.length > 0) {
        this.selectedAccount = this.userAccounts[0].accountNumber;
      }
    },

  });

}

  private updateBalances(): void {
    if (!this.loan || !this.loan.dueDate) {
      this.netBalance = this.balance;
      return;
    }

    const today = new Date();
    const dueDate = new Date(this.loan.dueDate as string);

    const remainingLoan = dueDate <= today ? (this.loan.dueAmount || this.loan.totalRepayableAmount || 0) : 0;
    this.netBalance = this.balance - remainingLoan;
  }

  private fetchLoanDetails(nationalId: string, callback?: () => void): void {
    this.loanService.assessEligibilityAndLimits(nationalId, this.balance).subscribe({
      next: (eligibility) => {
        this.qualifiedAmount = eligibility.eligibleAmount || 0;

        this.loanService.getLoanDetailsByNationalId(nationalId).subscribe({
          next: (loans) => {
            const activeLoan = loans.find((l: any) => l.status && l.status.toLowerCase() !== 'repaid') || null;

            this.loan = activeLoan
              ? {
                  id: activeLoan.id,
                  totalRepayableAmount: activeLoan.totalRepayableAmount ?? 0,
                  dueAmount: activeLoan.dueAmount ?? 0,
                  dueDate: activeLoan.dueDate
                    ? typeof activeLoan.dueDate === 'string'
                      ? activeLoan.dueDate
                      : (activeLoan.dueDate as Date).toISOString().split('T')[0]
                    : '',
                  status: activeLoan.status ?? '',
                  userImageUrl: activeLoan.userImageUrl ?? '',
                }
              : { totalRepayableAmount: 0, dueAmount: 0, dueDate: '', status: '', userImageUrl: '' };

            this.updateBalances();
            callback?.();
          },
          error: (err) => {
            console.error('❌ Loan fetch failed', err);
            callback?.();
          },
        });
      },
      error: (err) => {
        console.error('❌ Eligibility fetch failed', err);
        callback?.();
      },
    });
  }

  private fetchStatements(nationalId: string): void {
    this.accountService.getStatements(nationalId).subscribe({
      next: (txns) => {
        const seen = new Set<string>();
        this.transactions = (txns || [])
          .filter((tx: any) => {
            const key = `${tx.date}-${tx.description}-${tx.debit}-${tx.credit}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((tx: any) => ({
            description: tx.description,
            amount: tx.debit > 0 ? tx.debit : tx.credit,
            type: tx.debit > 0 ? 'debit' : 'credit',
            date: tx.date,
            debit: tx.debit,
            credit: tx.credit,
            balanceAfter: tx.balanceAfter ?? 0,
          }));
        this.calculateRunningBalance();
      },
      error: (err) => console.error('❌ Failed to fetch statements', err),
      complete: () => (this.isLoading = false),
    });
  }

  /** ============================
   *  ACTIONS
   * ============================ */
  openPayLoan(): void {
    this.openModal('payLoanModal');
  }

  confirmPayLoan(): void {
    if (!this.loan.id) {
      this.showToast('No active loan found.', 'warning');
      return;
    }

    if (!this.selectedAccount || this.selectedAccount.trim() === '') {
      this.showToast('Please select an account before proceeding with payment.', 'danger');
      return;
    }

    if (!this.paymentType) {
      this.showToast('Please select a payment type.', 'danger');
      return;
    }

    const amountToPay = this.paymentType === 'full' ? this.loan.dueAmount || this.loan.totalRepayableAmount : this.payLoanAmount;

    if (this.paymentType === 'partial' && (!amountToPay || amountToPay <= 0)) {
      this.showToast('Please enter a valid partial amount.', 'danger');
      return;
    }

    const selected = this.userAccounts.find((a) => a.accountNumber === this.selectedAccount);
    if (!selected) {
      this.showToast('Selected account not found.', 'danger');
      return;
    }

    if (selected.balance < (amountToPay ?? 0)) {
      this.showToast('Insufficient balance in the selected account.', 'danger');
      return;
    }

    const nationalId = this.authService.getNationalId();
    const phone = localStorage.getItem('phoneNumber') || '0700000000';

    const dto = {
      loanId: this.loan.id,
      amountPaid: amountToPay,
      repaymentDate: new Date().toISOString().split('T')[0],
      idNo: nationalId,
      phoneNumber: phone,
      location: 'Branch',
      accountNumber: this.selectedAccount,
    };

    this.http.post('http://localhost:8080/api/repayments', dto).subscribe({
      next: (res: any) => {
        this.showToast(res?.message || '✅ Payment successful.', 'success');

        const finalAmount =
          this.paymentType === 'full' ? this.loan.dueAmount || this.loan.totalRepayableAmount || 0 : this.payLoanAmount || 0;

        if (selected.balance < (finalAmount ?? 0)) {
          this.showToast('Insufficient balance in the selected account.', 'danger');
          return;
        }

        selected.balance -= finalAmount ?? 0;

        this.calculateRunningBalance();
        this.initializeDashboard();
        this.closeModal('payLoanModal');
      },
      error: (err) => {
        console.error('❌ Repayment failed:', err);
        const errorMsg = err?.error?.message || err?.message || 'Payment failed. Please try again.';
        this.showToast(errorMsg, 'danger');
      },
    });
  }

  private refreshBalancesInstantly(): void {
    const nationalId = this.authService.getNationalId();
    if (!nationalId) return;

    this.accountService.getAccountDetailsByNationalId(nationalId).subscribe({
      next: (account) => {
        this.balance = account.balance || 0;
        this.netBalance = account.netBalance ?? this.balance;
        this.calculateNetBalance();

        this.loanService.getLoanDetailsByNationalId(nationalId).subscribe({
          next: (loans) => {
            const activeLoan = loans.find((l: any) => l.status && l.status.toLowerCase() !== 'repaid');
            this.loan = activeLoan ? { ...activeLoan } : { totalRepayableAmount: 0, dueAmount: 0, dueDate: '' };
            this.calculateNetBalance();
          },
          error: (err) => console.error(err),
        });
      },
      error: (err) => console.error(err),
    });
  }

  /** ============================
   *  BORROW / LOAN LOGIC
   * ============================ */
  openBorrow(): void {
    const nationalId = this.authService.getNationalId();
    if (!nationalId) return;

    this.loanService.getLoanDetailsByNationalId(nationalId).subscribe({
      next: (loans) => {
        const activeLoan = loans.find((loan: any) => loan.status && loan.status.toLowerCase() !== 'repaid');

        if (activeLoan) {
          this.showToast(`❌ You already have an active loan (KES ${activeLoan.totalRepayableAmount}). Please clear it before borrowing another.`, 'warning');
          return;
        }

        this.loanService.assessEligibilityAndLimits(nationalId, this.balance).subscribe({
          next: (res: any) => {
            this.qualifiedAmount = res.eligibleAmount ?? 0;

            if (this.qualifiedAmount <= 0) {
              this.loanMessage = 'You are not eligible for a new loan at this time.';
              return;
            }

            this.borrowAmount = this.qualifiedAmount;
            this.openModal('borrowModal');
          },
          error: (err) => {
            console.error('❌ Loan eligibility check failed:', err);
            this.loanMessage = 'Failed to fetch loan eligibility. Please try again later.';
          },
        });
      },
      error: (err) => {
        console.error('❌ Failed to check active loan:', err);
        this.showToast('Could not check loan status. Try again.', 'danger');
      },
    });
  }

  confirmBorrow(): void {
    if (!this.borrowAmount || this.borrowAmount <= 0) return;

    if (this.borrowAmount > this.qualifiedAmount) {
      this.showToast(`You can only borrow up to KES ${this.qualifiedAmount}`, 'warning');
      return;
    }

    const nationalId = this.authService.getNationalId();
    if (!nationalId) return;

    this.loanService.getLoanDetailsByNationalId(nationalId).subscribe({
      next: (loans) => {
        const activeLoan = loans.find((loan: any) => loan.status && loan.status.toLowerCase() !== 'repaid');

        if (activeLoan) {
          this.showToast('❌ You already have an active loan. Clear it before applying for another.', 'danger');
          return;
        }

        const phoneNumber = localStorage.getItem('phoneNumber') || '0700000000';
        const applicantName = this.authService.getUsername() || 'Unknown';

        const payload: Loan = {
          id: 0,
          applicantName,
          idNo: Number(nationalId),
          phoneNumber: Number(phoneNumber),
          location: 'Branch',
          amount: this.borrowAmount,
          duration: this.durationOptions[this.duration] || '1 month',
          applicationDate: new Date().toISOString().split('T')[0],
          income: 0,
          expenses: 0,
          status: 'pending',

           // ADD THESE 👇 (required by backend)
  email: localStorage.getItem('email') || '',
  interestRate: 0,
  penaltyRate: 0,
  totalRepayableAmount: this.borrowAmount,   // or 0
  dueAmount: this.borrowAmount,  
        };

        this.isLoading = true;
        this.loanService.addLoan(payload).subscribe({
          next: (res: any) => {
            this.showToast(res?.message || '✅ Loan application successful', 'success');

            this.suppressPollingUntil = Date.now() + 500;
            this.initializeDashboard();
            this.closeModal('borrowModal');
            this.refreshBalancesInstantly();
            this.isLoading = false;
          },
          error: (err) => {
            console.error('❌ Borrow failed:', err);
            this.showToast('Loan application failed. Try again.', 'danger');
            this.isLoading = false;
          },
        });
      },
      error: (err) => {
        console.error('❌ Active loan check failed before applying:', err);
        this.showToast('Could not verify your loan status. Try again later.', 'danger');
      },
    });
  }

  /** ============================
   *  PDF EXPORT
   * ============================ */
  exportPDF(): void {
    const doc = new jsPDF();

    const logoUrl = 'assets/creditbank.png';
    const primaryColor: [number, number, number] = [200, 16, 46];
    const textColor: [number, number, number] = [60, 60, 60];

    const userName = this.user?.name || 'Customer';
    const userEmail = this.user?.email || 'N/A';
    const accountNumber = this.user?.accountNumber || 'N/A';
    const generatedOn = new Date().toLocaleString();

    this.toDataUrl(logoUrl, (base64Img: string) => {
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 30, 'F');

      if (base64Img) {
        doc.addImage(base64Img, 'PNG', 12, 5, 25, 20);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('CreditBank Statement', 80, 15);

      doc.setTextColor(...textColor);
      doc.setFontSize(11);
      let yPos = 40;
      doc.text(`Name: ${userName}`, 14, yPos);
      doc.text(`Email: ${userEmail}`, 14, yPos + 6);
      doc.text(`Account Number: ${accountNumber}`, 14, yPos + 12);
      doc.text(`Generated On: ${generatedOn}`, 14, yPos + 18);

      if (this.transactions?.length) {
        autoTable(doc, {
          startY: yPos + 28,
          head: [['Date', 'Description', 'Debit (KES)', 'Credit (KES)', 'Balance (KES)']],
          body: this.transactions.map((txn) => [
            new Date(txn.date).toLocaleDateString(),
            txn.description || '',
            txn.debit ? txn.debit.toLocaleString() : '',
            txn.credit ? txn.credit.toLocaleString() : '',
            txn.balanceAfter?.toLocaleString() || '',
          ]),
          theme: 'striped',
          headStyles: { fillColor: primaryColor },
          styles: { fontSize: 9 },
        });
      } else {
        doc.text('No transactions available.', 14, yPos + 30);
      }

      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text('Thank you for banking with CreditBank.', 14, pageHeight - 10);

      const fileName = `Statement_${accountNumber}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    });
  }

  private toDataUrl(url: string, callback: (base64Img: string) => void): void {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      callback(dataURL);
    };

    img.onerror = () => {
      console.warn(`⚠️ Could not load image: ${url}`);
      callback('');
    };
  }

  /** ============================
   *  UI HELPERS
   * ============================ */
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  logout(): void {
    this.authService.logout?.();
    this.router.navigate(['/login']);
  }

  openSettings(): void {
    this.openOffcanvas('settingsCanvas');
  }

  applyPreferences(): void {
    const root = document.querySelector('.dashboard-shell') as HTMLElement;
    if (!root) return;
    root.classList.toggle('compact', this.preferences.compactMode);
    root.classList.toggle('dark', this.preferences.darkMode);
  }

  savePreferences(): void {
    localStorage.setItem('dashboardPreferences', JSON.stringify(this.preferences));
    this.applyPreferences();
  }

  loadPreferences(): void {
    const saved = localStorage.getItem('dashboardPreferences');
    if (saved) {
      this.preferences = JSON.parse(saved);
      this.applyPreferences();
    }
  }

  openProfile(): void {
    this.openModal('profileModal');
  }

  saveProfile(): void {
    this.closeModal('profileModal');
    this.showToast('Profile saved locally (no backend call).', 'info');
  }

  private openModal(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const modal = new (window as any).bootstrap.Modal(el);
    modal.show();
  }

  private closeModal(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const modal = (window as any).bootstrap.Modal.getInstance(el);
    modal?.hide();
  }

  private openOffcanvas(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const canvas = new (window as any).bootstrap.Offcanvas(el);
    canvas.show();
  }

  private calculateRunningBalance(): void {
    let runningLoanBalance = this.loan.dueAmount ?? this.loan.totalRepayableAmount ?? 0;
    this.transactions = this.transactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((txn) => {
        if (txn.debit) {
          runningLoanBalance -= txn.debit;
        } else if (txn.credit) {
          runningLoanBalance += txn.credit;
        }
        return {
          ...txn,
          balanceAfter: runningLoanBalance,
        };
      });
  }

  private calculateNetBalance(): void {
    const currentBalance = this.balance || 0;
    const borrowedAmount =
      this.loan && this.loan.status && this.loan.status.toLowerCase() !== 'repaid' && this.loan.status.toLowerCase() !== 'cleared'
        ? this.loan.totalRepayableAmount || 0
        : 0;
    this.netBalance = currentBalance + borrowedAmount;
  }

  addNotification(msg: string): void {
    const newNotif = { message: msg, date: new Date() };
    this.notifications.unshift(newNotif);
    setTimeout(() => {
      this.notifications = this.notifications.filter((n) => n !== newNotif);
    }, 5000);
  }

  private showToast(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0 position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = '2000';
    toast.role = 'alert';
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    document.body.appendChild(toast);

    const bsToast = new (window as any).bootstrap.Toast(toast, { delay: 5000 });
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
  }

  setGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Morning';
    else if (hour < 18) this.greeting = 'Afternoon';
    else this.greeting = 'Evening';
  }

  openDeposit(): void {
    this.openModal('depositModal');
  }

  openWithdraw(): void {
    this.openModal('withdrawModal');
  }

  openTransfer(): void {
    this.openModal('transferModal');
  }

  clearFilter(): void {
    this.filterTerm = '';
  }

  filteredTransactions(): Transaction[] {
    const filtered = this.transactions.filter((txn) => txn.description.toLowerCase().includes(this.filterTerm.toLowerCase()));
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.transactions.filter((txn) => txn.description.toLowerCase().includes(this.filterTerm.toLowerCase())).length / this.itemsPerPage));
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  /** ============================
   *  TRANSFERS & M-PESA
   * ============================ */
  transferFunds(): void {
    if (!this.transferForm.type) {
      this.showToast('Please select transfer type.', 'danger');
      return;
    }

    if (!this.transferForm.to || this.transferForm.to.trim() === '') {
      this.showToast('Please enter destination details.', 'danger');
      return;
    }

    if (!this.transferForm.amount || this.transferForm.amount <= 0) {
      this.showToast('Enter a valid amount.', 'danger');
      return;
    }

    const baseDto = {
      fromAccount: this.selectedAccount,
      toAccount: this.transferForm.to.trim(),
      amount: this.transferForm.amount,
      type: this.transferForm.type,
      reference: this.transferForm.ref,
    };

    this.showToast('⏳ Processing transfer...', 'info');

    if (this.transferForm.type === 'mpesa') {
      const dto = {
        phoneNumber: this.transferForm.to.trim(),
        amount: this.transferForm.amount,
      };

      this.showToast('📲 Sending STK Push request to your phone...', 'info');

      this.http.post('http://localhost:8080/api/mpesa/stkpush', dto).subscribe({
        next: (res: any) => {
          const message = res?.message || '✅ STK Push initiated successfully.';
          this.showToast(message, 'success');
          this.addNotification(message);

          const checkoutId = res?.checkoutRequestId;
          if (checkoutId) {
            this.addNotification(`Awaiting M-Pesa confirmation for ${dto.amount} KES...`);
            this.checkStkStatus(checkoutId);
          }

          this.closeModal('transferModal');
        },
        error: (err) => {
          console.error('❌ STK Push failed:', err);
          const errorMsg = err.error?.message || 'STK Push failed. Please try again.';
          this.showToast(errorMsg, 'danger');
          this.addNotification(errorMsg);
        },
      });

      return;
    }

    let endpoint = 'http://localhost:8080/api/mpesa/transfer';
    if (this.transferForm.type === 'otherbank') endpoint = 'http://localhost:8080/api/mpesa/interbank';

    this.http.post(endpoint, baseDto).subscribe({
      next: (res: any) => {
        const msg = res?.message || '✅ Transfer successful.';
        this.showToast(msg, 'success');
        this.addNotification(msg);
        this.closeModal('transferModal');
        this.initializeDashboard();
      },
      error: (err) => {
        console.error('❌ Transfer failed:', err);
        const errorMsg = err.error?.message || 'Transfer failed. Please try again.';
        this.showToast(errorMsg, 'danger');
      },
    });
  }

  // Single unified STK status polling method
  private checkStkStatus(checkoutRequestId: string): void {
    const endpoint = `http://localhost:8080/api/mpesa/status/${checkoutRequestId}`;
    const intervalId = setInterval(() => {
      this.http.get<any>(endpoint).subscribe({
        next: (res) => {
          // Accept either resultCode or status-based responses
          const code = res?.resultCode ?? null;
          const status = (res?.status || '').toString().toLowerCase();

          if (code === 0 || status === 'success' || status === 'completed') {
            clearInterval(intervalId);
            this.showToast('✅ Payment confirmed successfully!', 'success');
            const amt = res?.amount ?? res?.paidAmount ?? '';
            if (amt) this.addNotification(`Payment of KES ${amt} confirmed.`);
            else this.addNotification('Payment confirmed successfully!');
            this.refreshBalancesInstantly();
            this.initializeDashboard();
          } else if (code === 1032 || status === 'cancelled' || status === 'failed') {
            clearInterval(intervalId);
            this.showToast('❌ Payment cancelled or failed.', 'warning');
            this.addNotification('Payment cancelled or failed.');
          } else {
            // still pending - do nothing
          }
        },
        error: (err) => {
          console.error('⚠️ Error checking STK status:', err);
        },
      });
    }, 4000);
  }

  confirmDeposit(): void {
    if (!this.depositAmount || this.depositAmount <= 0) {
      this.showToast('Enter a valid deposit amount.', 'danger');
      return;
    }

    if (!/^07\d{8}$/.test(this.phoneNumber)) {
      this.showToast('Enter a valid M-Pesa number.', 'danger');
      return;
    }

    const dto = {
      phoneNumber: this.phoneNumber,
      amount: this.depositAmount,
      accountNumber: this.user.accountNumber,
    };

    this.depositLoading = true;
    this.depositSuccess = false;

    this.http.post('http://localhost:8080/api/mpesa/stkpush', dto).subscribe({
      next: (res: any) => {
        this.showToast('📲 STK Push sent. Enter your M-Pesa PIN to complete the transaction.', 'info');
        this.refreshBalancesInstantly();
        this.closeModal('depositModal');

        const checkoutId = res?.checkoutRequestId;
        if (checkoutId) {
          this.checkStkStatus(checkoutId);
        }

        this.depositLoading = false;
      },
      error: (err) => {
        this.depositLoading = false;
        this.showToast('STK Push failed. Try again.', 'danger');
        console.error(err);
      },
    });
  }

  confirmWithdraw(): void {
    this.showToast('Withdraw flow not implemented yet.', 'info');
    this.closeModal('withdrawModal');
  }

  confirmTransfer(): void {
    this.showToast('Transfer flow not implemented yet.', 'info');
    this.closeModal('transferModal');
  }
}
