import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { timer } from 'rxjs';

import { Loan } from '../../models/loan.model';
import { Account } from '../../models/User.model';
import { LoanService } from '../services/loan.service';
import { AuthService } from '../services/auth-service.service';
import { AccountService } from '../services/account.service';

declare var bootstrap: any;

@Component({
  selector: 'app-loan-list',
  templateUrl: './loan-list.component.html',
  styleUrls: ['./loan-list.component.css']
})
export class LoanListComponent implements OnInit {
  @Input() loans: Loan[] = [];
  allLoans: Loan[] = [];

  searchTerm: string = '';
  searchType: string = 'name';
  showCreateForm = false;
  isEditMode = false;
  selectedLoan: Loan | null = null;

  loanDecision: any = null;
  loanDecisionMessage: string = '';
  isEligible: boolean = false;
  showEligibilityCard: boolean = false;
  hasActiveLoanCardVisible: boolean = false;
  activeLoanMessage: string = '';
  isCheckingLoan = false;

  selectedImageFile: File | null = null;
  imageSrc: string | null = null;

  errorMessage: string = '';
  successMessage: string = '';
  submitError: string | null = null;
  submitSuccess: string | null = null;

  isLoading = false;
  isSubmitting = false;

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
    private router: Router,
    private accountService: AccountService
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
    this.initForm();
    this.loadLoans();

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'apply') this.toggleForm();
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
      income: [0],
      expenses: [0]
    });
  }

  loadLoans(): void {
    this.isLoading = true;
    this.loanService.getLoans().subscribe({
      next: data => {
        this.allLoans = data.sort(
          (a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()
        );
        this.loans = [...this.allLoans];

        this.counts = {
          all: this.allLoans.length,
          pending: this.allLoans.filter(l => l.status?.toLowerCase() === 'pending').length,
          approved: this.allLoans.filter(l => l.status?.toLowerCase() === 'approved').length,
          rejected: this.allLoans.filter(l => l.status?.toLowerCase() === 'rejected').length
        };
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.showErrorMessage('Failed to load loans.');
      }
    });
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

onNationalIdInput(): void {
  // Prevent unnecessary API calls when navigating to page
  if (!this.loanForm.get('nationalId')?.dirty) return;

  const nationalId = this.loanForm.get('nationalId')?.value;
  if (!nationalId || nationalId.length < 4) return;

  this.isLoading = true;
  this.showError = false;

  this.accountService.getAccountDetailsByNationalId(nationalId).subscribe({
    next: account => {
      this.account = account;
      this.isLoading = false;
      this.loanForm.patchValue({
        fullName: account.fullName,
        phoneNumber: account.phoneNumber,
        location: account.location || '',
        income: account.income || 0,
        expenses: account.expenses || 0
      });
      this.imageSrc = account.image
        ? 'data:image/jpeg;base64,' + this.arrayBufferToBase64(account.image)
        : null;
    },
    error: () => {
      this.account = null;
      this.imageSrc = null;
      this.showError = true;
      this.isLoading = false;
    }
  });

  this.loanService.checkLoanStatus(nationalId).subscribe({
    next: res => this.handleLoanStatusResponse(res)
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
    const nationalId = this.loanForm.value.nationalId;
    this.isSubmitting = true;
    this.submitError = null;
    this.submitSuccess = null;

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
      error: err => this.handleSubmitError(err)
    });
  }

  submitLoanFinal(): void {
    const formValue = this.loanForm.value;
    const dueDate = this.calculateDueDate(new Date(formValue.applicationDate), formValue.duration);
    const formData = new FormData();

    formData.append('applicantName', formValue.fullName);
    formData.append('idNo', formValue.nationalId?.toString() || '');
    formData.append('phoneNumber', formValue.phoneNumber?.toString() || '');
    formData.append('location', formValue.location || '');
    formData.append('amount', formValue.amount.toString());
    formData.append('duration', formValue.duration);
    formData.append('monthlyIncome', formValue.income?.toString() || '0');
    formData.append('monthlyExpenses', formValue.expenses?.toString() || '0');
    formData.append('applicationDate', new Date(formValue.applicationDate).toISOString().split('T')[0]);
    formData.append('dueDate', dueDate.toISOString().split('T')[0]);

    if (this.selectedImageFile) formData.append('file', this.selectedImageFile);

    const submitAction = this.isEditMode && this.selectedLoan
      ? this.loanService.updateLoanWithImage(this.selectedLoan.id, formData)
      : this.loanService.addLoanWithImage(formData);

    submitAction.subscribe({
      next: () => this.finishSubmission(this.isEditMode ? 'Loan updated successfully!' : 'Loan submitted successfully!'),
      error: err => this.handleSubmitError(err)
    });
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

    const modalElement = document.getElementById('editLoanModal');
    if (modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      modalInstance?.hide();
    }

    setTimeout(() => {
      this.submitSuccess = null;
      this.showCreateForm = false;
      this.isEditMode = false;
      this.selectedLoan = null;
      this.imageSrc = null;
      this.loadLoans();
    }, 1500);
  }

  private handleSubmitError(err: any) {
    this.isSubmitting = false;
    if (err?.error?.message) this.submitError = `Error: ${err.error.message}`;
    else if (typeof err === 'string') this.submitError = err;
    else this.submitError = 'Loan submission failed. Please try again.';
  }

  private showErrorMessage(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 6000);
  }

  private showSuccessMessage(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 6000);
  }

  // --- Additional Methods for editing, deleting, approving, rejecting, reminders, etc. ---

  editLoan(loan: Loan) {
    this.isEditMode = true;
    this.selectedLoan = { ...loan };
    this.imageSrc = loan.userImageUrl ? 'http://localhost:8080/' + loan.userImageUrl : null;

    this.loanForm.patchValue({
      id: loan.id,
      nationalId: loan.idNo,
      fullName: loan.applicantName,
      phoneNumber: loan.phoneNumber,
      location: loan.location,
      income: loan.income,
      expenses: loan.expenses,
      amount: loan.amount,
      applicationDate: loan.applicationDate ? new Date(loan.applicationDate).toISOString().split('T')[0] : '',
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

  approveLoan(loanId: number) {
    this.loanService.updateLoanStatus(loanId, 'approved').subscribe({
      next: () => { this.loadLoans(); this.showSuccessMessage('Loan approved successfully!'); },
      error: () => this.showErrorMessage('Error approving loan')
    });
  }

  rejectLoan(id: number) {
    this.loanService.updateLoanStatus(id, 'rejected').subscribe({
      next: () => { this.refundRejectedLoanAmount(id); this.loadLoans(); },
      error: () => this.showErrorMessage('Error rejecting loan')
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
    const filteredLoans = status === 'all'
      ? [...this.allLoans]
      : this.allLoans.filter(l => l.status?.toLowerCase() === status.toLowerCase());
    this.loans = this.applySearchFilter(filteredLoans);
  }

  private applySearchFilter(loans: Loan[]) {
    const term = this.searchTerm.toLowerCase();
    return loans.filter(loan =>
      this.searchType === 'name'
        ? loan.applicantName?.toLowerCase().includes(term)
        : (loan.idNo ?? '').toString().includes(term)
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

  accountsApplication() { this.router.navigate(['/account-registration']); }

  viewCustomerDetails(loan: Loan) {
    this.selectedLoan = { ...loan };

    this.loanService.getLoanTransactions(loan.id!).subscribe({
      next: txs => this.selectedLoan!['transactions'] = txs,
      error: () => this.selectedLoan!['transactions'] = []
    });

    const modalElement = document.getElementById('customerDetailsModal');
    if (modalElement) new bootstrap.Modal(modalElement).show();
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
    // if (!confirm("Are you sure you want to clear this loan? This action is irreversible.")) return;

    this.router.navigate(['/repayment-form'], {
      queryParams: { loanId }
    });
  }
}
