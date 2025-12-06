import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from '../services/account.service';
import { AuthService } from '../services/auth-service.service';
import { LoanService } from '../services/loan.service';
import { HttpClient } from '@angular/common/http';
import { Loan } from '../../models/loan.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

interface PaymentSummary {
  title: string;
  icon: string;
  amount: number;
}

interface UserAccount {
  accountNumber: string;
  balance: number;
}

interface RecentPayment {
  date: string;
  reference: string;
  beneficiary: string;
  amount: number;
  status: 'Successful' | 'Pending' | 'Failed';
}

@Component({
  selector: 'app-payment-summary',
  templateUrl: './payment-summary.component.html',
  styleUrls: ['./payment-summary.component.css']
})
export class PaymentsComponent implements OnInit {
  paymentSummaries: PaymentSummary[] = [];
  userAccounts: UserAccount[] = [];
  recentPayments: RecentPayment[] = [];
  selectedAccount: UserAccount | null = null;
  loadingAccounts = false;
  username = '';
  nationalId = '';

   @ViewChild('loanModal') loanModal!: TemplateRef<any>;
  selectedLoan: Loan | null = null;
  unpaidLoans: Loan[] = [];
  loadingLoan = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private accountService: AccountService,
    private authService: AuthService,
    private loanService: LoanService,
     public modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.username = this.authService.getUsername();
      this.nationalId = this.authService.getNationalId();

      if (this.nationalId) {
        console.log('🔹 Logged-in user National ID:', this.nationalId);
        this.loadAccounts();
      } else {
        console.warn('⚠️ No National ID found — user not fully loaded yet.');
      }

      this.loadDummyData();
    }, 100);
  }

  loadDummyData(): void {
    this.paymentSummaries = [
      { title: 'Total Payments', icon: 'bi bi-wallet2', amount: 45230 },
      { title: 'Pending Payments', icon: 'bi bi-clock-history', amount: 1250 },
      { title: 'Scheduled', icon: 'bi bi-calendar-check', amount: 8900 },
      { title: 'Failed Payments', icon: 'bi bi-x-circle', amount: 430 }
    ];

    this.recentPayments = [
      { date: '2025-10-20', reference: 'MP23145J', beneficiary: 'Equity Insurance', amount: 2500, status: 'Successful' },
      { date: '2025-10-18', reference: 'UT45238H', beneficiary: 'Kenya Power', amount: 1600, status: 'Pending' },
      { date: '2025-10-17', reference: 'MP10932A', beneficiary: 'Water Bill', amount: 900, status: 'Successful' },
      { date: '2025-10-16', reference: 'BN90012R', beneficiary: 'Loan Repayment', amount: 5000, status: 'Failed' }
    ];
  }

  /**
   * ✅ Fetch accounts for logged-in user
   */
  loadAccounts(): void {
    this.loadingAccounts = true;

    this.accountService.getAccountDetailsByNationalId(this.nationalId).subscribe({
      next: (response: any) => {
        this.userAccounts = Array.isArray(response) ? response : [response];
        this.selectedAccount = this.userAccounts[0] || null;
        console.log('✅ Accounts loaded (normalized):', this.userAccounts);
      },
      error: (err) => {
        console.error('❌ Failed to load accounts:', err);
      },
      complete: () => {
        this.loadingAccounts = false;
      }
    });
  }

  showAlert(type: 'success' | 'info' | 'warning' | 'danger', message: string): void {
  const alertBox = document.createElement('div');
  alertBox.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg`;
  alertBox.style.zIndex = '2000';
  alertBox.style.width = 'fit-content';
  alertBox.style.minWidth = '300px';
  alertBox.innerHTML = `
    <div class="d-flex align-items-center justify-content-between">
      <span>${message}</span>
      <button type="button" class="btn-close ms-3" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

  document.body.appendChild(alertBox);
  setTimeout(() => alertBox.remove(), 4000); // auto close after 4s
}


