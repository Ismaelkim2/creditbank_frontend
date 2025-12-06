import { Component, OnInit } from '@angular/core';
import { AccountService } from '../services/account.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css']
})
export class AccountsComponent implements OnInit {
  accounts: any[] = [];
  filteredAccounts: any[] = [];
  searchTerm: string = '';
  loading = true;
  error = '';
  selectedAccount: any = null;
  loanDetails: any[] = [];
  showDetailsModal = false;

  constructor(
    private accountService: AccountService,
    private router: Router

 ) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.accountService.getAllAccounts().subscribe({
      next: (data) => {
        this.accounts = data;
        this.filteredAccounts = data; // initialize filtered list
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load accounts';
        this.loading = false;
      }
    });
  }

  filterAccounts(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredAccounts = this.accounts.filter(acc =>
      acc.fullName.toLowerCase().includes(term) ||
      acc.accountNumber.toLowerCase().includes(term) ||
      acc.nationalId.toLowerCase().includes(term) ||
      acc.phoneNumber.toLowerCase().includes(term)
    );
  }

  viewDetails(acc: any): void {
    this.accountService.getAccountDetailsByNationalId(acc.nationalId).subscribe({
      next: (accountData) => {
        this.selectedAccount = accountData;
        this.accountService.getLoanDetailsByNationalId(acc.nationalId).subscribe({
          next: (loanData) => {
            this.loanDetails = loanData;
            this.showDetailsModal = true;
          },
          error: () => { console.error('Failed to load loan details'); }
        });
      },
      error: () => { console.error('Failed to load account details'); }
    });
  }

  deleteAccount(acc: any): void {
    if (confirm(`Are you sure you want to delete account for ${acc.fullName}?`)) {
      this.accountService.deleteAccount(acc.accountNumber).subscribe({
        next: () => {
          // Remove from both main and filtered arrays
          this.accounts = this.accounts.filter(a => a.accountNumber !== acc.accountNumber);
          this.filterAccounts();
          alert('Account deleted successfully.');
        },
        error: () => {
          alert('Failed to delete account.');
        }
      });
    }
  }

  goToAccountRegistration() {
  this.router.navigate(['/account-registration']);
}

clearSearch() {
  this.searchTerm = '';
  this.filterAccounts();
}

}
