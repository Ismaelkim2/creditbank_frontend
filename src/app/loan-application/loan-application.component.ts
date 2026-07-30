      import { Component, OnInit, ElementRef,ViewChild,AfterViewChecked } from '@angular/core';
      import { FormBuilder, FormGroup, Validators } from '@angular/forms';
      import { Router } from '@angular/router';
      import { NotificationService } from '../services/services/notification.service';
      import { LoanService } from '../services/loan.service';
      import { AccountService } from '../services/account.service';
      import { LoanAssessmentResponse } from '../../models/LoanAssessmentResponse';
import { firstValueFrom } from 'rxjs';

      @Component({
      selector: 'app-loan-application',
      templateUrl: './loan-application.component.html',
      styleUrls: ['./loan-application.component.css']
      })

export class LoanApplicationComponent implements OnInit,AfterViewChecked {
  identityVerified = false;
  selectedIdLength = 8;
  idPlaceholder = "Enter 8-digit National ID";
public submitInProgress = false;
      loanForm!: FormGroup;
      isSubmitting = false;
      submitError: string | null = null;
      submitSuccess: string | null = null;
      selectedImageFile: File | null = null;
private eligibilityRequested = false;
private eligibilityRunning = false;
      accountData: any = null;
      isFetchingAccount = false;
      accountLoaded = false;
calculatedDueDate: string = '';
      eligibleLimit = 0;
      estimatedInterest = 0;
      totalRepayable = 0;
      exceedsLimit = false;

      submitLoanPreview: any = null;
isAssessing = false;
submissionComplete = false;

currentStep = 1;
totalSteps = 4;

nextStep(): void {

  if (this.currentStep === 1) {

    // Validate Step 1
    if (!this.accountLoaded) {
      this.submitError = 'Please verify the customer first.';
      return;
    }

    if (!this.loanForm.get('nationalId')?.valid) {
      this.submitError = 'Enter a valid National ID.';
      return;
    }

  }

  if (this.currentStep === 2) {

    if (!this.loanForm.get('amount')?.valid) {
      this.submitError = 'Enter the requested loan amount.';
      return;
    }

    if (this.exceedsLimit) {
      this.submitError = 'Requested amount exceeds eligible limit.';
      return;
    }

  }

  this.submitError = null;

if (this.currentStep < this.totalSteps) {

    this.currentStep++;

    if (this.currentStep === 4) {

        this.pendingScroll = true;

    }

}

}

previousStep(): void {

  if (this.currentStep > 1) {
    this.currentStep--;
  }

}

verifyIdentity(): void {

  this.submitError = null;
  this.submitSuccess = null;

  const id = this.loanForm.get('nationalId')?.value?.trim();

  if (!id) {

    this.submitError = 'National ID Number is required.';
    return;

  }

 if (!/^\d{8,9}$/.test(id)) {

    this.submitError =
        'Enter a valid National ID (8 digits) or Maisha Card Number (9 digits).';

    return;

}

  this.onNationalIdInput();

  this.setStep('account', {
  loading: false,
  done: true
});

this.setStep('identity', {
  loading: false,
  done: true
});

this.setStep('profile', {
  loading: false,
  done: true
});

}

 @ViewChild('reviewSection')
    reviewSection!: ElementRef;

    private pendingScroll = false;

    ngAfterViewChecked(): void {

        if (this.pendingScroll && this.reviewSection) {

            this.pendingScroll = false;

            this.reviewSection.nativeElement.scrollIntoView({

                behavior: 'smooth',
                block: 'start'

            });

        }

    }

estimatedMonthlyRepayment: number = 0;

affordabilityScore: number = 85;

approvalProbability: number = 92;

      constructor(
      private fb: FormBuilder,
      private loanService: LoanService,
      private notificationService: NotificationService,
      private accountService: AccountService,
      private router: Router
      ) {}