openTransfer(): void {
  this.showAlert('info', '🔄 Transfer initiated — please select recipient account.');
}

openBorrow(): void {
  this.showAlert('warning', '💰 Borrow feature coming soon.');
}

openPayLoan(): void {
  this.payLoan(); // reuse the real pay loan flow
}

openDeposit(): void {
  this.showAlert('success', '🏦 Deposit process initiated.');
}

openWithdraw(): void {
  this.showAlert('danger', '💸 Withdraw request started.');
}



  onPay(type: string): void {
    switch (type) {
      case 'mpesa':
        alert('📱 Redirecting to M-Pesa payment...');
        break;
      case 'bank':
        alert('🏦 Transfer to another bank...');
        break;
      case 'swift':
        alert('🌍 Initiating SWIFT international transfer...');
        break;
      case 'bill':
        alert('💡 Opening utility/bill payment form...');
        break;
      case 'loan':
        this.payLoan();
        break;
      default:
        alert('⚠️ Unknown payment type selected.');
    }
  }

  /**
   * ✅ Real Loan Repayment process
   */
  // ✅ Fetch loans and open modal
 payLoan(): void {
  const user = this.authService.getUser();
  if (!user) {
    this.errorMessage = 'Please log in first.';
    return;
  }

  const nationalId = user.nationalId;
  this.loadingLoan = true;

  this.loanService.getLoansByIdNo(nationalId).subscribe({
    next: (loans: Loan[]) => {
      this.unpaidLoans = loans.filter(l => l.dueAmount && l.dueAmount > 0);

      if (this.unpaidLoans.length > 0) {
        this.selectedLoan = this.unpaidLoans[0];
        this.modalService.open(this.loanModal, { centered: true, size: 'lg' });
      } else {
        // ✅ Notify user — no loans to pay
        this.errorMessage = '🎉 You currently have no unpaid loans.';
        this.showAlert('info', '🎉 You currently have no unpaid loans to repay.');
      }
    },
    error: (err) => {
      console.error('❌ Loan fetch error:', err);
      this.errorMessage = 'Failed to fetch your loan details. Try again.';
      this.showAlert('danger', '⚠️ Failed to fetch your loan details. Please try again.');
    },
    complete: () => (this.loadingLoan = false)
  });
}


  // ✅ Confirm and process repayment
  confirmRepayment(): void {
    if (!this.selectedLoan) return;
    const user = this.authService.getUser();
if (!user) {
  this.errorMessage = 'User session expired. Please log in again.';
  return;
}


    const payload = {
      loanId: this.selectedLoan.id,
      amountPaid: this.selectedLoan.dueAmount,
      repaymentDate: new Date().toISOString().split('T')[0],
      phoneNumber: user.phoneNumber,
      location: this.selectedLoan.location || 'N/A',
      idNo: user.nationalId,
      accountNumber: this.selectedAccount?.accountNumber

    };

    this.http.post('http://localhost:8080/api/repayments', payload).subscribe({
      next: (res: any) => {
const amount = payload.amountPaid ?? 0;
this.successMessage = `✅ Payment of KES ${amount.toLocaleString()} for Loan #${payload.loanId} completed successfully.`;
        this.selectedLoan!.dueAmount = res.remainingDue ?? 0;
        setTimeout(() => this.modalService.dismissAll(), 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '❌ Repayment failed. Please try again.';
      }
    });
  }
  /**
   * ✅ Account Selection
   */
  onAccountSelect(account: UserAccount | null): void {
    if (!account) return;
    this.selectedAccount = account;
    console.log('Selected account:', account);
  }

  /**
   * ✅ Dummy Payment Submit
   */
  onSubmitPayment(): void {
    if (!this.selectedAccount) {
      alert('⚠️ Please select an account first.');
      return;
    }
    alert(`✅ Payment successfully processed from ${this.selectedAccount.accountNumber}!`);
  }
}
