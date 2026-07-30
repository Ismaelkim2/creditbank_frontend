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
  activeCount = 0;
dormantCount = 0;
closedAccount = 0;
selectedPortfolio = 'ALL';
  filteredAccounts: any[] = [];
  searchTerm: string = '';
  loading = true;
  error = '';
  selectedAccount: any = null;
  loanDetails: any[] = [];
  showDetailsModal = false;

  showLoanSummary = false;

  constructor(
    private accountService: AccountService,
    private router: Router

 ) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

loadAccounts(): void {

  this.loading = true;

  this.accountService.getAllAccounts().subscribe({
    next: (data) => {

      this.accounts = data;
      this.filteredAccounts = [...data];

      this.calculatePortfolio();

      this.loading = false;
    },

    error: () => {

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

calculatePortfolio(): void {

  this.activeCount = this.accounts.filter(
      a => a.accountStatus === 'ACTIVE'
  ).length;

  this.closedAccount = this.accounts.filter(
      a => a.accountStatus === 'CLOSED'
  ).length;

  this.dormantCount = this.accounts.filter(
      a => a.accountStatus === 'DORMANT'
  ).length;
}


filterByPortfolio(type: string): void {

    this.selectedPortfolio = type;

    if (type === 'ALL') {

        this.filteredAccounts = [...this.accounts];

        return;
    }

    this.filteredAccounts = this.accounts.filter(
        a => a.accountStatus === type
    );
}

  viewDetails(acc: any): void {

    this.showLoanSummary = false;

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

closeAccount(acc: any): void {

    const reason = prompt(
        `Enter reason for closing ${acc.fullName}'s account:`
    );

    if (reason === null) {
        return;
    }

    this.accountService.closeAccount(acc.accountNumber, reason)
        .subscribe({

            next: () => {

                alert("Account closed successfully.");

                this.loadAccounts();

            },

            error: () => {

                alert("Unable to close account.");

            }

        });

}

  goToAccountRegistration() {
  this.router.navigate(['/app/accountsopening']);
}

clearSearch() {
  this.searchTerm = '';
  this.filterAccounts();
}

onImageError(event: Event): void {
  const imgElement = event.target as HTMLImageElement;

  // fallback image
  imgElement.src = 'assets/default-user.png';
}

getStatusClass(status: string): string {
  if (!status) return '';

  switch (status.toLowerCase()) {
    case 'approved':
      return 'badge-approved';

    case 'pending':
      return 'badge-pending';

    case 'rejected':
      return 'badge-rejected';

    case 'partial':
      return 'badge-partial';

    case 'repaid':
    case 'paid':
      return 'badge-repaid';

    default:
      return 'badge-secondary';
  }
}


}
