import { Component, OnInit, OnDestroy } from '@angular/core';
import { TransactionService, Transaction } from '../services/services/transaction.service';
import { Subscription, of } from 'rxjs';
import { catchError, finalize, retry } from 'rxjs/operators';
import jsPDF from 'jspdf';

@Component({
selector: 'app-transactions',
templateUrl: './transactions.component.html',
styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit, OnDestroy {

private transactionSub!: Subscription;

transactions: Transaction[] = [];
filteredTransactions: Transaction[] = [];
paginatedTransactions: Transaction[] = [];

loading = false;
errorMessage = '';

selectedTransaction: Transaction | null = null;
showTransactionModal = false;

searchQuery = '';

selectedStatus:
'All'
|'COMPLETED'
|'PENDING'
|'FAILED'
='All';
selectedType: 'All' | 'Credit' | 'Debit' = 'All';
selectedChannel:
'All'
|'MPESA'
|'BANK'
|'ATM'
|'BRANCH'
|'ONLINE'
|'MOBILE_APP'
|'USSD'
=
'All';

currentPage = 1;
pageSize = 10;
totalPages = 1;

filteredVolume = 0;
filteredCredits = 0;
filteredDebits = 0;
filteredFailed = 0;

successRate = 0;

constructor(private transactionService: TransactionService) {}

ngOnInit(): void {

this.loadTransactions();

this.transactionSub = this.transactionService
.getTransactionUpdates()
.subscribe(() => {
this.loadTransactions();
});

}

ngOnDestroy(): void {
if (this.transactionSub) {
this.transactionSub.unsubscribe();
}
}

loadTransactions(): void {

this.loading = true;

this.transactionService.getAllTransactions()
.pipe(
retry(2),
catchError(() => of([])),
finalize(() => this.loading = false)
)
.subscribe((transactions: Transaction[]) => {

this.transactions = transactions
.map(tx => ({
...tx,
amount: tx.amount || 0,
client: tx.client || 'Unknown',
date: tx.date ? new Date(tx.date) : new Date()
}))
.sort((a,b)=>b.date.getTime()-a.date.getTime());

this.applyFilters();

});

}

applyFilters(): void {

const search = this.searchQuery.toLowerCase();

this.filteredTransactions = this.transactions.filter(tx =>

(this.selectedStatus === 'All' || tx.status === this.selectedStatus) &&
(this.selectedType === 'All' || tx.type === this.selectedType) &&
(this.selectedChannel === 'All' || tx.channel === this.selectedChannel) &&

(
(tx.client ?? '')
.toLowerCase()
.includes(search) ||
tx.id.toString().includes(search)
)

);

this.calculateInsights();
this.setupPagination();

}

setupPagination(): void {

this.totalPages = Math.ceil(this.filteredTransactions.length / this.pageSize) || 1;

this.currentPage = 1;

this.updatePage();

}

updatePage(): void {

const start = (this.currentPage - 1) * this.pageSize;
const end = start + this.pageSize;

this.paginatedTransactions = this.filteredTransactions.slice(start, end);

}

nextPage(): void {

if (this.currentPage < this.totalPages) {
this.currentPage++;
this.updatePage();
}

}

previousPage(): void {

if (this.currentPage > 1) {
this.currentPage--;
this.updatePage();
}

}

calculateInsights(): void {

this.filteredVolume = this.filteredTransactions
.reduce((sum, tx) => sum + tx.amount, 0);

this.filteredCredits = this.filteredTransactions
.filter(tx => tx.type === 'Credit').length;

this.filteredDebits = this.filteredTransactions
.filter(tx => tx.type === 'Debit').length;

this.filteredFailed = this.filteredTransactions
.filter(tx => tx.status === 'FAILED').length;

this.calculateSuccessRate();

}


getStatusClass(status: string): string {

  switch (status) {

    // Success
    case 'APPROVED':
    case 'AUTHORIZED':
    case 'POSTED':
    case 'COMPLETED':
    case 'SETTLED':
    case 'RECONCILED':
      return 'bg-success';

    // Processing
    case 'INITIATED':
    case 'RECEIVED':
    case 'VALIDATING':
    case 'VALIDATED':
    case 'PROCESSING':
    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'ON_HOLD':
      return 'bg-warning text-dark';

    // Failed
    case 'FAILED':
    case 'DECLINED':
    case 'REJECTED':
    case 'CANCELLED':
    case 'REVERSED':
    case 'PARTIALLY_REVERSED':
    case 'REFUNDED':
    case 'TIMEOUT':
    case 'EXPIRED':
      return 'bg-danger';

    default:
      return 'bg-secondary';
  }

}

calculateSuccessRate(): void {

const total = this.filteredTransactions.length;

const successful = total - this.filteredFailed;

if (total === 0) {
this.successRate = 0;
return;
}

this.successRate = Math.round((successful / total) * 100);

}

get successfulTransactions(): number {

return this.filteredTransactions.length - this.filteredFailed;

}

getRiskClass(score:number):string{

if(score > 75) return 'high-risk';
if(score > 40) return 'medium-risk';
return 'low-risk';

}

trackByTransaction(index:number,tx:Transaction){

return tx.id;

}

viewTransactionDetails(tx: Transaction): void {
  this.selectedTransaction = tx;
  this.showTransactionModal = true;

  setTimeout(() => {
    document.body.style.overflow = 'hidden';
  }, 10);
}

closeModal():void{

this.showTransactionModal = false;
this.selectedTransaction = null;

document.body.style.overflow='auto';

}

copyTransactionId(id: number | string): void {

navigator.clipboard.writeText(id.toString());

alert("Transaction ID copied");

}

downloadReceipt(tx: any) {

  const doc = new jsPDF();

  doc.setFont("helvetica","bold");
  doc.setFontSize(18);
  doc.text("BANK TRANSACTION RECEIPT", 20, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica","normal");

  doc.text(`Transaction ID: ${tx.id}`, 20, 40);
  doc.text(`Client Name: ${tx.client}`, 20, 50);
  doc.text(`Amount: KES ${tx.amount}`, 20, 60);
  doc.text(`Payment Type: ${tx.type}`, 20, 70);
  doc.text(`Transaction Status: ${tx.status}`, 20, 80);
  doc.text(`Channel: ${tx.channel}`, 20, 90);
  doc.text(`Risk Score: ${tx.riskScore}%`, 20, 100);
  doc.text(`Value Date: ${new Date(tx.date).toLocaleString()}`, 20, 110);

  doc.setFont("helvetica","italic");
  doc.setFontSize(10);
  doc.text("Generated by Transaction Intelligence System", 20, 140);

  doc.save(`receipt-${tx.id}.pdf`);
}

}