     ngOnInit(): void {

  const today = new Date().toISOString().split('T')[0];

          this.loanForm = this.fb.group({
          idType: ['NATIONAL_ID', Validators.required],

          nationalId: ['',[ Validators.required,Validators.pattern(/^\d+$/)]],
          fullName: [''],
          phoneNumber: [''],
          location: [''],
          monthlyIncome: [0],
          monthlyExpenses: [0],
          amount: [null, [Validators.required, Validators.min(1)]],
          applicationDate: [today, Validators.required],
          agreeTerms: [false, Validators.requiredTrue]
          });
}


allowOnlyNumbers(event: KeyboardEvent): void {

    const key = event.key;

    if (!/^\d$/.test(key)) {

        event.preventDefault();

    }

}

validatePaste(event: ClipboardEvent): void {

    const pasted = event.clipboardData?.getData('text') || '';

    if (!/^\d+$/.test(pasted)) {
        event.preventDefault();
    }

}

formatNationalId(): void {

    const control = this.loanForm.get('nationalId');

    if (!control) return;

    let value = control.value || '';

    // Keep digits only
    value = value.replace(/\D/g, '');

    // Maximum 9 digits
    value = value.substring(0, 9);

    control.setValue(value, {
        emitEvent: false
    });

}

onIdTypeChanged(): void {

    const type = this.loanForm.get('idType')?.value;

    const control = this.loanForm.get('nationalId');

    control?.reset();

    if (type === 'NATIONAL_ID') {

        this.selectedIdLength = 8;

        this.idPlaceholder = "Enter 8-digit National ID";

    }

    else {

        this.selectedIdLength = 9;

        this.idPlaceholder = "Enter 9-digit Maisha Card Number";

    }

}

onIdInput(event: Event): void {

    const input = event.target as HTMLInputElement;

    const max = this.selectedIdLength;

    input.value = input.value
        .replace(/\D/g, '')
        .substring(0, max);

    this.loanForm.get('nationalId')?.setValue(
        input.value,
        {
            emitEvent: false
        }
    );

}

      private readonly MAX_DURATION_MONTHS = 3;

     calculateDurationMonths(): number {

  const raw = this.loanForm.getRawValue();

  const income = Number(raw.monthlyIncome) || 0;
  const expenses = Number(raw.monthlyExpenses) || 0;
  const amount = Number(raw.amount) || 0;

  const disposable = income - expenses;

  if (disposable <= 0) return 3; // forced max risk cap

  const affordabilityRatio = amount / disposable;
  const risk = this.calculateRiskScore();

  let months = 1;

  // base affordability logic
  if (affordabilityRatio <= 1) months = 1;
  else if (affordabilityRatio <= 2) months = 2;
  else months = 3;

  // risk adjustment (but NEVER exceed 3)
  if (risk > 70) months = 3;
  else if (risk > 50) months = Math.max(months, 2);

  // HARD CAP
  return Math.min(months, this.MAX_DURATION_MONTHS);
}

