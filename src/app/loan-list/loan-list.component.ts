import { TransactionService } from './../services/services/transaction.service';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { timer } from 'rxjs';
import jsPDF from 'jspdf';
import { AppNotification, Loan } from '../../models/loan.model';
import { Account } from '../../models/User.model';
import { LoanService } from '../services/loan.service';
import { AuthService } from '../services/auth-service.service';
import { AccountService } from '../services/account.service';
import { NotificationService } from '../services/services/notification.service';
import { interval } from 'rxjs';

        declare var bootstrap: any;

        @Component({
        selector: 'app-loan-list',
        templateUrl: './loan-list.component.html',
        styleUrls: ['./loan-list.component.css']
        })
        export class LoanListComponent implements OnInit {
        processingLoanId: number | null = null;
        @Input() loans: Loan[] = [];
        allLoans: Loan[] = [];
        rejectionReason: string = '';
        loanToReject!: Loan;
        searchTerm: string = '';
        searchType: string = 'name';
        showCreateForm = false;
        isEditMode = false;
        selectedLoan: Loan | null = null;
        notifications: AppNotification[] = [];
        unreadCount = 0;
        loanDecision: any = null;
        loanDecisionMessage: string = '';
        isEligible: boolean = false;
        showEligibilityCard: boolean = false;
        hasActiveLoanCardVisible: boolean = false;
        activeLoanMessage: string = '';
        isCheckingLoan = false;
        showNotifications = false;
        selectedImageFile: File | null = null;
        imageSrc: string | null = null;

        errorMessage: string = '';
        successMessage: string = '';
        submitError: string | null = null;
        submitSuccess: string | null = null;

        isLoading = false;
        isSubmitting = false;

        nationalId = '';
        applicant: any;
        insights: any;

        userRole: string = '';
        account: Account | null = null;
        showError: boolean = false;

        loanForm!: FormGroup;

  counts = { all: 0, pending: 0, approved: 0, rejected: 0 };
  private longPressTimeout: any;

  constructor(
    private loanService: LoanService,
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    public router: Router ,
    private accountService: AccountService,
    private notificationService: NotificationService,
    private transactionService: TransactionService
    
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
    this.initForm();
    this.loadLoans();
this.loadNotifications();
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'apply') this.toggleForm();
    });

    this.route.queryParams.subscribe(params => {
  const loanId = params['loanId'];

  if (loanId) {
    setTimeout(() => {
      const loan = this.allLoans.find(l => l.id == loanId);
      if (loan) {
        this.viewCustomerDetails(loan); // or editLoan(loan)
      }
    }, 500);
  }
});

this.loadNotifications();

this.unreadCount =
  this.notificationService.getUnreadCount();

interval(10000).subscribe(() => {

  this.loadNotifications();

});
  }

 private initForm() {
  this.loanForm = this.fb.group({
    id: [null],
    nationalId: ['', [Validators.required, Validators.minLength(4)]],
    duration: ['', Validators.required],
    amount: [0, Validators.required],
    applicationDate: [new Date(), Validators.required],
    fullName: [''],
    phoneNumber: [''],
    location: [''],
    email: ['', [Validators.email]],

    // ✅ CONSISTENT NAMES (USED EVERYWHERE)
    monthlyIncome: [0, Validators.required],
    monthlyExpenses: [0]
  });
}

openNotifications() {
  this.showNotifications = !this.showNotifications;
}

markNotificationAsRead(notification: AppNotification): void {

  if (!notification.id) return;

  this.notificationService
    .markAsRead(notification.id)
    .subscribe({

      next: () => {

        notification.read = true;

        this.unreadCount =
          this.notifications.filter(
            n => !n.read
          ).length;

      },

      error: err => {

        console.error(err);

      }

    });

}

