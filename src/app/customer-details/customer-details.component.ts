import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoanService } from '../services/loan.service';
import jsPDF from 'jspdf';
import { AuthService } from '../services/auth-service.service';
import { Loan } from '../../models/loan.model';

@Component({
  selector: 'app-customer-details',
  templateUrl: './customer-details.component.html',
  styleUrls: ['./customer-details.component.css']
})
export class CustomerDetailsComponent implements OnInit {
  
  selectedLoan: Loan | null = null;
  isLoading = false;
repayments?: any[];
  userRole: string = '';
  loanId: number = 0;

  daysRemaining: number = 0;
dueStatus: string = '';
dueDateDisplay: string = '';

aiResult: any;
requestedAmount: number = 0;
monthlyIncome: number = 0;
phoneNumber: string = '';
accountId: number = 0;

  actionInProgress = false;

  showRejectDialog = false;

  rejectionReason = '';

  constructor(
    private route: ActivatedRoute,
    private loanService: LoanService,
    private authService: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {

    this.userRole = this.authService.getRole() || 'USER';

    this.route.queryParams.subscribe(params => {

      console.log('📥 Query Params:', params);

      const rawId = params['loanId'];
      const loanId = Number(rawId);

      console.log('👉 Raw:', rawId, 'Converted:', loanId);

      if (!rawId || isNaN(loanId) || loanId <= 0) {

        console.error('❌ Invalid loanId:', rawId);

        alert('Invalid loan ID - redirecting');

        this.router.navigate(['/app/dashboard']);

        return;
      }

      this.loanId = loanId;

      console.log('✅ Final loanId stored:', this.loanId);

      this.fetchLoanDetails(this.loanId);

    });

  }

  runCreditAI(): void {

  if (!this.accountId || !this.selectedLoan) return;

  this.loanService.getCreditIntelligence(this.accountId, {
    requestedAmount: this.selectedLoan.amount,
    monthlyIncome:
this.selectedLoan?.account?.monthlyIncome || 0,
    phoneNumber: this.selectedLoan.phoneNumber
  }).subscribe(res => {

    console.log('🧠 AI Decision:', res);

    this.aiResult = res;

  });
}

  // =========================================================
  // FETCH LOAN DETAILS
  // =========================================================

  fetchLoanDetails(loanId: number): void {

    this.isLoading = true;

    this.loanService.getLoans().subscribe({

      next: (loans) => {

        const loan = loans.find(l => l.id == loanId);

       if (loan) {

  this.selectedLoan = loan;
  this.accountId = loan.account?.id || 0; // or adjust field name

  // ================= FIX: ENSURE DUE DATE =================
  if (!loan.dueDate && loan.createdAt) {
    const createdDate = new Date(loan.createdAt);
    const durationMonths = Number(loan.duration || 1);
    createdDate.setMonth(createdDate.getMonth() + durationMonths);
    loan.dueDate = createdDate.toISOString();
  }

  // ================= PRECOMPUTE DAYS =================
  this.computeDueMetrics();

  // ================= LOAD TRANSACTIONS =================
  this.loanService.getLoanTransactions(loanId).subscribe({
    next: txs => {
      this.selectedLoan = {
  ...this.selectedLoan!,
  repayments: txs ?? []
};
      this.isLoading = false;
    },
    error: () => {
      this.selectedLoan!.repayments = [];
      this.isLoading = false;
    }
  });

  // ================= 🔥 ADD AI CALL HERE =================
  this.runCreditAI();

}else {

          this.selectedLoan = null;

          this.isLoading = false;

        }

      },

      error: () => {

        this.selectedLoan = null;

        this.isLoading = false;

      }

    });

  }


  canRepay(loan: any): boolean {
  return !!loan && (loan.dueAmount ?? 0) > 0;
}

 computeDueMetrics(): void {

  if (!this.selectedLoan) {
    return;
  }

  const loan = this.selectedLoan;

   // =====================================================
  // CHECK LOAN STATUS FIRST
  // =====================================================

  const status = (loan.status || '').toUpperCase();

  // =====================================================
  // REJECTED LOAN
  // =====================================================

  if (status === 'REJECTED' || status === 'AUTO_REJECTED') {

    this.daysRemaining = 0;

    this.dueStatus = 'REJECTED';

    this.dueDateDisplay = 'N/A';

    return;
  }

  // =====================================================
  // PENDING APPROVAL
  // =====================================================

  if (status === 'AWAITING_AUTHORIZATION') {

    this.daysRemaining = 0;

    this.dueStatus = 'AWAITING APPROVAL';

    this.dueDateDisplay = 'Pending Approval';

    return;
  }

  // =====================================================
  // SMART LOAN STATE DETECTION
  // =====================================================

  const dueAmount = Number(loan.dueAmount || 0);

  const totalPayable = Number(loan.totalRepayableAmount || 0);

  const amountPaid = totalPayable - dueAmount;

  const fullyPaid =
    dueAmount <= 0 ||
    amountPaid >= totalPayable ||
    loan.status?.toUpperCase() === 'PAID' ||
    loan.status?.toUpperCase() === 'CLEARED';

  // =====================================================
  // CLEARED LOAN LOGIC
  // =====================================================

  if (fullyPaid) {

    this.daysRemaining = 0;

    this.dueStatus = 'LOAN CLEARED';

    this.dueDateDisplay = loan.dueDate
      ? new Date(loan.dueDate).toLocaleDateString()
      : 'Completed';

    return;
  }

  // =====================================================
  // NO DUE DATE
  // =====================================================

  if (!loan.dueDate) {

    this.daysRemaining = 0;

    this.dueStatus = 'NO DUE DATE';

    this.dueDateDisplay = 'Not Available';

    return;
  }

  // =====================================================
  // ACTIVE LOAN ANALYSIS
  // =====================================================

  const today = new Date();
  const due = new Date(loan.dueDate);

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diff = Math.ceil(
    (due.getTime() - today.getTime()) /
    (1000 * 60 * 60 * 24)
  );

  this.daysRemaining = diff;

  // =====================================================
  // AI SMART TIMELINE LABELS
  // =====================================================

  if (diff < 0) {

    const overdueDays = Math.abs(diff);

    if (overdueDays <= 7) {
      this.dueStatus = `${overdueDays} Days Overdue`;
    }
    else if (overdueDays <= 30) {
      this.dueStatus = `CRITICAL • ${overdueDays} Days Late`;
    }
    else {
      this.dueStatus = `NON PERFORMING • ${overdueDays} DPD`;
    }

  }
  else if (diff === 0) {

    this.dueStatus = 'DUE TODAY';

  }
  else if (diff <= 3) {

    this.dueStatus = `URGENT • ${diff} Days Remaining`;

  }
  else if (diff <= 7) {

    this.dueStatus = `NEAR MATURITY • ${diff} Days`;

  }
  else {

    this.dueStatus = `${diff} Days Remaining`;

  }

  this.dueDateDisplay =
    new Date(loan.dueDate).toLocaleDateString();
}

  // =========================================================
  // SEND REMINDER
  // =========================================================

  sendReminder(loanId: number): void {

    this.loanService.sendReminder(loanId).subscribe({

      next: () => {

        alert('Reminder sent successfully');

      },

      error: () => {

        alert('Failed to send reminder');

      }

    });

  }

  getStatusClass(): string {
  if (!this.selectedLoan) return '';

  const days = this.getDaysRemaining(this.selectedLoan);

  if (days < 0) return 'danger';
  if (days <= 7) return 'warn';
  return 'good';
}

  // =========================================================
  // REPAYMENT PERCENTAGE
  // =========================================================

  calculateRepaymentPercentage(loan: Loan): number {

    if (!loan || !loan.totalRepayableAmount) {
      return 0;
    }

    const paid =
      loan.totalRepayableAmount - (loan.dueAmount || 0);

    return Math.round(
      (paid / loan.totalRepayableAmount) * 100
    );

  }

  // =========================================================
  // RISK LEVEL
  // =========================================================

  getRiskLevel(): string {

    if (!this.selectedLoan) {
      return 'UNKNOWN';
    }

    const repayment =
      this.calculateRepaymentPercentage(this.selectedLoan);

    if (repayment >= 80) {
      return 'LOW';
    }

    if (repayment >= 50) {
      return 'MEDIUM';
    }

    return 'HIGH';

  }

  // =========================================================
  // DAYS REMAINING CALCULATOR
  // =========================================================

  getDaysRemaining(loan: Loan): number {

    if (!loan?.dueDate) {
      return 0;
    }

    const today = new Date();

    const dueDate = new Date(loan.dueDate);

    // REMOVE TIME FOR ACCURATE DAY DIFFERENCE

    today.setHours(0, 0, 0, 0);

    dueDate.setHours(0, 0, 0, 0);

    const difference =
      dueDate.getTime() - today.getTime();

    return Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    );

  }

