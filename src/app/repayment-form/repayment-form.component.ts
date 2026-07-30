import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription, interval, SubscriptionLike } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

import { Loan } from '../../models/loan.model';
import { LoanService } from '../services/loan.service';
import { TransactionService } from '../services/services/transaction.service';

@Component({
  selector: 'app-repayment-form',
  templateUrl: './repayment-form.component.html',
  styleUrls: ['./repayment-form.component.css']
})
export class RepaymentFormComponent implements OnInit, OnDestroy {

  dueAmount=0;

paymentChannel: string = 'MPESA';
 repayment = {

    identifier: '',

    amountPaid: null as number | null,

    repaymentDate: '',

    phoneNumber: '',

    location: '',

    idNo: '',


    // PAYMENT SOURCE DETAILS

    accountNumber: '',

    accountName: '',

    paymentSource: '',

    bankName: '',

    branchName: ''

};

defaultProfileImage = 'assets/images/default-user.png';

  currentStep = 1;
  totalSteps = 5;


nextStep(){

    if(this.currentStep < this.totalSteps){
        this.currentStep++;
    }

}


previousStep(){

    if(this.currentStep > 1){
        this.currentStep--;
    }

}
  repaymentStatus: string = '';
  repaymentRef: string = '';

  searchType: 'loanId' | 'idNo' | 'phone' = 'loanId';

  paymentMode: 'partial' | 'full' = 'partial';
  editingPaymentAmount = false;

previousPaymentAmount = 0;

  loanDetails: Loan[] = [];
  selectedLoan: Loan | null = null;

  loading = false;
  errorMessage = '';
  showNotification = false;
  notificationMessage = '';

  modalTitle = '';
  modalMessage = '';

  private search$ = new Subject<string>();
  private sub?: Subscription;
  private pollingSub?: any;

//====================================================
// LIVE PAYMENT STATUS
//====================================================

paymentProgress = 0;

getCurrentStep(): number {

    switch ((this.repaymentStatus || '').toUpperCase()) {

        case 'REQUEST_CREATED':
            this.paymentProgress = 10;
            return 1;

        case 'STK_SENT':
            this.paymentProgress = 30;
            return 2;

        case 'CUSTOMER_PROMPT':
            this.paymentProgress = 50;
            return 3;

        case 'PIN_ENTERED':
            this.paymentProgress = 75;
            return 4;

        case 'PROCESSING':
            this.paymentProgress = 90;
            return 5;

        case 'SUCCESS':
            this.paymentProgress = 100;
            return 6;

        case 'FAILED':
            this.paymentProgress = 100;
            return -1;

        default:
            this.paymentProgress = 0;
            return 0;
    }

}


  constructor(
    private loanService: LoanService,
    private route: ActivatedRoute,
    private router: Router,
    private tx: TransactionService
  ) {}

