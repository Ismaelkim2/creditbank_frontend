import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AccountService } from '../services/account.service';
import { AuthService } from '../services/auth-service.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Transaction {
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  date: string;
  debit?: number;
  credit?: number;
  balanceAfter?: number;
}

interface UserDetails {
  name: string;
  email: string;
  accountNumber: string;
  profileImage: string;
}

@Component({
  selector: 'app-user-statement',
  templateUrl: './user-statement.component.html',
  styleUrls: ['./user-statement.component.css']
})
export class UserStatementComponent implements OnInit {
  user: UserDetails = {
    name: '',
    email: '',
    accountNumber: '',
    profileImage: 'assets/default-user.png'
  };

  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  isLoading = true;

  startDate!: string;
  endDate!: string;
  filterType = 'all';
  selectedNationalId: string = '';
  searchNationalId: string = '';

  constructor(
    private accountService: AccountService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

ngOnInit(): void {
  const today = new Date().toISOString().substring(0, 10);
  this.startDate = today;
  this.endDate = today;

  // Auto-load statement for admin (self) or via route param
  const storedUser = this.authService.getUser();
  this.selectedNationalId = storedUser?.nationalId || '';

  this.initializeStatement();
}

/** Initializes statement view (fetch user + transactions) */
private initializeStatement(): void {
  if (!this.selectedNationalId) {
    console.warn('⚠️ No National ID found.');
    this.isLoading = false;
    return;
  }

  this.fetchUserDetails(this.selectedNationalId);
  this.fetchStatements(this.selectedNationalId);
}

 private fetchUserDetails(nationalId: string): void {
  this.accountService.getAccountDetailsByNationalId(nationalId).subscribe({
    next: (data) => {
      this.user = {
        name: data.fullName || 'Unknown User',
        email: data.email || 'user@email.com',
        accountNumber: data.accountNumber || 'XXXX-XXXX-XXXX',
        profileImage: data.imageUrl
          ? `http://localhost:8080/api/accounts/image/${data.nationalId}?t=${Date.now()}`
          : 'assets/default-user.png',
      };
    },
    error: (err) => {
      console.error('❌ Failed to load user details:', err);
      this.user = {
        name: 'Unknown User',
        email: 'user@email.com',
        accountNumber: 'XXXX-XXXX-XXXX',
        profileImage: 'assets/default-user.png',
      };
    },
  });
}


  /** ✅ Fetch user transactions */
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

        const today = this.startDate;
        this.filteredTransactions = this.transactions.filter(txn => {
          const txnDate = new Date(txn.date).toISOString().substring(0, 10);
          return txnDate === today;
        });
      },
      error: (err) => console.error('❌ Failed to fetch statements:', err),
      complete: () => (this.isLoading = false),
    });
  }

  /** ✅ Calculate running balance */
  private calculateRunningBalance(): void {
    let runningBalance = 0;
    this.transactions = this.transactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(txn => {
        runningBalance += txn.credit || 0;
        runningBalance -= txn.debit || 0;
        return { ...txn, balanceAfter: runningBalance };
      });
  }

  /** ✅ Apply date/type filters */
  onFilter(): void {
    const start = this.startDate;
    const end = this.endDate;

    this.filteredTransactions = this.transactions.filter(txn => {
      const txnDate = new Date(txn.date).toISOString().substring(0, 10);
      const inDateRange =
        (!start || txnDate >= start) && (!end || txnDate <= end);
      const typeMatch =
        this.filterType === 'all' || txn.type === this.filterType;
      return inDateRange && typeMatch;
    });
  }

// Called when admin searches another user by ID
loadAdminUserStatement(): void {
  const id = this.searchNationalId.trim();
  if (!id) return;

  this.selectedNationalId = id;
  this.isLoading = true; // Reset loader
  this.initializeStatement();
}

exportPDF(): void {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [200, 16, 46];
  const textColor: [number, number, number] = [60, 60, 60];
  const generatedOn = new Date().toLocaleString();

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('CREDITBANK STATEMENT', 70, 18);

  doc.setTextColor(...textColor);
  let y = 40;
  doc.setFontSize(12);
  doc.text(`Name: ${this.user.name}`, 14, y);
  doc.text(`Email: ${this.user.email}`, 14, y + 6);
  doc.text(`Account: ${this.user.accountNumber}`, 14, y + 12);
  doc.text(`Statement Period: ${this.startDate} to ${this.endDate}`, 14, y + 18);
  doc.text(`Generated On: ${generatedOn}`, 14, y + 24);

  if (this.filteredTransactions.length) {
    // Dynamically create header based on selected type
    const headers = ['Date', 'Description'];
    if (this.showDebitColumn) headers.push('Debit (KES)');
    if (this.showCreditColumn) headers.push('Credit (KES)');
    headers.push('Balance (KES)');

    // Dynamically create body
    const body = this.filteredTransactions.map(txn => {
      const row: (string | number)[] = [
        new Date(txn.date).toLocaleDateString(),
        txn.description.replace('KES', 'KES ')
      ];
      if (this.showDebitColumn) row.push(txn.debit ? txn.debit.toLocaleString() : '-');
      if (this.showCreditColumn) row.push(txn.credit ? txn.credit.toLocaleString() : '-');
      row.push(txn.balanceAfter?.toLocaleString() || '0.00');
      return row;
    });

    autoTable(doc, {
      startY: y + 34,
      head: [headers],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], halign: 'center' },
      bodyStyles: { textColor: textColor },
      styles: { fontSize: 10 },
    });
  } else {
    doc.text('No transactions found for the selected period.', 14, y + 34);
  }

  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('This is a system-generated statement. No signature is required.', 14, pageHeight - 10);

  doc.save(`Statement_${this.user.accountNumber}_${this.startDate}_to_${this.endDate}.pdf`);
}


  // Returns whether to show the Debit column
get showDebitColumn(): boolean {
  return this.filterType === 'all' || this.filterType === 'debit';
}

// Returns whether to show the Credit column
get showCreditColumn(): boolean {
  return this.filterType === 'all' || this.filterType === 'credit';
}


 
  /** ✅ Role Checkers */
  get isApplicant(): boolean {
    return this.authService.getRole() === 'APPLICANT';
  }

  get isAdmin(): boolean {
    return this.authService.getRole() === 'ADMIN';
  }
}