  // =========================================================
  // DUE STATUS LABEL
  // =========================================================

  getDueStatus(loan: Loan): string {

    const days = this.getDaysRemaining(loan);

    if (days < 0) {
      return 'OVERDUE';
    }

    if (days === 0) {
      return 'DUE TODAY';
    }

    if (days <= 7) {
      return 'NEAR MATURITY';
    }

    return 'ACTIVE';

  }

  // =========================================================
  // CLEAR LOAN
  // =========================================================

  clearLoan(loanId: number): void {

    if (!confirm('Are you sure you want to clear this loan?')) {
      return;
    }

    this.router.navigate(['/app/repayment-form'], {
      queryParams: { loanId }
    });

  }

  // =========================================================
  // DOWNLOAD RECEIPT
  // =========================================================

  downloadReceipt(repayment: any): void {

    const doc = new jsPDF();

    const loan = this.selectedLoan;

    const pageWidth = doc.internal.pageSize.getWidth();

    // HEADER

    doc.setFillColor(15, 23, 42);

    doc.rect(0, 0, pageWidth, 34, 'F');

    doc.setTextColor(255, 255, 255);

    doc.setFontSize(20);

    doc.text('CrediBank AI', 14, 14);

    doc.setFontSize(10);

    doc.text('Premium Smart Loan Receipt', 14, 22);

 doc.text(
  `Receipt #: RCPT-${Date.now()}`,
  pageWidth - 70,
  14
);

    doc.text(
      `${new Date().toLocaleDateString()}`,
      pageWidth - 70,
      22
    );

    // CUSTOMER

    doc.setTextColor(0);

    doc.setFontSize(14);

    doc.text('Customer Information', 14, 48);

    doc.setDrawColor(220);

    doc.line(14, 50, pageWidth - 14, 50);

    doc.setFontSize(11);

    doc.text(
      `Customer Name: ${loan?.applicantName || '-'}`,
      14,
      60
    );

    doc.text(
      `National ID: ${loan?.nationalId || '-'}`,
      14,
      68
    );

    // LOAN DETAILS

    doc.setFontSize(14);

    doc.text('Loan Details', 14, 84);

    doc.line(14, 86, pageWidth - 14, 86);

    doc.setFontSize(11);

    doc.text(
      `Loan Amount: KES ${(loan?.amount ?? 0).toLocaleString()}`,
      14,
      96
    );

    doc.text(
      `Total Payable: KES ${(loan?.totalRepayableAmount ?? 0).toLocaleString()}`,
      14,
      104
    );

    doc.text(
      `Outstanding Balance: KES ${(loan?.dueAmount ?? 0).toLocaleString()}`,
      14,
      112
    );

    doc.text(
      `Due Date: ${
        loan?.dueDate
          ? new Date(loan.dueDate).toLocaleDateString()
          : 'N/A'
      }`,
      14,
      120
    );

    // PAYMENT

    doc.setFontSize(14);

    doc.text('Repayment Information', 14, 138);

    doc.line(14, 140, pageWidth - 14, 140);

    doc.setFontSize(11);

    doc.text(
      `Amount Paid: KES ${(repayment?.amount ?? 0).toLocaleString()}`,
      14,
      150
    );

    doc.text(
      `Payment Method: ${repayment?.method || '-'}`,
      14,
      158
    );

    doc.text(
      `Payment Date: ${
        repayment?.date
          ? new Date(repayment.date).toLocaleDateString()
          : '-'
      }`,
      14,
      166
    );

    // AI INSIGHT

    doc.setFontSize(14);

    doc.text('AI Assessment', 14, 184);

    doc.line(14, 186, pageWidth - 14, 186);

    doc.setFontSize(11);

    doc.text(
      `AI Confidence: ${this.calculateRepaymentPercentage(loan!) + 5}%`,
      14,
      196
    );

    doc.text(
      `Portfolio Risk: ${this.getRiskLevel()}`,
      14,
      204
    );

    // FOOTER

    doc.setFontSize(9);

    doc.setTextColor(100);

    doc.text(
      'This document was system generated by CrediBank AI.',
      14,
      230
    );

    doc.text(
      'support@credibank.com | +254 722 612 266',
      14,
      238
    );

    doc.save(
      `Receipt_${loan?.nationalId || 'NA'}_${Date.now()}.pdf`
    );

  }

