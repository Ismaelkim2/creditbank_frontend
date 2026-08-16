import { Component, OnInit } from '@angular/core';
import { AccountService } from '../services/account.service';
import { Router } from '@angular/router';

interface AccountDocument {
    id: number;
    documentType: string;
    originalName: string;
    storedName: string;
    filePath: string;
    fileSize: number;
    fileUrl: string;
    uploadedAt: string;
    source: 'ACCOUNT' | 'ORGANIZATION';
}

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
documents: AccountDocument[] = [];
selectedPortfolio = 'ALL';
  filteredAccounts: any[] = [];
  searchTerm: string = '';
  loading = true;
  error = '';
  selectedAccount: any = null;
  loanDetails: any[] = [];
  showDetailsModal = false;

  showLoanSummary = false;

  selectedCategory = 'ALL';

  constructor(
    private accountService: AccountService,
    private router: Router

 ) {}

  ngOnInit(): void {
    this.loadAccounts();
  }


filterByCategory(category: string): void {

    this.selectedCategory = category;

    if (category === 'ALL') {

        this.filteredAccounts = [...this.accounts];

        return;

    }

    this.filteredAccounts = this.accounts.filter(
        account => account.customerCategory === category
    );

}


loadAccounts(): void {

  this.loading = true;

  this.accountService.getAllAccounts().subscribe({
    next: (data) => {

      console.log(data);   // <-- Add this

      this.accounts = data;
      this.filteredAccounts = [...data];

      this.calculatePortfolio();

      this.loading = false;
    }
  });
}