loadNotifications(): void {

  this.notificationService
    .getNotifications()
    .subscribe({

      next: (data) => {

        this.notifications = data;

        this.unreadCount =
          data.filter(n => !n.read).length;

      },

      error: (err) => {

        console.error(
          'Failed loading notifications',
          err
        );

      }

    });

}

 loadLoans(): void {

  this.isLoading = true;

  this.loanService.getLoans().subscribe({

    next: (data) => {

      this.allLoans = data.sort(
        (a, b) =>
          new Date(b.applicationDate).getTime() -
          new Date(a.applicationDate).getTime()
      );

      this.loans = [...this.allLoans];

      // Debug each loan status
      this.allLoans.forEach(loan => {
        console.log(
          `Loan ID: ${loan.id}, Applicant: ${loan.applicantName}, Status: ${loan.status}`
        );
      });

      this.counts = {
        all: this.allLoans.length,
        pending: this.allLoans.filter(
          l => l.status?.toUpperCase() === 'AWAITING_AUTHORIZATION'
        ).length,

        approved: this.allLoans.filter(
          l => l.status?.toUpperCase() === 'APPROVED'
        ).length,

        rejected: this.allLoans.filter(
          l => l.status?.toUpperCase() === 'REJECTED'
        ).length
      };

      // Apply dashboard filter if present
      const filter = this.route.snapshot.queryParamMap.get('filter');

      if (filter) {
        this.filterLoans(filter);
      }

      this.isLoading = false;
    },

    error: (err) => {

      console.error('Failed to load loans', err);

      this.isLoading = false;

      this.showErrorMessage('Failed to load loans.');
    }

  });

}

  openRejectModal(loan: Loan) {
  this.loanToReject = loan;
  this.rejectionReason = '';

  const modal = new bootstrap.Modal(
    document.getElementById('rejectLoanModal')
  );
  modal.show();
}

confirmReject(): void {

  if (!this.loanToReject) {
    return;
  }

  this.processingLoanId = this.loanToReject.id!;

  this.loanService.rejectLoanWithReason(
    this.loanToReject.id!,
    this.rejectionReason
  ).subscribe({

    next: (loan) => {

      const index =
        this.allLoans.findIndex(
          l => l.id === loan.id
        );

      if (index !== -1) {

        this.allLoans[index] = {
          ...this.allLoans[index],
          ...loan,
          status: 'REJECTED',
          rejectionReason: this.rejectionReason
        };

      }

      this.loans = [...this.allLoans];

      this.processingLoanId = null;

      this.loadNotifications();

      this.updateCounts();

      bootstrap.Modal.getInstance(
        document.getElementById('rejectLoanModal')
      )?.hide();

      this.showSuccessMessage(
        'Loan rejected successfully.'
      );

    },

    error: err => {

      console.error(err);

      this.processingLoanId = null;

      this.showErrorMessage(
        err?.error?.message ||
        'Failed to reject loan.'
      );

    }

  });

}

private updateCounts(): void {

  this.counts = {

    all: this.allLoans.length,

    pending: this.allLoans.filter(
      l => l.status === 'AWAITING_AUTHORIZATION'
    ).length,

    approved: this.allLoans.filter(
      l => l.status === 'APPROVED'
    ).length,

    rejected: this.allLoans.filter(
      l => l.status === 'REJECTED'
    ).length

  };

}


  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.selectedImageFile = file;
  }

  arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

onNationalIdInput() {
  const id = this.loanForm.get('nationalId')?.value;
  if (!id || id.length < 6) return;

  this.loanService.fetchApplicantById(id).subscribe({
    next: (res) => {

      this.loanForm.patchValue({
        fullName: res.fullName,
        phoneNumber: res.phoneNumber,
        location: res.location,
       monthlyIncome: res.monthlyIncome || 0,
  monthlyExpenses: res.monthlyExpenses || 0
      });

    },
    error: () => {
      this.submitError = 'Applicant not found.';
    }
  });
}


  private handleLoanStatusResponse(res: any) {
    this.hasActiveLoanCardVisible = res.hasActiveLoan;
    this.activeLoanMessage = res.message;

    if (res.hasActiveLoan) {
      this.showEligibilityCard = false;
      this.loanDecisionMessage = `You have an active loan of KES ${res.activeLoanAmount}. Due amount: KES ${res.dueAmount}`;
      return;
    }

    if (res.eligible) {
      this.loanDecisionMessage = `Loan limit: KES ${res.limit}`;
      this.isEligible = true;
      this.showEligibilityCard = true;
    } else {
      this.loanDecisionMessage = res.reason;
      this.isEligible = false;
      this.showEligibilityCard = true;
    }
  }

  calculateRepaymentPercentage(loan: Loan | null): number {
    if (!loan || !loan.totalRepayableAmount || loan.dueAmount == null) return 0;
    const paid = loan.totalRepayableAmount - loan.dueAmount;
    return Math.min(Math.round((paid / loan.totalRepayableAmount) * 100), 100);
  }

 submitLoan(): void {

  if (this.loanForm.invalid) return;

  this.isSubmitting = true;
  this.submitError = null;
  this.submitSuccess = null;

  // =========================
  // EDIT MODE
  // =========================
  if (this.isEditMode) {
    this.submitLoanFinal();
    return;
  }

  // =========================
  // NEW LOAN APPLICATION
  // =========================
  const nationalId = this.loanForm.value.nationalId;

  this.loanService.checkLoanStatus(nationalId).subscribe({
    next: res => {

      if (res.hasActiveLoan) {
        this.isSubmitting = false;
        this.activeLoanMessage = res.message;
        this.hasActiveLoanCardVisible = true;
        return;
      }

      if (!res.eligible) {
        this.isSubmitting = false;
        this.loanDecisionMessage = res.reason;
        this.showEligibilityCard = true;
        return;
      }

      this.submitLoanFinal();
    },

    error: (err) => {
      this.handleSubmitError(err);
    }
  });
}