  // =========================================================
  // CHECK ADMIN
  // =========================================================

  isAdmin(): boolean {

    return this.userRole?.toUpperCase() === 'ADMIN';

  }

  // =========================================================
  // REASSIGN STAFF
  // =========================================================

  reassignStaff(loanId: number): void {

    console.log('🔥 REASSIGN CLICKED');

    console.log('👉 Raw Loan ID:', loanId);

    console.log('👉 User Role:', this.userRole);

    if (!this.isAdmin()) {

      console.warn('⛔ Access denied: not admin');

      alert('Access denied: Admin only feature');

      return;

    }

    if (!loanId || isNaN(loanId)) {

      console.error('❌ Invalid loan ID received:', loanId);

      alert('Invalid loan ID. Check console.');

      return;

    }

    const targetUrl = '/app/assign-staff';

    console.log(
      '🚀 Navigating to:',
      targetUrl,
      'with loanId:',
      loanId
    );

    this.router.navigate([targetUrl], {
      queryParams: { loanId }
    }).then(success => {

      if (success) {

        console.log(
          '✅ Navigation SUCCESS to Assign Staff'
        );

      } else {

        console.error(
          '❌ Navigation FAILED - Angular blocked route'
        );

      }

    }).catch(err => {

      console.error('🔥 Router error:', err);

    });

  }