  ngOnInit(): void {

    this.repayment.repaymentDate =
      new Date().toISOString().split('T')[0];

    this.search$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(v => this.lookup(v));

    this.route.queryParams.subscribe(p => {
      if (p['loanId']) {
        this.repayment.identifier = p['loanId'];
        this.search$.next(p['loanId']);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.pollingSub) clearInterval(this.pollingSub);
  }

  // ================= LOAN =================

  get latestLoan(): Loan | null {
    return this.loanDetails.length
      ? this.loanDetails[this.loanDetails.length - 1]
      : null;
  }

  get balanceDue(): number {
    return this.latestLoan?.dueAmount ?? 0;
  }


get repaymentProgress(): number {

    if (!this.latestLoan || !this.latestLoan.totalRepayableAmount) {
        return 0;
    }


    const originalLoanAmount = this.latestLoan.totalRepayableAmount;


    const currentOutstanding = this.balanceDue || 0;


    const currentPayment =
        Number(this.repayment.amountPaid || 0);



    // simulate balance after payment
    const projectedBalance =
        currentOutstanding - currentPayment;



    const projectedRecovered =
        originalLoanAmount - projectedBalance;



    const progress =
        (projectedRecovered / originalLoanAmount) * 100;



    return Math.min(
        Math.max(Number(progress.toFixed(2)),0),
        100
    );

}


 get remainingBalance(): number {

      const outstanding = this.balanceDue || 0;

      const paid = this.repayment?.amountPaid || 0;


      const balance = outstanding - paid;


      return balance > 0 ? balance : 0;

  }

  onPaymentChannelChange(){


    const loan = this.latestLoan;


    if(!loan){
        return;
    }



    switch(this.paymentChannel){


        case 'ACCOUNT':

            this.repayment.accountNumber =
                loan.accountNumber || '';

            this.repayment.accountName =
                loan.applicantName || '';

            this.repayment.paymentSource =
                'CUSTOMER INTERNAL ACCOUNT';

        break;




        case 'MPESA':

            this.repayment.phoneNumber =
                String(loan.phoneNumber || '');

            this.repayment.paymentSource =
                'REGISTERED MOBILE NUMBER';

        break;




        case 'BANK':

            this.repayment.accountNumber =
                loan.accountNumber || '';

            this.repayment.bankName =
                'Equity Bank';

            this.repayment.accountName =
                loan.applicantName || '';

            this.repayment.paymentSource =
                'BANK TRANSFER ACCOUNT';

        break;




        case 'CASH':

            this.repayment.branchName =
                loan.location || 'Main Branch';


            this.repayment.paymentSource =
                'CASH COLLECTION';

        break;

    }



}

editPaymentAmount(){

    this.previousPaymentAmount =
        this.repayment.amountPaid || 0;


    this.editingPaymentAmount = true;

}



savePaymentAmount(){


    if(
        !this.repayment.amountPaid ||
        this.repayment.amountPaid <=0
    ){

        this.repayment.amountPaid = 
            this.previousPaymentAmount;

    }


    if(
        this.repayment.amountPaid > this.balanceDue
    ){

        this.repayment.amountPaid =
            this.balanceDue;

    }


    this.editingPaymentAmount = false;

}

get customerImage(): string {

    const image = this.latestLoan?.userImageUrl;

    if (!image) {
        return 'assets/images/default-user.png';
    }

    return `http://localhost:8080/${image}`;
}


customerImageError(event: Event): void {

  const img = event.target as HTMLImageElement;
  img.src = this.defaultProfileImage;

}


cancelPaymentEdit(){


    this.repayment.amountPaid =
        this.previousPaymentAmount;


    this.editingPaymentAmount = false;

}

  // ================= SEARCH =================

  onSearch(value: string) {
    this.repayment.identifier = value;
    this.search$.next(value);
  }

  lookup(value: string) {

    if (!value?.trim()) {
      this.loanDetails = [];
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    let request$;

    switch (this.searchType) {
      case 'idNo':
        request$ = this.loanService.getLoansByIdNo(value);
        break;
      case 'loanId':
        request$ = this.loanService.getLoanById(Number(value));
        break;
      case 'phone':
        request$ = this.loanService.getLoansByPhone(value);
        break;
      default:
        request$ = this.loanService.getLoansByIdNo(value);
    }

    this.sub?.unsubscribe();

    this.sub = request$.subscribe({
      next: (res: any) => {
        this.loading = false;

        this.loanDetails =
          Array.isArray(res) ? res : (res ? [res] : []);

        const l = this.latestLoan;

if (l) {


this.repayment.phoneNumber =
String(l.phoneNumber || '');



this.repayment.location =
l.location || '';



this.repayment.accountNumber =
l.accountNumber || '';



this.repayment.idNo =
String(l.nationalId || '');


// LOAD DEFAULT PAYMENT SOURCE

this.onPaymentChannelChange();


}

      },
      error: () => {
        this.loading = false;
        this.loanDetails = [];
        this.errorMessage = 'Loan not found';
      }
    });
  }

  // ================= MODE =================

  setMode(mode: 'partial' | 'full') {
    this.paymentMode = mode;

    this.repayment.amountPaid =
      mode === 'full' ? this.balanceDue : null;
  }

  quickPay(percent: number) {
    this.repayment.amountPaid =
      Math.floor((this.balanceDue * percent) / 100);
  }

  // ================= SELECT LOAN =================

  selectLoan(loan: Loan) {
    this.selectedLoan = loan;

    this.repayment.identifier = String(loan.id);
    this.repayment.amountPaid = loan.dueAmount ?? 0;
    this.repayment.phoneNumber = String(loan.phoneNumber || '');
    this.repayment.location = loan.location || '';
    this.repayment.accountNumber = loan.accountNumber || '';
    this.repayment.idNo = String(loan.nationalId || '');
  }

  // ================= SUBMIT (FIXED STK FLOW) =================

  submit() {

    const loan = this.latestLoan;

    if (!loan) {
      this.showErrorModal('No loan selected', 'Please select a loan.');
      return;
    }

    if (!this.repayment.amountPaid || this.repayment.amountPaid <= 0) {
      this.showErrorModal('Invalid amount', 'Enter repayment amount.');
      return;
    }

    this.loading = true;

    this.loanService.processRepayment(
      loan.id!,
      this.repayment.amountPaid,
      this.repayment.accountNumber,
      this.repayment.phoneNumber
    ).subscribe({

      next: (res: any) => {

        this.loading = false;

        console.log('📲 STK RESPONSE:', res);

        // ✅ FIXED KEY HANDLING (SAFE)
        this.repaymentRef =
          res.checkoutRequestId ||
          res.checkoutRequestID ||
          res.reference ||
          res.ref ||
          '';

        this.tx.refreshTransactions();

        this.showNotification = true;
        this.notificationMessage = '📲 M-Pesa prompt sent. Awaiting confirmation...';

        // ✅ ONLY POLL IF VALID
        if (this.repaymentRef?.trim()) {
          this.pollStatus(this.repaymentRef);
        } else {
          console.error('❌ Missing CheckoutRequestID, cannot poll');
        }

        setTimeout(() => this.showNotification = false, 4000);
      },

      error: (err) => {
        this.loading = false;
        this.showErrorModal(
          'Payment Failed',
          err?.error?.message || 'Error occurred'
        );
      }
    });
  }

  // ================= MODAL =================

  showErrorModal(title: string, message: string) {
    this.modalTitle = title;
    this.modalMessage = message;

    const modal = new (window as any).bootstrap.Modal(
      document.getElementById('errorModal')
    );

    modal.show();
  }

  // ================= NAVIGATION =================

  goBack() {
    this.router.navigate(['/app/loans']);
  }

  // ================= POLLING (FIXED) =================

  pollStatus(ref: string) {

    if (!ref) return;

    this.pollingSub = setInterval(() => {

      this.tx.getRepaymentStatus(ref).subscribe({

        next: (res: any) => {

      const status = res.resultDesc || res.status;

this.repaymentStatus = this.mapStatusMessage(status);

          console.log('📡 STATUS:', res.status);

        if (
  status === 'SUCCESS' ||
  status === 'FAILED' ||
  status === 'CANCELLED'
) {

            clearInterval(this.pollingSub);

            this.tx.refreshTransactions();
            this.lookup(this.repayment.identifier);

            if (res.status === 'SUCCESS') {
              this.notificationMessage = '✅ Payment successful';
              alert('✅ Payment successful');
            }
            else if (res.status === 'CANCELLED') {
              this.notificationMessage = '❌ Transaction cancelled';
              alert('❌ Transaction cancelled');
            }
            else {
              this.notificationMessage = '❌ Payment failed';
              alert('❌ Payment failed');
            }

            this.showNotification = true;
            setTimeout(() => this.showNotification = false, 5000);
          }
        },

        error: () => {
          clearInterval(this.pollingSub);
        }

      });

    }, 2000);
  }

  mapStatusMessage(status: string): string {

  switch (status) {

    case 'INITIATED':
      return '⏳ Initializing payment...';

    case 'STK_PUSH_SENT':
      return '📲 M-Pesa prompt sent to phone';

    case 'CUSTOMER_ENTERING_PIN':
      return '🔐 Awaiting M-Pesa PIN';

    case 'PROCESSING_PAYMENT':
      return '💳 Processing payment';

    case 'SUCCESS':
      return '✅ Payment successful';

    case 'FAILED':
      return '❌ Payment failed';

    case 'CANCELLED':
      return '❌ Transaction cancelled';

    case 'INSUFFICIENT_FUNDS':
      return '⚠️ Insufficient M-Pesa balance';

    default:
      return '⌛ Waiting for payment confirmation...';
  }
}
}