submitLoanFinal(): void {
  this.isSubmitting = true;
  this.submitError = null;
  this.submitSuccess = null;

  const formValue = this.loanForm.value;
  const loanId = formValue.id || this.selectedLoan?.id;

  const dueDate = this.calculateDueDate(
    new Date(formValue.applicationDate),
    formValue.duration
  );

  const formData = new FormData();

  // if (this.isEditMode && loanId) {
  //   formData.append('id', loanId.toString());
  // }

  formData.append('applicantName', formValue.fullName);
  formData.append('interestRate', '0');
  formData.append('interestRate', formValue.interestRate ?? 0);
formData.append('riskScore', formValue.riskScore ?? 0);
  formData.append('idNo', formValue.nationalId);
  formData.append('phoneNumber', formValue.phoneNumber);
  formData.append('email', formValue.email || '');
  formData.append('location', formValue.location);
  formData.append('amount', formValue.amount);
  formData.append('duration', formValue.duration);
  formData.append('monthlyIncome', formValue.monthlyIncome);
  formData.append('monthlyExpenses', formValue.monthlyExpenses);
  formData.append('applicationDate', new Date(formValue.applicationDate).toISOString().split('T')[0]);
  formData.append('dueDate', dueDate.toISOString().split('T')[0]);

  if (this.selectedImageFile) {
    formData.append('file', this.selectedImageFile);
  }

  const request$ = this.isEditMode && loanId
    ? this.loanService.updateLoanWithImage(loanId, formData)
    : this.loanService.addLoanWithImage(formData);

  request$.subscribe({
    next: (res) => {
      console.log("SUCCESS:", res);

      this.finishSubmission(
        this.isEditMode
          ? 'Loan updated successfully!'
          : 'Loan submitted successfully!'
      );
      this.loadNotifications();
    },
    error: (err) => {
      console.error("FAILED:", err);
      this.handleSubmitError(err);
    }
  });
}