  // =========================================================
  // APPROVE LOAN
  // =========================================================

  approveLoan(loan: Loan): void {

    if (!loan?.id) {
      alert('Invalid loan selected.');
      return;
    }

    const status =
      String(loan.status || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    // Approval is only allowed for applications awaiting authorization
    if (status !== 'AWAITING_AUTHORIZATION') {

      alert(
        `This application cannot be approved because its current status is "${loan.status || 'UNKNOWN'}".`
      );

      return;
    }

    const confirmed = window.confirm(
      `Approve loan application #${loan.id}?\n\n` +
      `Applicant: ${loan.applicantName || '-'}\n` +
      `Amount: KES ${(loan.amount || 0).toLocaleString('en-KE')}\n\n` +
      `The application will proceed to loan approval/disbursement according to the backend authorization rules.`
    );

    if (!confirmed) {
      return;
    }

    this.actionInProgress = true;

    this.loanService.approveLoan(loan.id).subscribe({

      next: (approvedLoan: Loan) => {

        this.actionInProgress = false;

        this.selectedLoan = approvedLoan;

        this.computeDueMetrics();

        alert('Loan approved successfully.');

      },

      error: (error) => {

        console.error(
          '❌ Loan approval failed:',
          error
        );

        this.actionInProgress = false;

        const message =
          error?.error?.message ||
          error?.error?.error ||
          'Unable to approve the loan. Please try again.';

        alert(message);

      }

    });

  }


 openRejectDialog(loan: Loan): void {

  if (!loan || loan.id == null) {
    alert('Invalid loan selected.');
    return;
  }

  const status = String(loan.status || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  // Rejection is only allowed at authorization stage
  if (status !== 'AWAITING_AUTHORIZATION') {

    alert(
      `This application cannot be rejected because its current status is "${loan.status || 'UNKNOWN'}".`
    );

    return;
  }

  // Store the loan being rejected
  this.selectedLoan = loan;

  // Clear previous rejection reason
  this.rejectionReason = '';

  // Open rejection dialog
  this.showRejectDialog = true;
}


  // =========================================================
  // CLOSE REJECTION DIALOG
  // =========================================================

  closeRejectDialog(): void {

    if (this.actionInProgress) {
      return;
    }

    this.showRejectDialog = false;

    this.rejectionReason = '';

  }


  // =========================================================
  // CONFIRM LOAN REJECTION
  // =========================================================

  confirmRejectLoan(): void {

    const loan = this.selectedLoan;

    if (!loan?.id) {

      alert('No loan application selected.');

      return;

    }

    const status =
      String(loan.status || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    // Backend lifecycle protection
    if (status !== 'AWAITING_AUTHORIZATION') {

      alert(
        `This application can no longer be rejected because its current status is "${loan.status || 'UNKNOWN'}".`
      );

      this.showRejectDialog = false;

      return;

    }

    const reason =
      String(this.rejectionReason || '')
        .trim();

    if (!reason) {

      alert(
        'Please provide a reason for rejecting this loan application.'
      );

      return;

    }

    if (reason.length < 5) {

      alert(
        'Please provide a meaningful rejection reason.'
      );

      return;

    }

    this.actionInProgress = true;

    this.loanService
      .rejectLoan(loan.id, reason)
      .subscribe({

        next: (response: any) => {

          this.actionInProgress = false;

          this.showRejectDialog = false;

          this.rejectionReason = '';

          /*
           * Your backend may return either:
           *
           * { loan: Loan, message: '...' }
           *
           * or the Loan directly.
           */
          const rejectedLoan: Loan | null =
            response?.loan ||
            response ||
            null;

          if (rejectedLoan) {

            this.selectedLoan = rejectedLoan;

          } else {

            /*
             * Keep the current object synchronized if
             * backend only returned a success message.
             */
            this.selectedLoan = {
              ...loan,
              status: 'REJECTED',
              rejectionReason: reason
            };

          }

          this.computeDueMetrics();

          alert(
            'Loan application rejected successfully.'
          );

        },

        error: (error) => {

          console.error(
            '❌ Loan rejection failed:',
            error
          );

          this.actionInProgress = false;

          const message =
            error?.error?.message ||
            error?.error?.error ||
            'Unable to reject the loan. Please try again.';

          alert(message);

        }

      });

  }

}