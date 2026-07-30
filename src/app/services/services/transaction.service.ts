import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, forkJoin, of, map, catchError } from 'rxjs';
import { Repayment } from '../repayment.service';

export interface Transaction {


/*
====================================================
IDENTITY
====================================================
*/

id: number;

transactionReference: string;

bankReference?: string;

externalReference?: string;

paymentReference?: string;

sessionId?: string;


/*
====================================================
CUSTOMER
====================================================
*/

customerName: string;

customerNationalId?: string;

phoneNumber?: string;

email?: string;



/*
====================================================
ACCOUNT & LOAN
====================================================
*/

accountNumber?: string;

loanNumber?: string;



/*
====================================================
TRANSACTION DETAILS
====================================================
*/

transactionType:
'LOAN_REPAYMENT'
|'DISBURSEMENT'
|'DEPOSIT'
|'WITHDRAWAL'
|'TRANSFER'
|'FEE'
|'REVERSAL';



status:
  | 'INITIATED'
  | 'RECEIVED'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'PROCESSING'
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'ON_HOLD'

  | 'AUTHORIZED'
  | 'APPROVED'
  | 'POSTED'
  | 'SETTLED'
  | 'RECONCILED'
  | 'COMPLETED'

  | 'FAILED'
  | 'DECLINED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REVERSED'
  | 'PARTIALLY_REVERSED'
  | 'REFUNDED'
  | 'TIMEOUT'
  | 'EXPIRED'
  | 'BLOCKED';



channel:
'MPESA'
|'BANK'
|'ATM'
|'BRANCH'
|'ONLINE';



amount:number;

mpesaReceiptNumber?: string;

principalAmount?:number;

interestAmount?:number;

penaltyAmount?:number;

chargesAmount?:number;



balanceBefore?:number;

balanceAfter?:number;



outstandingLoanBefore?:number;

outstandingLoanAfter?:number;



/*
====================================================
PAYMENT DETAILS
====================================================
*/

paymentMethod?:string;

provider?:string;

merchantName?:string;

merchantCode?:string;

tillNumber?:string;

paybillNumber?:string;

terminalId?:string;



/*
====================================================
RISK & COMPLIANCE
====================================================
*/


riskScore:number;


riskLevel:
'LOW'
|'MEDIUM'
|'HIGH'
|'CRITICAL';



fraudStatus:
'NOT_CHECKED'
|'CLEARED'
|'UNDER_REVIEW'
|'SUSPECTED'
|'CONFIRMED'
|'BLOCKED';



amlPassed?:boolean;

sanctionsPassed?:boolean;

duplicateTransaction?:boolean;



/*
====================================================
AUDIT
====================================================
*/


initiatedBy?:string;

approvedBy?:string;

authorizedBy?:string;


branchCode?:string;

branchName?:string;


deviceName?:string;

ipAddress?:string;

userAgent?:string;



/*
====================================================
SETTLEMENT
====================================================
*/


settlementBatch?:string;

settlementReference?:string;


settlementStatus:
'PENDING'
|'SETTLED'
|'FAILED'
|'REVERSED';


settlementDate?:Date;

businessDate?:Date;



/*
====================================================
TIME
====================================================
*/


initiatedAt?:Date;

authorizedAt?:Date;

completedAt?:Date;

reversedAt?:Date;



/*
====================================================
RECEIPT
====================================================
*/


receiptNumber?:string;

receiptPrinted?:boolean;

receiptEmailed?:boolean;

receiptSmsSent?:boolean;

narration?:string;

remarks?:string;


client?: string;

type?: 'Credit' | 'Debit';

date?: Date;


}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private transactionStream = new Subject<void>();
  private baseUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  /** Notify components to reload transactions */
  refreshTransactions() {
    this.transactionStream.next();
  }

  /** Listen for transaction updates */
  getTransactionUpdates(): Observable<void> {
    return this.transactionStream.asObservable();
  }

getAllTransactions(): Observable<Transaction[]> {


return this.http
.get<Transaction[]>(
`${this.baseUrl}/transactions/all`
)
.pipe(

map(transactions => {


return transactions.map(tx => ({


...tx,


client:
tx.customerName || 'Unknown Customer',



type:
(
  tx.transactionType === 'LOAN_REPAYMENT' ||
  tx.transactionType === 'DEPOSIT'
)
? 'Credit'
: 'Debit' as 'Credit' | 'Debit',



date:
tx.completedAt
?
new Date(tx.completedAt)
:
tx.initiatedAt
?
new Date(tx.initiatedAt)
:
new Date(),



amount:
tx.amount ?? 0,



riskScore:
tx.riskScore ?? 0



}));



}),



catchError(error=>{


console.error(
"Transaction API Error:",
error
);


return of([]);


})

);


}

 getRepaymentStatus(ref: string) {
  return this.http.get<any>(`http://localhost:8080/api/mpesa/status/${ref}`);
}


}