import { Component, OnInit, OnDestroy } from '@angular/core';
import { AccountService } from '../services/account.service';
import { AuthService } from '../services/auth-service.service';
import { HttpClient } from '@angular/common/http';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Router } from '@angular/router';
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

  // ================= STATE =================
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

  loan: LoanDetails = { totalRepayableAmount: 0, dueAmount: 0, dueDate: '', userImageUrl: '' };
  transactions: Transaction[] = [];

  filterTerm = '';
  currentPage = 1;
  itemsPerPage = 4;

  user: UserDetails = {
    name: '',
    email: '',
    accountNumber: '',
    profileImage: 'assets/default-user.png'
  };

  notifications: { message: string; date: Date }[] = [];

  preferences = {
    darkMode: false,
    compactMode: false,
    currency: 'KES'
  };

  transferForm = {
    to: '',
    amount: 0,
    ref: '',
    type: ''
  };

  depositAmount = 0;
  withdrawAmount = 0;
  borrowAmount = 0;
  duration = 12;
  qualifiedAmount = 0;
  loanMessage = '';

  // ================= INTERNAL =================
  private loanUpdateSubscription?: Subscription;
  private suppressPollingUntil = 0;
  private nationalId: string | null = null;

  constructor(
    private accountService: AccountService,
    private authService: AuthService,
    private http: HttpClient,
    private loanService: LoanService,
    private router: Router
  ) {}

  // ================= INIT =================
  ngOnInit(): void {
    this.initializeDashboard();
    this.startLoanAutoUpdate();
    this.loadUserAccounts();
  }

  ngOnDestroy(): void {
    this.loanUpdateSubscription?.unsubscribe();
  }

  // ================= DASHBOARD INIT =================
  private initializeDashboard(): void {
    const user = this.authService.resolveCurrentUser();

    if (!user?.nationalId) {
      this.router.navigate(['/login']);
      return;
    }

    this.nationalId = user.nationalId;

    this.setGreeting();
    this.loadPreferences();

    this.notifications = [
      { message: 'Welcome back!', date: new Date() },
      { message: 'Your statement is ready.', date: new Date() }
    ];

    this.fetchAccount(this.nationalId);
  }

  // ================= AUTO LOAN POLLING =================
  private startLoanAutoUpdate(): void {
    const user = this.authService.resolveCurrentUser();
    const nationalId = user?.nationalId;

    if (!nationalId) return;

    this.loanUpdateSubscription = interval(5000).subscribe(() => {
      if (Date.now() < this.suppressPollingUntil) return;
      this.fetchLoanDetails(nationalId);
    });
  }

  // ================= ACCOUNT =================
  private fetchAccount(nationalId: string): void {
    this.accountService.getAccountDetailsByNationalId(nationalId).subscribe({
      next: (data) => {
        this.balance = data.balance || 0;

        this.user = {
          name: data.name || 'User',
          email: data.email || '',
          accountNumber: data.accountNumber || '',
          profileImage: data.imageUrl
            ? `http://localhost:8080/api/accounts/image/${nationalId}`
            : 'assets/default-user.png',
        };

        this.calculateNetBalance();
        this.fetchLoanDetails(nationalId);
        this.fetchStatements(nationalId);

        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  loadUserAccounts(): void {
    const user = this.authService.resolveCurrentUser();
    const nationalId = user?.nationalId;
    if (!nationalId) return;

    this.http.get<any[]>(`http://localhost:8080/api/accounts/by-id/${nationalId}`)
      .subscribe({
        next: (res) => {
          this.userAccounts = Array.isArray(res) ? res : [res];
          if (this.userAccounts.length) {
            this.selectedAccount = this.userAccounts[0].accountNumber;
          }
        }
      });
  }

  // ================= LOAN =================
  private fetchLoanDetails(nationalId: string): void {
    this.loanService.getLoanDetailsByNationalId(nationalId).subscribe({
      next: (loans) => {
        const active = loans.find((l: any) => l.status?.toLowerCase() !== 'repaid');

        this.loan = active || {
          totalRepayableAmount: 0,
          dueAmount: 0,
          dueDate: '',
          status: ''
        };

        this.updateNetBalance();
      }
    });
  }

  private updateNetBalance(): void {
    const loanAmount = this.loan?.totalRepayableAmount || 0;
    this.netBalance = this.balance - loanAmount;
  }

  private calculateNetBalance(): void {
    this.netBalance = this.balance;
  }

  // ================= STATEMENTS =================
  private fetchStatements(nationalId: string): void {
    this.accountService.getStatements(nationalId).subscribe({
      next: (txns) => {
        this.transactions = (txns || []).map((t: any) => ({
          description: t.description,
          amount: t.debit || t.credit,
          type: t.debit ? 'debit' : 'credit',
          date: t.date,
          debit: t.debit,
          credit: t.credit,
          balanceAfter: t.balanceAfter
        }));
      }
    });
  }

  // ================= UI HELPERS =================
  setGreeting(): void {
    const h = new Date().getHours();
    this.greeting = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
  }

  loadPreferences(): void {
    const saved = localStorage.getItem('dashboardPreferences');
    if (saved) this.preferences = JSON.parse(saved);
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  logout(): void {
    this.authService.logout?.();
    this.router.navigate(['/login']);
  }


  // ================= UI MODALS =================

openProfile(): void {
  this.openModal('profileModal');
}

openSettings(): void {
  this.openOffcanvas('settingsCanvas');
}

openPayLoan(): void {
  this.openModal('payLoanModal');
}

openDeposit(): void {
  this.openModal('depositModal');
}

openWithdraw(): void {
  this.openModal('withdrawModal');
}

openBorrow(): void {
  this.openModal('borrowModal');
}

openTransfer(): void {
  this.openModal('transferModal');
}

// ================= PAGINATION =================

clearFilter(): void {
  this.filterTerm = '';
  this.currentPage = 1;
}

filteredTransactions(): Transaction[] {
  const filtered = this.transactions.filter(txn =>
    txn.description?.toLowerCase().includes(this.filterTerm.toLowerCase())
  );

  const start = (this.currentPage - 1) * this.itemsPerPage;
  return filtered.slice(start, start + this.itemsPerPage);
}

get totalPages(): number {
  const count = this.transactions.filter(txn =>
    txn.description?.toLowerCase().includes(this.filterTerm.toLowerCase())
  ).length;

  return Math.max(1, Math.ceil(count / this.itemsPerPage));
}

nextPage(): void {
  if (this.currentPage < this.totalPages) this.currentPage++;
}

prevPage(): void {
  if (this.currentPage > 1) this.currentPage--;
}

// ================= PREFERENCES =================

applyPreferences(): void {
  const root = document.querySelector('.dashboard-shell') as HTMLElement;
  if (!root) return;

  root.classList.toggle('dark', this.preferences.darkMode);
  root.classList.toggle('compact', this.preferences.compactMode);
}

savePreferences(): void {
  localStorage.setItem('dashboardPreferences', JSON.stringify(this.preferences));
  this.applyPreferences();
}

// ================= FOR TEMPLATE COMPAT =================
Math = Math;


private openModal(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const modal = new (window as any).bootstrap.Modal(el);
  modal.show();
}

private openOffcanvas(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const canvas = new (window as any).bootstrap.Offcanvas(el);
  canvas.show();
}

confirmDeposit(): void {
  this.showToast('Deposit submitted', 'success');
}

confirmWithdraw(): void {
  this.showToast('Withdraw submitted', 'info');
}

confirmPayLoan(): void {
  this.showToast('Loan payment submitted', 'success');
}

confirmBorrow(): void {
  this.showToast('Loan request submitted', 'success');
}

transferFunds(): void {
  if (!this.transferForm.amount || !this.transferForm.to) {
    this.showToast('Fill transfer details first', 'danger');
    return;
  }

  this.http.post('http://localhost:8080/api/mpesa/transfer', this.transferForm)
    .subscribe({
      next: () => this.showToast('Transfer successful', 'success'),
      error: () => this.showToast('Transfer failed', 'danger')
    });
}


private showToast(
  message: string,
  type: 'success' | 'danger' | 'warning' | 'info' = 'info'
): void {
  const toast = document.createElement('div');

  toast.className = `toast align-items-center text-bg-${type} border-0 position-fixed top-0 end-0 m-3`;
  toast.style.zIndex = '9999';

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  document.body.appendChild(toast);

  const bsToast = new (window as any).bootstrap.Toast(toast, {
    delay: 4000,
  });

  bsToast.show();

  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}
}