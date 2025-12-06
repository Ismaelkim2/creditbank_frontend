import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth-service.service';
import { Loan } from '../../models/loan.model';
import { DataServiceService } from '../services/data.service';
import { AccountService } from '../services/account.service';

@Component({
  selector: 'app-debtloans',
  templateUrl: './debtloans.component.html',
  styleUrls: ['./debtloans.component.css']
})
export class DebtloansComponent implements OnInit {
  loans: Loan[] = [];
  loading = false;
  errorMessage = '';
  private nationalId?: string;

  accountNumber: string = '';

  // ✅ Summary values for live cards
  totalLoans = 0;
  clearedLoans = 0;
  activeLoans = 0;
  totalDue = 0;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private dataService: DataServiceService,
    private accountService: AccountService 
  ) {}

ngOnInit(): void {
  const user = this.authService.getUser();
  this.nationalId = user?.nationalId;

  if (!this.nationalId) {
    this.errorMessage = '⚠️ Unable to identify your ID number.';
    return;
  }

  // ✅ Fetch account number from AccountService
  this.accountService.getAccountDetailsByNationalId(this.nationalId).subscribe({
    next: (accountData) => {
      this.accountNumber = accountData?.accountNumber || '';
      console.log('✅ Account number fetched:', this.accountNumber);
    },
    error: (err) => {
      console.error('❌ Failed to fetch account number:', err);
    }
  });

  this.fetchLoansByNationalId(this.nationalId);
}


  refreshLoans(): void {
    if (!this.nationalId) return;
    this.fetchLoansByNationalId(this.nationalId);
  }

  private fetchLoansByNationalId(nationalId: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<Loan[]>(`http://localhost:8080/api/loans/by-idno/${nationalId}`).subscribe({
      next: (data) => {
        // ✅ Sort loans by most recent
        this.loans = (data || []).sort((a, b) => {
          const dateA = new Date(a.applicationDate || '').getTime();
          const dateB = new Date(b.applicationDate || '').getTime();
          return dateB - dateA;
        });

        // ✅ Update summary data live
        this.calculateSummary();

        this.loading = false;

        if (this.loans.length === 0) {
          this.errorMessage = 'No loans found for your account.';
        }
      },
      error: (err) => {
        console.error('❌ Error fetching loans:', err);
        this.errorMessage = 'Failed to load your loan records. Please try again later.';
        this.loading = false;
      }
    });
  }

  private calculateSummary(): void {
    this.totalLoans = this.loans.length;
    this.clearedLoans = this.loans.filter(l => l.dueAmount === 0).length;
    this.activeLoans = this.loans.filter(l => (l.dueAmount ?? 0) > 0).length;
    this.totalDue = this.loans.reduce((acc, l) => acc + (l.dueAmount ?? 0), 0);
  }

payLoan(loan: Loan): void {
  const user = this.authService.getUser();

  const repaymentPayload = {
    loanId: loan.id,
    idNo: loan.idNo || user?.nationalId,
    phoneNumber: loan.phoneNumber || user?.phoneNumber,
    location: loan.location || 'Branch',
    accountNumber: this.accountNumber || user?.accountNumber || '' // ✅ ensure it's included
  };

  console.log('✅ Sending repayment data:', repaymentPayload);

  this.dataService.setRepaymentData(repaymentPayload);
  this.router.navigate(['/repayment-form']);
}


}