      onImageSelected(event: Event) {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) this.selectedImageFile = file;
      }



      onNationalIdInput(): void {

      const idControl = this.loanForm.get('nationalId');
      const id = idControl?.value?.trim();

      if (!id || id.length < 6) {
      this.accountData = null;
      this.eligibleLimit = 0;
      return;
      }

      if (this.isFetchingAccount) return;

      this.isFetchingAccount = true;
      this.submitError = null;

      this.accountService.getAccountDetailsByNationalId(id).subscribe({

     next: (res: any) => {

  this.isFetchingAccount = false;

  this.accountData = res;
  this.accountLoaded = true;

  this.loanForm.patchValue({
    fullName: res.fullName || '',
    phoneNumber: res.phoneNumber || '',
    location: `${res.city || ''}, ${res.county || ''}`,
    monthlyIncome: res.monthlyIncome ?? 0,
    monthlyExpenses: res.monthlyExpenses ?? 0
  });

  ['fullName','phoneNumber','monthlyIncome']
    .forEach(field => this.loanForm.get(field)?.disable());

  const income = this.loanForm.get('monthlyIncome')?.value ?? 0;
  const expenses = this.loanForm.get('monthlyExpenses')?.value ?? 0;

  const disposableIncome = income - expenses;

  this.eligibleLimit =
    disposableIncome > 0
      ? Math.floor(disposableIncome * 0.4 * 3)
      : 0;

  this.calculatePreview();

  // =====================================================
  // SUCCESS
  // =====================================================

  this.identityVerified = true;

  this.submitError = null;

  this.submitSuccess =
    'Customer identity verified successfully. You may now proceed with your loan application.';

  // Automatically hide success message
  setTimeout(() => {
    this.submitSuccess = null;
  }, 4000);

  // Smoothly navigate to the application form
  setTimeout(() => {

    const form = document.querySelector('.loan-application-page');

    if (form) {

      form.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

    }

  }, 200);

},

      error: (err) => {

      this.isFetchingAccount = false;
      this.accountData = null;
      this.accountLoaded = false;
      this.eligibleLimit = 0;

      if (err.status === 404) {
      this.submitError = 'No account found. Please open account first.';
      this.clearAutoFields();
      } else {
      this.submitError = 'Unable to verify identity. Please try again.';
      }

      }

      

      });

      this.submitLoanPreview = null;
this.exceedsLimit = false;

      }

  
 calculatePreview() {

  const raw = this.loanForm.getRawValue();
  const amount = Number(raw.amount) || 0;

  const disposable =
    Number(this.loanForm.get('monthlyIncome')?.value || 0) -
    Number(this.loanForm.get('monthlyExpenses')?.value || 0);

if (disposable <= 0) {

    this.affordabilityScore = 0;

} else {

    const ratio = (disposable / Number(this.loanForm.get('monthlyIncome')?.value || 1)) * 100;

    this.affordabilityScore = Math.min(100, Math.max(0, Math.round(ratio)));

}

  const rate = this.calculateInterestRate();

  this.estimatedInterest = amount * rate;
  this.totalRepayable = amount + this.estimatedInterest;

  const months = this.calculateDurationMonths();

if (months > 0) {

    this.estimatedMonthlyRepayment = this.totalRepayable / months;

} else {

    this.estimatedMonthlyRepayment = 0;

}

  this.exceedsLimit = amount > this.eligibleLimit;

  this.calculateDueDate();
}

      calculateRiskScore(): number {

      const raw = this.loanForm.getRawValue();

      const income = Number(raw.monthlyIncome) || 0;
      const expenses = Number(raw.monthlyExpenses) || 0;
      const amount = Number(raw.amount) || 0;

      const disposable = income - expenses;

      if (disposable <= 0) return 90; // very risky

      // 1. affordability risk
      const affordabilityRatio = amount / disposable;

      let score = 0;

      if (affordabilityRatio > 3) score += 50;
      else if (affordabilityRatio > 2) score += 35;
      else if (affordabilityRatio > 1) score += 20;
      else score += 5;

      // 2. income stability factor
      if (income < 20000) score += 25;
      else if (income < 50000) score += 10;
      else score += 5;

      // 3. loan size factor
      if (amount > income * 2) score += 20;

      return Math.min(score, 100);
      }

      calculateInterestRate(): number {

      const score = this.calculateRiskScore();

      if (score <= 20) return 0.08;   // 8% low risk
      if (score <= 40) return 0.10;   // 10%
      if (score <= 60) return 0.15;   // 15%
      if (score <= 80) return 0.20;   // 20%

      return 0.30; // high risk
      }

      clearAutoFields() {

      this.loanForm.patchValue({
      fullName: '',
      phoneNumber: '',
      location: '',
      monthlyIncome: 0,
      monthlyExpenses: 0
      });

      ['fullName','phoneNumber','location','monthlyIncome','monthlyExpenses']
      .forEach(field => this.loanForm.get(field)?.enable());

      }


      private scrollToReviewTop(): void {

    setTimeout(() => {

        if (this.reviewSection) {

            this.reviewSection.nativeElement.scrollIntoView({

                behavior: 'smooth',
                block: 'start'

            });

        }

    }, 50);

}