downloadReceipt(repayment: any) {
  const doc = new jsPDF();

  const loan = this.selectedLoan;
  const pageWidth = doc.internal.pageSize.getWidth();

  const FONT = 'helvetica';

  // ===== HEADER =====
  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont(FONT, 'bold');
  doc.setFontSize(16);
  doc.text('CrediBank', 14, 12);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.text('Official Payment Receipt', 14, 20);

  doc.text(`Receipt No: RCPT-${Date.now()}`, pageWidth - 70, 12);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 70, 20);

  doc.setTextColor(0, 0, 0);

  // ===== CUSTOMER DETAILS =====
  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);
  doc.text('Customer Details', 14, 40);

  doc.setDrawColor(200);
  doc.line(14, 42, pageWidth - 14, 42);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${loan?.applicantName || '-'}`, 14, 50);
  doc.text(`National ID: ${loan?.nationalId || '-'}`, 14, 56);

  // ===== LOAN DETAILS =====
  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);
  doc.text('Loan Information', 14, 70);
  doc.line(14, 72, pageWidth - 14, 72);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);

  doc.text(`Loan Amount:`, 14, 80);
  doc.text(`KES ${(loan?.amount ?? 0).toLocaleString()}`, pageWidth - 60, 80);

  doc.text(`Total Payable:`, 14, 86);
  doc.text(`KES ${(loan?.totalRepayableAmount ?? 0).toLocaleString()}`, pageWidth - 60, 86);

  // ===== PAYMENT DETAILS =====
  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);
  doc.text('Payment Details', 14, 100);
  doc.line(14, 102, pageWidth - 14, 102);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);

  doc.text(`Amount Paid:`, 14, 110);
  doc.setFont(FONT, 'bold');
  doc.text(`KES ${(repayment?.amount ?? 0).toLocaleString()}`, pageWidth - 60, 110);

  doc.setFont(FONT, 'normal');
  doc.text(`Payment Method:`, 14, 118);
  doc.text(`${repayment?.method || '-'}`, pageWidth - 60, 118);

  doc.text(`Payment Date:`, 14, 126);
  doc.text(`${repayment?.date ? new Date(repayment.date).toLocaleDateString() : '-'}`, pageWidth - 60, 126);

  // ===== BALANCE =====
  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);
  doc.text('Loan Balance', 14, 140);
  doc.line(14, 142, pageWidth - 14, 142);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);

  doc.text(`Remaining Balance:`, 14, 150);
  doc.setFont(FONT, 'bold');
  doc.text(`KES ${(loan?.dueAmount ?? 0).toLocaleString()}`, pageWidth - 60, 150);

  doc.setFont(FONT, 'normal');

  // ===== FOOTER =====
  doc.setDrawColor(200);
  doc.line(14, 170, pageWidth - 14, 170);

  doc.setFontSize(9);
  doc.setTextColor(100);

  doc.text(
    'This is a system generated receipt and does not require a signature.',
    14,
    180
  );

  doc.text(
    'For inquiries, contact support@credibank.com | +254 722 6122 66',
    14,
    186
  );

  doc.setTextColor(0);

  // ===== SAVE =====
  doc.save(`Receipt_${loan?.nationalId || 'NA'}_${Date.now()}.pdf`);
}

openNewLoanModal() {
  this.isEditMode = false;
  this.showEligibilityCard = false;
  this.loanForm.reset();
  this.imageSrc = null;

  const modalElement = document.getElementById('newLoanModal');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }
}

  calculateDueDate(startDate: Date, duration: string): Date {
    const date = new Date(startDate);
    switch (duration) {
      case '2 weeks': date.setDate(date.getDate() + 14); break;
      case '1 month': date.setMonth(date.getMonth() + 1); break;
      case '2 months': date.setMonth(date.getMonth() + 2); break;
      case '3 months': date.setMonth(date.getMonth() + 3); break;
    }
    return date;
  }

  toggleForm(): void {
    this.isEditMode = false;
    this.showEligibilityCard = false;
    this.loanForm.reset();
    this.showCreateForm = !this.showCreateForm;
  }

finishSubmission(message: string): void {
  this.isSubmitting = false;
  this.submitSuccess = message;

  // Close modals
  ['editLoanModal', 'newLoanModal'].forEach(modalId => {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const modalInstance =
        bootstrap.Modal.getInstance(modalElement) ||
        new bootstrap.Modal(modalElement);
      modalInstance.hide();
    }
  });

  setTimeout(() => {
    this.submitSuccess = null;
    this.showCreateForm = false;
    this.isEditMode = false;
    this.selectedLoan = null;
    this.imageSrc = null;
    this.loanForm.reset();
    this.loadLoans();
  }, 1200);
}

  private handleSubmitError(err: any) {
    this.isSubmitting = false;
    if (err?.error?.message) this.submitError = `Error: ${err.error.message}`;
    else if (typeof err === 'string') this.submitError = err;
    else this.submitError = 'Loan submission failed. Please try again.';
  }

private showErrorMessage(msg: string) {

  this.errorMessage = msg;

  setTimeout(() => {

    this.errorMessage = '';

  }, 5000);

}

private showSuccessMessage(msg: string) {

  this.successMessage = msg;

  setTimeout(() => {

    this.successMessage = '';

  }, 4000);

}

  // --- Additional Methods for editing, deleting, approving, rejecting, reminders, etc. ---

editLoan(loan: Loan) {
  this.isEditMode = true;
  this.selectedLoan = { ...loan };

  this.imageSrc = loan.userImageUrl
    ? 'http://localhost:8080/' + loan.userImageUrl
    : null;

  this.loanForm.patchValue({
    id: loan.id,
    nationalId: loan.nationalId,
    fullName: loan.applicantName,
    phoneNumber: loan.phoneNumber,
    location: loan.location,
     email: (loan as any).email ?? '',

    // ✅ FIXED MAPPING
    monthlyIncome: (loan as any).monthlyIncome ?? (loan as any).income ?? 0,
    monthlyExpenses: (loan as any).monthlyExpenses ?? (loan as any).expenses ?? 0,

    amount: loan.amount,
    applicationDate: loan.applicationDate
      ? new Date(loan.applicationDate).toISOString().split('T')[0]
      : '',
    duration: loan.duration
  });

  const modalElement = document.getElementById('editLoanModal');
  if (modalElement) new bootstrap.Modal(modalElement).show();
}

  cancelEdit() {
    this.isEditMode = false;
    this.selectedLoan = null;
    this.loanForm.reset();
    this.imageSrc = null;
  }

  deleteLoan(id: number) {
    if (confirm('Are you sure you want to delete this loan?')) {
      this.loanService.deleteLoan(id).subscribe(() => this.loadLoans());
    }
  }

approveLoan(loanId: number): void {

  if (this.processingLoanId !== null) {
    return;
  }

  this.processingLoanId = loanId;

  this.loanService.approveLoan(loanId).subscribe({

    next: (updatedLoan) => {

      // Update immediately without reloading everything
      const index = this.allLoans.findIndex(l => l.id === loanId);

      if (index !== -1) {

        this.allLoans[index] = {
          ...this.allLoans[index],
          ...updatedLoan,
          status: 'APPROVED'
        };

      }

      this.loans = [...this.allLoans];

      this.processingLoanId = null;

      this.loadNotifications();

      this.transactionService.refreshTransactions();

      this.updateCounts();

      this.showSuccessMessage(
        'Loan approved successfully.'
      );

    },

    error: (err) => {

      console.error(err);

      this.processingLoanId = null;

      this.showErrorMessage(
        err?.error?.message ||
        'Unable to approve loan.'
      );

    }

  });

}

  refundRejectedLoanAmount(id: number) {
    this.loanService.refundLoan(id).subscribe({
      next: () => console.log(`Loan ID ${id} refunded.`),
      error: err => console.error('Refund failed:', err)
    });
  }

  searchLoans() { this.loans = this.applySearchFilter([...this.allLoans]); }


filterLoans(status: string) {
  this.searchTerm = '';  // clear search
  let filteredLoans: Loan[];

  if (status === 'all') {
    filteredLoans = [...this.allLoans];
  } else {
    const statusMap: any = {
      pending: 'AWAITING_AUTHORIZATION',
      approved: 'APPROVED',
      rejected: 'REJECTED'
    };
    filteredLoans = this.allLoans.filter(l => l.status === statusMap[status]);
  }

  this.loans = filteredLoans;
}

trackByLoanId(index: number, loan: Loan) {
  return loan.id;
}

  private applySearchFilter(loans: Loan[]) {
    const term = this.searchTerm.toLowerCase();
    return loans.filter(loan =>
      this.searchType === 'name'
        ? loan.applicantName?.toLowerCase().includes(term)
        : (loan.nationalId ?? '').toString().includes(term)
    );
  }

  onSearchIconClick() {
    if (this.searchTerm) { this.searchTerm = ''; this.searchLoans(); }
  }

  startLongPress() { this.longPressTimeout = setTimeout(() => { this.searchTerm = ''; this.searchLoans(); }, 600); }
  endLongPress() { clearTimeout(this.longPressTimeout); }

  handleEligibilityDismiss() {
    const card = document.querySelector('.loan-feedback-card');
    card?.classList.add('animate__fadeOutUp');
    setTimeout(() => (this.showEligibilityCard = false), 600);
  }

  accountsApplication() { 
    this.router.navigate(['/app/accountsopening']); 
  }

viewCustomerDetails(loan: Loan) {
  this.selectedLoan = { ...loan };

this.loanService.getLoanTransactions(loan.id!).subscribe({
  next: txs => {
    this.selectedLoan!.repayments = txs;
  },
  error: () => {
    this.selectedLoan!.repayments = [];
  }
});

  const modalElement = document.getElementById('customerDetailsModal');
  if (modalElement) new bootstrap.Modal(modalElement).show();
}

goToCustomerDetails(loan: Loan) {
  this.router.navigate(['/app/customer-details'], {
    queryParams: { loanId: loan.id }
  });
}

  sendReminder(loanId: number) {
    if (!loanId) return;

    this.isSubmitting = true;
    this.submitSuccess = '';
    this.submitError = '';

    this.loanService.sendReminder(loanId).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = 'Reminder sent successfully!';
        timer(5000).subscribe(() => this.submitSuccess = '');
      },
      error: () => {
        this.isSubmitting = false;
        this.submitError = 'Failed to send reminder. Please try again.';
        timer(5000).subscribe(() => this.submitError = '');
      }
    });
  }

  clearLoan(loanId: number) {
    if (!confirm("Are you sure you want to clear this loan? This action is irreversible.")) return;
 this.router.navigate(['/app/repayment-form'], {
      queryParams: { loanId }
    });
  }
}