filterAccounts(): void {

    const term = this.searchTerm.toLowerCase();

    this.filteredAccounts = this.accounts.filter(acc =>

        (acc.fullName || '').toLowerCase().includes(term) ||

        (acc.organizationName || '').toLowerCase().includes(term) ||

        (acc.accountNumber || '').toLowerCase().includes(term) ||

        (acc.nationalId || '').toLowerCase().includes(term) ||

        (acc.phoneNumber || '').toLowerCase().includes(term)

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

viewDetails(account: any): void {

    if (!account || !account.accountNumber) {
        console.error('Invalid account:', account);
        return;
    }

    this.loading = true;

    this.selectedAccount = null;
    this.documents = [];
    this.loanDetails = [];

    console.log(
        'Loading profile for account:',
        account.accountNumber
    );

    this.accountService
        .getCustomerProfile(account.accountNumber)
        .subscribe({

            next: (profile: any) => {

                console.log(
                    '========== CUSTOMER PROFILE =========='
                );

                console.log(profile);

                console.log(
                    'ACCOUNT NUMBER:',
                    profile?.accountNumber
                );

                console.log(
                    'DOCUMENTS RETURNED:',
                    profile?.documents
                );

                console.log(
                    'DOCUMENT COUNT:',
                    profile?.documents?.length || 0
                );

                console.log(
                    '======================================'
                );


                // =============================================
                // STORE PROFILE
                // =============================================

                this.selectedAccount = profile;


                // =============================================
                // STORE LOANS
                // =============================================

                this.loanDetails =
                    profile?.loans || [];


                // =============================================
                // STORE DOCUMENTS
                // =============================================

                this.documents =
                    Array.isArray(profile?.documents)
                        ? profile.documents
                        : [];


                // =============================================
                // ALSO ATTACH TO SELECTED ACCOUNT
                // =============================================

                this.selectedAccount.documents =
                    this.documents;


                // =============================================
                // OPEN MODAL
                // =============================================

                this.showLoanSummary = false;

                this.showDetailsModal = true;

                this.loading = false;
            },

            error: (error) => {

                console.error(
                    'Failed to load customer profile:',
                    error
                );

                console.error(
                    'Backend response:',
                    error?.error
                );

                this.documents = [];

                this.loading = false;

                alert(
                    'Unable to load the complete customer profile.'
                );
            }

        });
}

getDocumentUrl(document: AccountDocument): string {

    if (!document) {
        return '';
    }

    return document.fileUrl || '';
}

getDocumentIcon(type: string): string {

    const documentType =
        (type || '').toUpperCase();

    if (
        documentType.includes('PHOTO') ||
        documentType.includes('IMAGE')
    ) {
        return 'bi bi-image';
    }

    if (
        documentType.includes('PDF')
    ) {
        return 'bi bi-file-earmark-pdf';
    }

    if (
        documentType.includes('ID') ||
        documentType.includes('PASSPORT')
    ) {
        return 'bi bi-person-vcard';
    }

    if (
        documentType.includes('SIGNATURE')
    ) {
        return 'bi bi-pen';
    }

    if (
        documentType.includes('KRA') ||
        documentType.includes('TAX')
    ) {
        return 'bi bi-receipt';
    }

    if (
        documentType.includes('ADDRESS')
    ) {
        return 'bi bi-house';
    }

    return 'bi bi-file-earmark-text';
}


formatFileSize(size: number): string {

    if (!size || size <= 0) {
        return 'Unknown size';
    }

    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

viewDocument(document: AccountDocument): void {

    const url = this.getDocumentUrl(document);

    if (!url) {

        alert(
            'Document URL is not available.'
        );

        return;
    }

    window.open(
        url,
        '_blank'
    );
}

closeDetailsModal(): void {

    this.showDetailsModal = false;

    this.selectedAccount = null;

    this.loanDetails = [];

    this.showLoanSummary = false;
}

getAccountStatusClass(status: string): string {

    switch ((status || '').toUpperCase()) {

        case 'ACTIVE':
            return 'bg-success';

        case 'DORMANT':
            return 'bg-warning text-dark';

        case 'CLOSED':
            return 'bg-danger';

        default:
            return 'bg-secondary';
    }
}

getAccountStatusIcon(status: string): string {

    switch ((status || '').toUpperCase()) {

        case 'ACTIVE':
            return 'bi-check-circle-fill';

        case 'DORMANT':
            return 'bi-moon-stars-fill';

        case 'CLOSED':
            return 'bi-lock-fill';

        default:
            return 'bi-question-circle-fill';
    }
}

getApprovalStatusClass(status: string): string {

    switch ((status || '').toUpperCase()) {

        case 'APPROVED':
            return 'bg-success';

        case 'PENDING':
            return 'bg-warning text-dark';

        case 'REJECTED':
            return 'bg-danger';

        default:
            return 'bg-secondary';
    }
}

getComplianceClass(status: string): string {

    switch ((status || '').toUpperCase()) {

        case 'APPROVED':
        case 'VERIFIED':
        case 'COMPLETED':
            return 'bg-success';

        case 'PENDING':
        case 'IN_PROGRESS':
            return 'bg-warning text-dark';

        case 'REJECTED':
        case 'FAILED':
            return 'bg-danger';

        default:
            return 'bg-secondary';
    }
}

getRiskClass(risk: string): string {

    switch ((risk || '').toUpperCase()) {

        case 'LOW':
            return 'bg-success';

        case 'MEDIUM':
            return 'bg-warning text-dark';

        case 'HIGH':
        case 'CRITICAL':
            return 'bg-danger';

        default:
            return 'bg-secondary';
    }
}

formatDocumentType(type: string): string {

    if (!type) {
        return 'Document';
    }

    return type
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
}


getAccountImage(account: any): string | null {

  if (!account) {
    return null;
  }

  if (account.imageUrl && account.imageUrl.trim() !== '') {
    return account.imageUrl;
  }

  if (
    account.organizationImageUrl &&
    account.organizationImageUrl.trim() !== ''
  ) {
    return account.organizationImageUrl;
  }

  return null;
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

  const img = event.target as HTMLImageElement;

  console.error('IMAGE FAILED TO LOAD:', img.src);

  img.style.display = 'none';

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