async assessLoanEligibility(): Promise<void> {

  // prevent duplicate runs
  if (this.isAssessing) return;

  this.isAssessing = true;
  this.eligibilityRunning = true;

  this.submitError = null;
  this.submitLoanPreview = null;

  // RESET STEPS
  this.eligibilitySteps = this.eligibilitySteps.map(s => ({
    ...s,
    done: false,
    loading: false
  }));

  try {

    const nationalId = this.loanForm.get('nationalId')?.value?.trim();
    const raw = this.loanForm.getRawValue();
    const amount = Number(raw.amount);

    // ================= VALIDATION =================
    if (!nationalId) {
      throw new Error("Please enter National ID first");
    }

    if (this.isFetchingAccount) {
      throw new Error("Please wait for account verification...");
    }

    if (!amount || amount <= 0) {
      throw new Error("Enter valid loan amount first");
    }

    if (!this.accountLoaded || !this.accountData) {
      throw new Error("Account not loaded yet");
    }

    const requestBody = {
      requestedAmount: amount,
      monthlyIncome: Number(raw.monthlyIncome) || 0,
      phoneNumber: raw.phoneNumber || '',
      nationalId
    };

    // ================= STEP 1 =================
    this.setStep('account', { loading: true });
    await this.sleep(1000);
    this.setStep('account', { loading: false, done: true });

    // ================= STEP 2 =================
    this.setStep('risk', { loading: true });
    await this.sleep(1000);
    this.setStep('risk', { loading: false, done: true });

    // ================= STEP 3 =================
    this.setStep('eligibility', { loading: true });

    const res = await firstValueFrom(
      this.loanService.getCreditIntelligenceByNationalId(nationalId, requestBody)
    );

    await this.sleep(1000);
    this.setStep('eligibility', { loading: false, done: true });

    // ================= STEP 4 =================
    this.setStep('decision', { loading: true });
    await this.sleep(1000);
    this.setStep('decision', { loading: false, done: true });

    // ================= FINAL =================
    this.submitLoanPreview = res;

    this.eligibleLimit = res?.eligibleAmount ?? 0;
    this.exceedsLimit = amount > this.eligibleLimit;

    this.estimatedInterest = amount * 0.12;
    this.totalRepayable = amount + this.estimatedInterest;

  } catch (err: any) {

  this.submitError = this.extractErrorMessage(err);

  // stop all loaders
  this.eligibilitySteps.forEach(step => {
    step.loading = false;
  });
}
  
  finally {

  this.isAssessing = false;
  this.eligibilityRunning = false;

  // clear progress message
  if (this.submitError === "Eligibility analysis in progress...") {
    this.submitError = null;
  }

  this.eligibilitySteps = [...this.eligibilitySteps];
}
}

async submitLoan(): Promise<void> {

  // Prevent duplicate submissions
  if (this.submitInProgress || this.isSubmitting || this.isAssessing) {
    return;
  }

  this.submitInProgress = true;
  this.submitError = null;

  try {

    // =====================================================
    // CUSTOMER VALIDATION
    // =====================================================

    if (!this.accountLoaded || !this.accountData?.nationalId) {
      this.submitError = "Account not loaded. Enter National ID first.";
      return;
    }

    if (this.eligibilityRunning) {
      this.submitError = "Eligibility analysis is still running. Please wait.";
      return;
    }

    // =====================================================
    // RUN ELIGIBILITY IF NOT ALREADY DONE
    // =====================================================

    if (!this.submitLoanPreview) {

      await this.assessLoanEligibility();

      if (!this.submitLoanPreview) {
        return;
      }

    }

    // =====================================================
    // BUSINESS VALIDATIONS
    // =====================================================

    if (this.submitLoanPreview?.recommendation === 'BLOCK & INVESTIGATE') {
      this.submitError = "Application blocked due to risk evaluation.";
      return;
    }

    if (this.exceedsLimit) {
      this.submitError = "Requested amount exceeds your eligible limit.";
      return;
    }

    if (this.loanForm.invalid) {
      this.loanForm.markAllAsTouched();
      this.submitError = "Please complete all required fields.";
      return;
    }

    if (!this.loanForm.get('agreeTerms')?.value) {

      this.submitError =
        "Please read the Loan Terms & Conditions, Privacy Policy and Lending Policy, then tick the declaration before submitting your application.";

      document.getElementById('agreeTerms')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      return;
    }

    // =====================================================
    // BUILD REQUEST
    // =====================================================

    

    this.isSubmitting = true;

    const raw = this.loanForm.getRawValue();

    this.calculateDueDate();

    const formData = new FormData();

    formData.append('applicantName', raw.fullName);
    formData.append('idNo', raw.nationalId);
    formData.append('phoneNumber', raw.phoneNumber);
    formData.append('location', raw.location);
    formData.append('amount', raw.amount.toString());
    formData.append('duration', `${this.calculateDurationMonths()} months`);
    formData.append('dueDate', this.calculatedDueDate);
    formData.append('interestRate', this.calculateInterestRate().toString());
    formData.append('riskScore', this.calculateRiskScore().toString());
    formData.append('applicationDate', raw.applicationDate);
    formData.append('monthlyIncome', raw.monthlyIncome.toString());
    formData.append('monthlyExpenses', raw.monthlyExpenses.toString());

    if (this.selectedImageFile) {
      formData.append('file', this.selectedImageFile);
    }

    // =====================================================
    // SUBMIT APPLICATION
    // =====================================================

    await firstValueFrom(
      this.loanService.addLoanWithImage(formData)
    );

    // =====================================================
    // SUCCESS
    // =====================================================

    this.submissionComplete = true;
    this.submitSuccess = "Loan submitted successfully!";

    setTimeout(() => {
      this.router.navigate(['/app/loans']);
    }, 2500);

  }
  catch (err: any) {

    this.submitError = this.extractErrorMessage(err);

  }
  finally {

    // Always reset flags
    this.isSubmitting = false;
    this.submitInProgress = false;

  }

}


saveDraft(): void {

  const draftData = this.loanForm.getRawValue();

  localStorage.setItem(
    'loanApplicationDraft',
    JSON.stringify(draftData)
  );

  alert('Loan application draft has been saved successfully.');

}

      cancel() {
      this.router.navigate(['/app/loans']);
      }


      eligibilitySteps = [
  { key: 'account', label: 'Account Verification', done: false, loading: false },
  { key: 'risk', label: 'Risk Scoring', done: false, loading: false },
  { key: 'eligibility', label: 'Eligibility Analysis', done: false, loading: false },
  { key: 'decision', label: 'Final Decision', done: false, loading: false }
];

private setStep(key: string, state: Partial<{ done: boolean; loading: boolean }>) {
  const step = this.eligibilitySteps.find(s => s.key === key);
  if (step) {
    step.done = state.done ?? step.done;
    step.loading = state.loading ?? false;
  }
}

private sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


private extractErrorMessage(error: any): string {

  console.error('Backend Error:', error);

  // JSON response with message field
  if (error?.error?.message) {
    return error.error.message;
  }

  // JSON response with error field
  if (error?.error?.error) {
    return error.error.error;
  }

  // Plain string response
  if (typeof error?.error === 'string') {
    return error.error;
  }

  // Spring ResponseStatusException
  if (error?.error?.detail) {
    return error.error.detail;
  }

  // Fallback message
  if (error?.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}


calculateDueDate(): void {

  const raw = this.loanForm.getRawValue();

  const applicationDate = new Date(raw.applicationDate);

  const durationMonths = this.calculateDurationMonths();

  const dueDate = new Date(applicationDate);

  dueDate.setMonth(dueDate.getMonth() + durationMonths);

  this.calculatedDueDate =
    dueDate.toISOString().split('T')[0];
}

      }