import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  ChangeDetectorRef
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

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
export class LoanApplicationComponent
  implements OnInit, AfterViewChecked, OnDestroy {


  // =========================================================
  // CUSTOMER / IDENTITY
  // =========================================================

  identityVerified = false;

  selectedIdLength = 8;

  idPlaceholder = 'Enter 8-digit National ID';

  accountData: any = null;

  isFetchingAccount = false;

  accountLoaded = false;

  verifiedIdentificationNumber: string | null = null;


  // =========================================================
  // FORM / SUBMISSION STATE
  // =========================================================

  public submitInProgress = false;

  loanForm!: FormGroup;

  isSubmitting = false;

  submitError: string | null = null;

  submitSuccess: string | null = null;

  selectedImageFile: File | null = null;


  // =========================================================
  // CREDIT ASSESSMENT STATE
  // =========================================================

  private eligibilityRequested = false;

  private eligibilityRunning = false;

  isAssessing = false;

  submitLoanPreview: LoanAssessmentResponse | any = null;


  // =========================================================
  // ELIGIBILITY LIMIT STATE
  // =========================================================
  //
  // IMPORTANT:
  //
  // preliminaryEligibleLimit:
  //     Stable customer-based preliminary limit.
  //
  // eligibleLimit:
  //     What the UI should currently display.
  //
  // Before backend assessment:
  //     eligibleLimit = preliminaryEligibleLimit
  //
  // After backend assessment:
  //     eligibleLimit = backend eligibleAmount
  //
  // When an assessment becomes invalid:
  //     eligibleLimit immediately returns to the stable
  //     preliminary limit instead of becoming ZERO.
  //
  // =========================================================

  preliminaryEligibleLimit = 0;

  eligibleLimit = 0;

  exceedsLimit = false;


  // =========================================================
  // BACKEND CREDIT VALUES
  // =========================================================

  estimatedInterest = 0;

  totalRepayable = 0;

  estimatedMonthlyRepayment = 0;

  calculatedDueDate = '';

  affordabilityScore = 0;

  approvalProbability = 0;


  // =========================================================
  // POST-SUBMISSION SUCCESS REPORT
  // =========================================================

  submittedLoan: any = null;

  submittedLoanId: any = null;

  submittedApplicationNumber: string | null = null;

  submittedLoanStatus: string | null = null;

  receiptGenerating = false;

  submissionComplete = false;


  // =========================================================
  // STEP NAVIGATION
  // =========================================================

  currentStep = 1;

  totalSteps = 4;

  stepTitles = [
    'Customer Verification',
    'Financial Profile',
    'Loan Request',
    'Review & Submit'
  ];


  get maxStep(): number {
    return this.totalSteps;
  }


  // =========================================================
  // PLACEHOLDER ANIMATION
  // =========================================================

  animatedIdPlaceholder = '';

  private placeholderExamples: string[] = [];

  private placeholderIndex = 0;

  private placeholderCharIndex = 0;

  private placeholderDeleting = false;

  private placeholderTimer: ReturnType<typeof setTimeout> | null = null;


  // =========================================================
  // REVIEW SCROLL
  // =========================================================

  @ViewChild('reviewSection')
  reviewSection!: ElementRef;

  private pendingScroll = false;


  // =========================================================
  // CREDIT INTELLIGENCE STEPS
  // =========================================================

  eligibilitySteps = [
    {
      key: 'account',
      label: 'Account Verification',
      done: false,
      loading: false
    },
    {
      key: 'risk',
      label: 'Risk Scoring',
      done: false,
      loading: false
    },
    {
      key: 'eligibility',
      label: 'Eligibility Analysis',
      done: false,
      loading: false
    },
    {
      key: 'decision',
      label: 'Final Decision',
      done: false,
      loading: false
    }
  ];


  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private fb: FormBuilder,
    private loanService: LoanService,
    private notificationService: NotificationService,
    private accountService: AccountService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================================================
  // NG ON INIT
  // =========================================================

  ngOnInit(): void {

    const today =
      new Date()
        .toISOString()
        .split('T')[0];


    this.loanForm =
      this.fb.group({

        idType: [
          'NATIONAL_ID',
          Validators.required
        ],

        identificationNumber: [
          '',
          [
            Validators.required,
            Validators.pattern(/^\d+$/)
          ]
        ],

        fullName: [''],

        phoneNumber: [''],

        location: [''],

        monthlyIncome: [0],

        monthlyExpenses: [0],

        amount: [
          null,
          [
            Validators.required,
            Validators.min(1)
          ]
        ],

        applicationDate: [
          today,
          Validators.required
        ],

        agreeTerms: [
          false,
          Validators.requiredTrue
        ]

      });


    this.startIdentityPlaceholderAnimation();

  }


  // =========================================================
  // NG ON DESTROY
  // =========================================================

  ngOnDestroy(): void {

    this.stopIdentityPlaceholderAnimation();

  }


  // =========================================================
  // AFTER VIEW CHECKED
  // =========================================================

  ngAfterViewChecked(): void {

    if (
      this.pendingScroll &&
      this.reviewSection
    ) {

      this.pendingScroll = false;

      this.reviewSection.nativeElement.scrollIntoView({

        behavior: 'smooth',

        block: 'start'

      });

    }

  }


  // =========================================================
  // IDENTITY PLACEHOLDER ANIMATION
  // =========================================================

  private startIdentityPlaceholderAnimation(): void {

    this.stopIdentityPlaceholderAnimation();

    this.placeholderIndex = 0;

    this.placeholderCharIndex = 0;

    this.placeholderDeleting = false;

    this.buildPlaceholderExamples();

    this.animateIdentityPlaceholder();

  }


  // =========================================================
  // BUILD PLACEHOLDER EXAMPLES
  // =========================================================

  private buildPlaceholderExamples(): void {

    const type =
      this.loanForm
        ?.get('idType')
        ?.value;


    switch (type) {

      case 'MAISHA_CARD':

        this.placeholderExamples = [

          'Enter 9-digit Maisha Card Number',

          'e.g. 123456789',

          'Enter your Maisha Card number',

          'Your verified identification number',

          'Start typing your ID...'

        ];

        break;


      case 'REGISTRATION_NUMBER':

        this.placeholderExamples = [

          'Enter Registration Number',

          'e.g. CPR/2026/001234',

          'Enter your business registration number',

          'Your verified registration number',

          'Start typing your registration number...'

        ];

        break;


      case 'NATIONAL_ID':

      default:

        this.placeholderExamples = [

          'Enter 8-digit National ID',

          'e.g. 12345678',

          'Enter your National ID number',

          'Your verified identification number',

          'Start typing your ID...'

        ];

        break;

    }

  }


  // =========================================================
  // ANIMATE PLACEHOLDER
  // =========================================================

  private animateIdentityPlaceholder(): void {

    if (
      !this.placeholderExamples.length
    ) {

      return;

    }


    const currentValue =
      this.loanForm
        ?.get('identificationNumber')
        ?.value;


    if (currentValue) {

      this.animatedIdPlaceholder = '';

      return;

    }


    const currentText =
      this.placeholderExamples[
        this.placeholderIndex
      ];


    if (!this.placeholderDeleting) {

      this.animatedIdPlaceholder =
        currentText.substring(
          0,
          this.placeholderCharIndex + 1
        );

      this.placeholderCharIndex++;


      if (
        this.placeholderCharIndex >=
        currentText.length
      ) {

        this.placeholderTimer =
          setTimeout(() => {

            this.placeholderDeleting = true;

            this.animateIdentityPlaceholder();

          }, 1800);

        return;

      }


      this.placeholderTimer =
        setTimeout(() => {

          this.animateIdentityPlaceholder();

        }, 65);

      return;

    }


    this.animatedIdPlaceholder =
      currentText.substring(
        0,
        Math.max(
          0,
          this.placeholderCharIndex - 1
        )
      );

    this.placeholderCharIndex--;


    if (
      this.placeholderCharIndex <= 0
    ) {

      this.placeholderCharIndex = 0;

      this.placeholderDeleting = false;

      this.placeholderIndex =
        (
          this.placeholderIndex + 1
        ) %
        this.placeholderExamples.length;


      this.placeholderTimer =
        setTimeout(() => {

          this.animateIdentityPlaceholder();

        }, 400);

      return;

    }


    this.placeholderTimer =
      setTimeout(() => {

        this.animateIdentityPlaceholder();

      }, 35);

  }


  // =========================================================
  // STOP PLACEHOLDER ANIMATION
  // =========================================================

  private stopIdentityPlaceholderAnimation(): void {

    if (this.placeholderTimer) {

      clearTimeout(this.placeholderTimer);

      this.placeholderTimer = null;

    }

  }


  // =========================================================
  // NEXT STEP
  // =========================================================

  async nextStep(): Promise<void> {


    // =======================================================
    // STEP 1 → STEP 2
    // CUSTOMER VERIFICATION → FINANCIAL PROFILE
    // =======================================================

    if (this.currentStep === 1) {

      if (
        !this.accountLoaded ||
        !this.accountData ||
        !this.identityVerified
      ) {

        this.submitError =
          'Please verify the customer before continuing.';

        return;

      }


      if (
        !this.loanForm
          .get('identificationNumber')
          ?.value
      ) {

        this.submitError =
          `${this.getIdentificationLabel()} is required.`;

        return;

      }


      /*
       * Customer has been verified.
       *
       * The preliminary limit should already have been
       * calculated inside the verification response.
       *
       * This is only a safety fallback.
       */

      if (
        this.preliminaryEligibleLimit <= 0
      ) {

        this.calculatePreliminaryEligibleLimit();

      }


      /*
       * Restore the stable preliminary limit.
       */

      this.restoreDisplayedEligibleLimit();

      this.updateLoanLimitState();

      this.submitError = null;

      this.currentStep = 2;

      return;

    }



    // =======================================================
    // STEP 2 → STEP 3
    // FINANCIAL PROFILE → LOAN REQUEST
    // =======================================================

    if (this.currentStep === 2) {

      const amountControl =
        this.loanForm.get('amount');


      if (
        !amountControl?.value ||
        !amountControl.valid
      ) {

        amountControl?.markAsTouched();

        this.submitError =
          'Enter the requested loan amount.';

        return;

      }


      const requestedAmount =
        this.parseAmount(
          amountControl.value
        );


      if (requestedAmount <= 0) {

        amountControl.markAsTouched();

        this.submitError =
          'The requested loan amount must be greater than zero.';

        return;

      }


      /*
       * The preliminary limit must exist.
       */

      if (
        this.preliminaryEligibleLimit <= 0
      ) {

        this.calculatePreliminaryEligibleLimit();

      }


      /*
       * Never allow the displayed limit to disappear.
       */

      if (
        !this.submitLoanPreview
      ) {

        this.restoreDisplayedEligibleLimit();

      }


      this.updateLoanLimitState();


      if (this.exceedsLimit) {

        this.submitError =
          `Requested amount exceeds the preliminary eligible limit of KES ${
            this.formatCurrency(
              this.eligibleLimit
            )
          }.`;

        return;

      }


      /*
       * IMPORTANT:
       *
       * Do NOT run the full credit assessment here.
       *
       * Step 2 → Step 3 only validates the request.
       */

      this.submitError = null;

      this.currentStep = 3;

      return;

    }



    // =======================================================
    // STEP 3 → STEP 4
    // LOAN REQUEST → FINAL REVIEW
    // =======================================================

    if (this.currentStep === 3) {

      const amountControl =
        this.loanForm.get('amount');


      if (
        !amountControl?.value ||
        !amountControl.valid
      ) {

        amountControl?.markAsTouched();

        this.submitError =
          'Enter the requested loan amount.';

        return;

      }


      const requestedAmount =
        this.parseAmount(
          amountControl.value
        );


      if (requestedAmount <= 0) {

        amountControl.markAsTouched();

        this.submitError =
          'The requested loan amount must be greater than zero.';

        return;

      }


      /*
       * If a previous backend assessment exists,
       * use its backend eligible amount.
       *
       * Otherwise use the stable preliminary limit.
       */

      if (
        this.submitLoanPreview
      ) {

        const backendLimit =
          this.toFiniteNumber(
            this.submitLoanPreview?.eligibleAmount
          );

        this.eligibleLimit =
          backendLimit;

      } else {

        this.restoreDisplayedEligibleLimit();

      }


      this.updateLoanLimitState();


      /*
       * Preliminary limit is not the final backend decision.
       *
       * Do not block the application here solely because the
       * preliminary limit is exceeded if a fresh backend
       * assessment is about to determine the authoritative
       * amount.
       */

      this.calculatePreview();

      this.submitError = null;


      // -----------------------------------------------------
      // FULL BACKEND CREDIT ASSESSMENT
      // -----------------------------------------------------

      await this.assessLoanEligibility();


      /*
       * Assessment failed.
       *
       * Remain on Step 3.
       */

      if (!this.submitLoanPreview) {

        return;

      }


      /*
       * Backend is now authoritative.
       */

      const backendEligibleAmount =
        this.toFiniteNumber(
          this.submitLoanPreview?.eligibleAmount
        );


      this.eligibleLimit =
        backendEligibleAmount;


      this.updateLoanLimitState();


      /*
       * BACKEND DECISION
       */

      const recommendation =
        String(
          this.submitLoanPreview?.recommendation || ''
        )
          .trim()
          .toUpperCase();


      if (
        recommendation ===
        'BLOCK & INVESTIGATE'
      ) {

        this.submitError =
          this.submitLoanPreview?.aiReason ||
          'Application blocked by the backend credit assessment.';

        return;

      }


      if (
        recommendation === 'DECLINE' ||
        recommendation === 'DECLINED'
      ) {

        this.submitError =
          this.submitLoanPreview?.aiReason ||
          'The backend credit assessment has declined this application.';

        return;

      }


      this.submitError = null;

      this.currentStep = 4;

      this.pendingScroll = true;

      return;

    }


    this.submitError = null;

  }


  // =========================================================
  // PRELIMINARY ELIGIBLE LIMIT
  // =========================================================
  //
  // IMPORTANT:
  //
  // This value is calculated ONLY from the verified customer's
  // financial profile.
  //
  // It is deliberately NOT recalculated every time the user
  // types an amount.
  //
  // That prevents the limit from jumping/disappearing.
  //
  // =========================================================

  calculatePreliminaryEligibleLimit(): void {

    if (
      !this.accountLoaded ||
      !this.accountData
    ) {

      this.preliminaryEligibleLimit = 0;

      this.eligibleLimit = 0;

      this.exceedsLimit = false;

      return;

    }


    /*
     * IMPORTANT:
     *
     * Read financial values from the verified account first.
     *
     * This prevents temporary form values from causing the
     * limit to fluctuate.
     */

    const monthlyIncome =
      this.toFiniteNumber(
        this.accountData?.monthlyIncome ??
        this.loanForm
          .get('monthlyIncome')
          ?.value
      );


    const monthlyExpenses =
      this.toFiniteNumber(
        this.accountData?.monthlyExpenses ??
        this.loanForm
          .get('monthlyExpenses')
          ?.value
      );


    if (
      monthlyIncome <= 0
    ) {

      this.preliminaryEligibleLimit = 0;

      this.eligibleLimit = 0;

      this.exceedsLimit = false;

      return;

    }


    const disposableIncome =
      Math.max(
        monthlyIncome -
        Math.max(
          monthlyExpenses,
          0
        ),
        0
      );


    /*
     * Preliminary affordability indication.
     *
     * FINAL CREDIT DECISION REMAINS BACKEND-AUTHORITATIVE.
     */

    const preliminaryLimit =
      disposableIncome * 8;


    /*
     * Always round DOWN.
     */

    this.preliminaryEligibleLimit =
      Math.max(
        0,
        Math.floor(
          preliminaryLimit / 1000
        ) * 1000
      );


    /*
     * Only display the preliminary value when there is
     * no current backend assessment.
     */

    if (
      !this.submitLoanPreview
    ) {

      this.eligibleLimit =
        this.preliminaryEligibleLimit;

    }


    this.updateLoanLimitState();

  }


  // =========================================================
  // RESTORE DISPLAYED LIMIT
  // =========================================================
  //
  // Used after a backend assessment becomes invalid.
  //
  // The limit does NOT disappear.
  //
  // =========================================================

  private restoreDisplayedEligibleLimit(): void {

    if (
      this.submitLoanPreview
    ) {

      const backendLimit =
        this.toFiniteNumber(
          this.submitLoanPreview?.eligibleAmount
        );


      if (
        backendLimit >= 0
      ) {

        this.eligibleLimit =
          backendLimit;

        return;

      }

    }


    this.eligibleLimit =
      this.preliminaryEligibleLimit || 0;

  }


  // =========================================================
  // UPDATE LOAN LIMIT STATE
  // =========================================================

  private updateLoanLimitState(): void {

    const amount =
      this.parseAmount(
        this.loanForm
          ?.get('amount')
          ?.value
      );


    const limit =
      this.toFiniteNumber(
        this.eligibleLimit
      );


    /*
     * A zero preliminary limit should NOT automatically mean
     * "amount exceeds limit".
     *
     * It means the system has no preliminary limit available.
     */

    this.exceedsLimit =
      amount > 0 &&
      limit > 0 &&
      amount > limit;

  }


  // =========================================================
  // PARSE AMOUNT
  // =========================================================

  private parseAmount(
    value: any
  ): number {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {

      return 0;

    }


    const normalized =
      String(value)
        .replace(/,/g, '')
        .trim();


    const number =
      Number(normalized);


    return Number.isFinite(number)
      ? number
      : 0;

  }


  // =========================================================
  // FORMAT CURRENCY
  // =========================================================

  private formatCurrency(
    value: number
  ): string {

    return this.toFiniteNumber(value)
      .toLocaleString(
        'en-KE',
        {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }
      );

  }


  // =========================================================
  // PREVIOUS STEP
  // =========================================================

  previousStep(): void {

    if (
      this.currentStep > 1
    ) {

      this.currentStep--;

      /*
       * Restore the appropriate limit whenever the user
       * navigates backward.
       */

      this.restoreDisplayedEligibleLimit();

      this.updateLoanLimitState();

    }

  }


  // =========================================================
  // VERIFY IDENTITY
  // =========================================================

  verifyIdentity(): void {

    this.submitError = null;

    this.submitSuccess = null;


    const control =
      this.loanForm
        .get('identificationNumber');


    const id =
      control?.value
        ?.toString()
        .trim();


    const type =
      this.loanForm
        .get('idType')
        ?.value;


    if (!id) {

      this.submitError =
        `${this.getIdentificationLabel()} is required.`;

      return;

    }


    if (
      type === 'NATIONAL_ID' &&
      !/^\d{8}$/.test(id)
    ) {

      this.submitError =
        'Enter a valid 8-digit National ID.';

      control?.markAsTouched();

      return;

    }


    if (
      type === 'MAISHA_CARD' &&
      !/^\d{9}$/.test(id)
    ) {

      this.submitError =
        'Enter a valid 9-digit Maisha Card Number.';

      control?.markAsTouched();

      return;

    }


    if (
      type === 'REGISTRATION_NUMBER' &&
      !id.trim()
    ) {

      this.submitError =
        'Enter a valid Registration Number.';

      control?.markAsTouched();

      return;

    }


    if (
      this.isFetchingAccount
    ) {

      return;

    }


    this.onNationalIdInput();

  }


  // =========================================================
  // IDENTIFICATION LABEL
  // =========================================================

  getIdentificationLabel(): string {

    const type =
      this.loanForm
        .get('idType')
        ?.value;


    switch (type) {

      case 'MAISHA_CARD':
        return 'Maisha Card Number';

      case 'REGISTRATION_NUMBER':
        return 'Registration Number';

      case 'NATIONAL_ID':

      default:
        return 'National ID';

    }

  }


  // =========================================================
  // KEYBOARD VALIDATION
  // =========================================================

  allowOnlyNumbers(
    event: KeyboardEvent
  ): void {

    const key = event.key;


    if (
      !/^\d$/.test(key) &&
      key !== 'Backspace' &&
      key !== 'Delete' &&
      key !== 'ArrowLeft' &&
      key !== 'ArrowRight' &&
      key !== 'Tab'
    ) {

      event.preventDefault();

    }

  }


  // =========================================================
  // PASTE VALIDATION
  // =========================================================

  validatePaste(
    event: ClipboardEvent
  ): void {

    const type =
      this.loanForm
        .get('idType')
        ?.value;


    const pasted =
      event.clipboardData
        ?.getData('text') || '';


    if (
      type === 'REGISTRATION_NUMBER'
    ) {

      return;

    }


    if (
      !/^\d+$/.test(pasted)
    ) {

      event.preventDefault();

    }

  }


  // =========================================================
  // FORMAT NATIONAL ID
  // =========================================================

  formatNationalId(): void {

    const control =
      this.loanForm
        .get('identificationNumber');


    if (!control) {

      return;

    }


    const type =
      this.loanForm
        .get('idType')
        ?.value;


    if (
      type === 'REGISTRATION_NUMBER'
    ) {

      return;

    }


    let value =
      control.value || '';


    value =
      value
        .replace(/\D/g, '')
        .substring(
          0,
          this.selectedIdLength
        );


    control.setValue(
      value,
      {
        emitEvent: false
      }
    );

  }


  // =========================================================
  // ID TYPE CHANGED
  // =========================================================

  onIdTypeChanged(): void {

    const type =
      this.loanForm
        .get('idType')
        ?.value;


    const control =
      this.loanForm
        .get('identificationNumber');


    control?.reset();


    switch (type) {

      case 'NATIONAL_ID':

        this.selectedIdLength = 8;

        this.idPlaceholder =
          'Enter 8-digit National ID';


        control?.setValidators([

          Validators.required,

          Validators.pattern(
            /^\d{8}$/
          )

        ]);

        break;


      case 'MAISHA_CARD':

        this.selectedIdLength = 9;

        this.idPlaceholder =
          'Enter 9-digit Maisha Card Number';


        control?.setValidators([

          Validators.required,

          Validators.pattern(
            /^\d{9}$/
          )

        ]);

        break;


      case 'REGISTRATION_NUMBER':

        this.selectedIdLength = 50;

        this.idPlaceholder =
          'Enter Registration Number';


        control?.setValidators([

          Validators.required,

          Validators.minLength(3)

        ]);

        break;

    }


    control?.updateValueAndValidity();


    this.accountData = null;

    this.accountLoaded = false;

    this.identityVerified = false;

    this.verifiedIdentificationNumber = null;


    this.resetBackendAssessment();


    this.buildPlaceholderExamples();

    this.startIdentityPlaceholderAnimation();

  }


  // =========================================================
  // ID INPUT
  // =========================================================

  onIdInput(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    const type =
      this.loanForm
        .get('idType')
        ?.value;


    let value =
      input.value;


    if (
      input.value &&
      this.placeholderTimer
    ) {

      clearTimeout(
        this.placeholderTimer
      );

      this.placeholderTimer = null;

    }


    if (
      type === 'NATIONAL_ID' ||
      type === 'MAISHA_CARD'
    ) {

      value =
        value
          .replace(/\D/g, '')
          .substring(
            0,
            this.selectedIdLength
          );

    } else if (
      type === 'REGISTRATION_NUMBER'
    ) {

      value =
        value
          .toUpperCase()
          .substring(
            0,
            this.selectedIdLength
          );

    }


    input.value = value;


    this.loanForm
      .get('identificationNumber')
      ?.setValue(
        value,
        {
          emitEvent: false
        }
      );


    /*
     * Changing the identification invalidates the customer
     * and therefore the preliminary limit.
     */

    this.accountData = null;

    this.accountLoaded = false;

    this.identityVerified = false;

    this.verifiedIdentificationNumber = null;

    this.resetBackendAssessment();

  }


  // =========================================================
  // IMAGE
  // =========================================================

  onImageSelected(
    event: Event
  ): void {

    const file =
      (
        event.target as HTMLInputElement
      )
        .files?.[0];


    if (file) {

      this.selectedImageFile = file;

    }

  }


  // =========================================================
  // CUSTOMER VERIFICATION
  // =========================================================

  onNationalIdInput(): void {

    const idControl =
      this.loanForm
        .get('identificationNumber');


    const id =
      idControl?.value
        ?.toString()
        .trim();


    if (!id) {

      this.accountData = null;

      this.accountLoaded = false;

      this.identityVerified = false;

      this.verifiedIdentificationNumber = null;

      this.resetBackendAssessment();

      return;

    }


    if (
      this.isFetchingAccount
    ) {

      return;

    }


    this.isFetchingAccount = true;

    this.submitError = null;

    this.submitSuccess = null;

    this.identityVerified = false;

    this.accountLoaded = false;

    this.accountData = null;

    this.verifiedIdentificationNumber = null;


    this.resetBackendAssessment();


    this.accountService
      .getAccountDetailsByNationalId(id)
      .subscribe({

        next: (res: any) => {

          console.log(
            'CUSTOMER VERIFICATION RESPONSE:',
            res
          );


          this.isFetchingAccount = false;


          this.accountData = res;

          this.accountLoaded = true;


          this.verifiedIdentificationNumber =
            res?.identificationNumber ||
            res?.nationalId ||
            res?.idNo ||
            res?.registrationNumber ||
            id;


          /*
           * Populate verified customer data.
           */

          this.loanForm.patchValue({

            identificationNumber:
              this.verifiedIdentificationNumber,

            fullName:
              res?.fullName || '',

            phoneNumber:
              res?.phoneNumber || '',

            location:
              `${res?.city || ''}, ${res?.county || ''}`,

            monthlyIncome:
              this.toFiniteNumber(
                res?.monthlyIncome
              ),

            monthlyExpenses:
              this.toFiniteNumber(
                res?.monthlyExpenses
              )

          });


          [
            'fullName',
            'phoneNumber',
            'monthlyIncome'
          ].forEach(field => {

            this.loanForm
              .get(field)
              ?.disable();

          });


          this.identityVerified = true;

          this.accountLoaded = true;


          /*
           * =================================================
           * CRITICAL
           * =================================================
           *
           * Calculate the preliminary limit ONCE when the
           * customer has been successfully verified.
           *
           * It is now available before Step 2 opens.
           */

          this.calculatePreliminaryEligibleLimit();


          /*
           * Make sure the UI uses the preliminary limit.
           */

          this.restoreDisplayedEligibleLimit();

          this.updateLoanLimitState();


          this.submitError = null;


          this.submitSuccess =
            `${this.getIdentificationLabel()} verified successfully. You may continue with your loan application.`;


          this.setStep(
            'account',
            {
              loading: false,
              done: true
            }
          );


          this.cdr.detectChanges();


          setTimeout(() => {

            this.submitSuccess = null;

          }, 4000);

        },


        error: (err) => {

          console.error(
            'CUSTOMER VERIFICATION ERROR:',
            err
          );


          this.isFetchingAccount = false;

          this.accountData = null;

          this.accountLoaded = false;

          this.identityVerified = false;

          this.verifiedIdentificationNumber = null;


          this.resetBackendAssessment();


          if (
            err?.status === 404
          ) {

            this.submitError =
              'No customer account was found for the identification provided.';

          } else {

            this.submitError =
              'Unable to verify the customer. Please try again.';

          }


          this.setStep(
            'account',
            {
              loading: false,
              done: false
            }
          );

        }

      });

  }


  // =========================================================
  // RESET BACKEND ASSESSMENT
  // =========================================================
  //
  // IMPORTANT:
  //
  // This method NO LONGER destroys the preliminary limit.
  //
  // That was the main reason the Step 2 limit disappeared.
  //
  // =========================================================

  private resetBackendAssessment(): void {

    this.submitLoanPreview = null;

    this.exceedsLimit = false;

    this.estimatedInterest = 0;

    this.totalRepayable = 0;

    this.estimatedMonthlyRepayment = 0;

    this.calculatedDueDate = '';

    this.affordabilityScore = 0;

    this.approvalProbability = 0;

    this.eligibilityRequested = false;


    /*
     * Restore the stable preliminary limit if the customer
     * is still verified.
     */

    if (
      this.accountLoaded &&
      this.accountData &&
      this.preliminaryEligibleLimit > 0
    ) {

      this.eligibleLimit =
        this.preliminaryEligibleLimit;

    } else {

      this.eligibleLimit = 0;

    }


    this.eligibilitySteps =
      this.eligibilitySteps.map(
        step => ({
          ...step,
          done: false,
          loading: false
        })
      );


    /*
     * Recalculate amount-vs-limit state using the restored
     * preliminary limit.
     */

    this.updateLoanLimitState();

  }


  // =========================================================
  // BACKEND PREVIEW
  // =========================================================

  calculatePreview(): void {

    const intelligence: any =
      this.submitLoanPreview;


    /*
     * If there is no backend assessment yet,
     * DO NOT destroy the preliminary limit.
     */

    if (!intelligence) {

      this.restoreDisplayedEligibleLimit();

      this.updateLoanLimitState();

      this.estimatedInterest = 0;

      this.totalRepayable = 0;

      this.estimatedMonthlyRepayment = 0;

      this.calculatedDueDate = '';

      return;

    }


    const amount =
      this.parseAmount(
        this.loanForm
          .get('amount')
          ?.value
      );


    // =======================================================
    // BACKEND ELIGIBLE AMOUNT
    // =======================================================

    this.eligibleLimit =
      this.toFiniteNumber(
        intelligence?.eligibleAmount
      );


    this.exceedsLimit =
      this.eligibleLimit > 0 &&
      amount >
      this.eligibleLimit;


    // =======================================================
    // BACKEND RISK SCORE
    // =======================================================

    const backendRiskScore =
      this.toFiniteNumber(
        intelligence?.riskScore
      );


    this.affordabilityScore =
      backendRiskScore > 0
        ? Math.max(
            0,
            Math.min(
              100,
              100 - backendRiskScore
            )
          )
        : 0;


    // =======================================================
    // BACKEND APPROVAL CONFIDENCE
    // =======================================================

    this.approvalProbability =
      this.toFiniteNumber(
        intelligence?.aiConfidence
      );


    // =======================================================
    // BACKEND INTEREST RATE
    // =======================================================

    this.estimatedInterest =
      this.toFiniteNumber(
        intelligence?.interestRate
      );


    // =======================================================
    // BACKEND TOTAL REPAYABLE
    // =======================================================

    this.totalRepayable =
      this.toFiniteNumber(
        intelligence?.totalRepayable ??
        intelligence?.totalRepayableAmount
      );


    // =======================================================
    // BACKEND MONTHLY REPAYMENT
    // =======================================================

    this.estimatedMonthlyRepayment =
      this.toFiniteNumber(
        intelligence?.monthlyRepayment ??
        intelligence?.monthlyRepaymentAmount
      );


    // =======================================================
    // BACKEND DUE DATE
    // =======================================================

    this.calculatedDueDate =
      intelligence?.dueDate
        ? String(
            intelligence.dueDate
          )
        : '';

  }


  // =========================================================
  // BACKEND VALUE HELPERS
  // =========================================================

  private toFiniteNumber(
    value: any
  ): number {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {

      return 0;

    }


    const number =
      Number(value);


    return Number.isFinite(number)
      ? number
      : 0;

  }


  // =========================================================
  // BACKEND DURATION
  // =========================================================

  calculateDurationMonths(): number {

    const intelligence: any =
      this.submitLoanPreview;


    if (!intelligence) {

      return 0;

    }


    const directMonths =
      Number(
        intelligence?.durationMonths
      );


    if (
      Number.isFinite(directMonths) &&
      directMonths > 0
    ) {

      return directMonths;

    }


    const duration =
      String(
        intelligence?.duration || ''
      );


    const match =
      duration.match(
        /(\d+(?:\.\d+)?)\s*month/i
      );


    if (match) {

      return Number(
        match[1]
      );

    }


    return 0;

  }


  // =========================================================
  // BACKEND RISK SCORE
  // =========================================================

  calculateRiskScore(): number {

    return this.toFiniteNumber(
      this.submitLoanPreview?.riskScore
    );

  }


  // =========================================================
  // BACKEND INTEREST RATE
  // =========================================================

  calculateInterestRate(): number {

    return this.toFiniteNumber(
      this.submitLoanPreview?.interestRate
    );

  }


  // =========================================================
  // CLEAR CUSTOMER FIELDS
  // =========================================================

  clearAutoFields(): void {

    this.loanForm.patchValue({

      fullName: '',

      phoneNumber: '',

      location: '',

      monthlyIncome: 0,

      monthlyExpenses: 0

    });


    [
      'fullName',
      'phoneNumber',
      'location',
      'monthlyIncome',
      'monthlyExpenses'
    ].forEach(field => {

      this.loanForm
        .get(field)
        ?.enable();

    });


    this.accountData = null;

    this.accountLoaded = false;

    this.identityVerified = false;

    this.verifiedIdentificationNumber = null;

    this.resetBackendAssessment();

  }


  // =========================================================
  // SCROLL TO REVIEW
  // =========================================================

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


  // =========================================================
  // CREDIT INTELLIGENCE ASSESSMENT
  // =========================================================

  async assessLoanEligibility(): Promise<void> {

    if (
      this.isAssessing ||
      this.eligibilityRunning
    ) {

      return;

    }


    this.isAssessing = true;

    this.eligibilityRunning = true;

    this.eligibilityRequested = false;

    this.submitError = null;

    this.submitSuccess = null;


    /*
     * IMPORTANT:
     *
     * Do NOT set eligibleLimit = 0 here.
     *
     * Keep the preliminary limit visible while the backend
     * assessment is running.
     */

    this.submitLoanPreview = null;


    this.eligibilitySteps =
      this.eligibilitySteps.map(
        step => ({
          ...step,
          done: false,
          loading: false
        })
      );


    try {

      const raw =
        this.loanForm.getRawValue();


      const identificationNumber =
        String(
          raw.identificationNumber || ''
        ).trim();


      const amount =
        this.parseAmount(
          raw.amount
        );


      const monthlyIncome =
        this.toFiniteNumber(
          raw.monthlyIncome
        );


      const monthlyExpenses =
        this.toFiniteNumber(
          raw.monthlyExpenses
        );


      const phoneNumber =
        String(
          raw.phoneNumber || ''
        ).trim();


      // =====================================================
      // VALIDATION
      // =====================================================

      if (!identificationNumber) {

        throw new Error(
          'Please enter the customer identification number first.'
        );

      }


      if (this.isFetchingAccount) {

        throw new Error(
          'Please wait for customer verification to complete.'
        );

      }


      if (
        !this.accountLoaded ||
        !this.accountData
      ) {

        throw new Error(
          'Customer account has not been verified.'
        );

      }


      if (monthlyIncome <= 0) {

        throw new Error(
          'The customer monthly income must be greater than zero.'
        );

      }


      if (monthlyExpenses < 0) {

        throw new Error(
          'Monthly expenses cannot be negative.'
        );

      }


      if (
        monthlyExpenses >=
        monthlyIncome
      ) {

        throw new Error(
          'Monthly expenses must be lower than monthly income.'
        );

      }


      if (amount <= 0) {

        throw new Error(
          'Please enter a valid loan amount.'
        );

      }


      // =====================================================
      // BACKEND REQUEST
      // =====================================================

      const requestBody = {

        requestedAmount:
          amount,

        monthlyIncome:
          monthlyIncome,

        monthlyExpenses:
          monthlyExpenses,

        phoneNumber:
          phoneNumber,

        identificationNumber:
          identificationNumber

      };


      console.log(
        '=============================================='
      );

      console.log(
        'CREDITBANK — BACKEND CREDIT INTELLIGENCE REQUEST'
      );

      console.log(
        requestBody
      );

      console.log(
        '=============================================='
      );


      // =====================================================
      // STEP 1 — ACCOUNT VERIFICATION
      // =====================================================

      this.setStep(
        'account',
        {
          loading: true,
          done: false
        }
      );


      await this.sleep(300);


      this.setStep(
        'account',
        {
          loading: false,
          done: true
        }
      );


      // =====================================================
      // STEP 2 — RISK SCORING
      // =====================================================

      this.setStep(
        'risk',
        {
          loading: true,
          done: false
        }
      );


      await this.sleep(300);


      this.setStep(
        'risk',
        {
          loading: false,
          done: true
        }
      );


      // =====================================================
      // STEP 3 — REAL BACKEND CREDIT INTELLIGENCE
      // =====================================================

      this.setStep(
        'eligibility',
        {
          loading: true,
          done: false
        }
      );


      const response:
        LoanAssessmentResponse =
          await firstValueFrom(

            this.loanService
              .getCreditIntelligenceByNationalId(
                identificationNumber,
                requestBody
              )

          );


      console.log(
        '=============================================='
      );

      console.log(
        'CREDITBANK — BACKEND CREDIT INTELLIGENCE RESPONSE'
      );

      console.log(
        response
      );

      console.log(
        '=============================================='
      );


      if (!response) {

        throw new Error(
          'The credit intelligence service returned an empty response.'
        );

      }


      // =====================================================
      // STORE BACKEND ASSESSMENT
      // =====================================================

      this.submitLoanPreview =
        response;


      const intelligence: any =
        response;


      // =====================================================
      // BACKEND ELIGIBLE AMOUNT
      // =====================================================

      const backendEligibleAmount =
        this.toFiniteNumber(
          intelligence?.eligibleAmount
        );


      if (
        backendEligibleAmount < 0
      ) {

        throw new Error(
          'The credit intelligence service returned an invalid eligible amount.'
        );

      }


      /*
       * Backend now becomes authoritative.
       */

      this.eligibleLimit =
        backendEligibleAmount;


      // =====================================================
      // REQUESTED AMOUNT VS BACKEND LIMIT
      // =====================================================

      this.exceedsLimit =
        backendEligibleAmount > 0 &&
        amount >
        backendEligibleAmount;


      // =====================================================
      // LOAD BACKEND PREVIEW VALUES
      // =====================================================

      this.calculatePreview();


      // =====================================================
      // STEP 3 COMPLETE
      // =====================================================

      this.setStep(
        'eligibility',
        {
          loading: false,
          done: true
        }
      );


      // =====================================================
      // STEP 4 — FINAL DECISION
      // =====================================================

      this.setStep(
        'decision',
        {
          loading: true,
          done: false
        }
      );


      await this.sleep(300);


      this.setStep(
        'decision',
        {
          loading: false,
          done: true
        }
      );


      this.eligibilityRequested = true;


      console.log(
        'BACKEND ELIGIBLE AMOUNT:',
        this.eligibleLimit
      );

      console.log(
        'PRELIMINARY ELIGIBLE AMOUNT:',
        this.preliminaryEligibleLimit
      );

      console.log(
        'REQUESTED AMOUNT:',
        amount
      );

      console.log(
        'EXCEEDS LIMIT:',
        this.exceedsLimit
      );

      console.log(
        'BACKEND RISK SCORE:',
        intelligence?.riskScore
      );

      console.log(
        'BACKEND RECOMMENDATION:',
        intelligence?.recommendation
      );

      console.log(
        'BACKEND PREDICTIVE RISK:',
        intelligence?.predictiveRisk
      );


      this.cdr.detectChanges();


      this.submitSuccess =
        'Credit assessment completed successfully.';


      setTimeout(() => {

        this.submitSuccess = null;

      }, 4000);

    } catch (err: any) {

      console.error(
        '=============================================='
      );

      console.error(
        'CREDITBANK — CREDIT ASSESSMENT FAILED'
      );

      console.error(
        err
      );

      console.error(
        '=============================================='
      );


      /*
       * Assessment failed.
       *
       * Keep the preliminary limit visible instead of
       * replacing it with ZERO.
       */

      this.submitLoanPreview = null;

      this.restoreDisplayedEligibleLimit();

      this.updateLoanLimitState();


      this.eligibilitySteps =
        this.eligibilitySteps.map(
          step => ({
            ...step,
            loading: false
          })
        );


      this.submitError =
        this.extractErrorMessage(err);

    } finally {

      this.isAssessing = false;

      this.eligibilityRunning = false;

      this.eligibilitySteps =
        [...this.eligibilitySteps];

      this.cdr.detectChanges();

    }

  }


  // =========================================================
  // SUBMIT LOAN
  // =========================================================

  async submitLoan(): Promise<void> {

    // =======================================================
    // 0. PREVENT DUPLICATE SUBMISSIONS
    // =======================================================

    if (
      this.submitInProgress ||
      this.isSubmitting ||
      this.isAssessing
    ) {

      return;

    }


    this.submitInProgress = true;

    this.submitError = null;

    this.submitSuccess = null;


    try {

      // =====================================================
      // 1. CUSTOMER VERIFICATION
      // =====================================================

      if (
        !this.accountLoaded ||
        !this.accountData ||
        !this.identityVerified
      ) {

        this.submitError =
          'Customer verification is required before submitting the loan application.';

        return;

      }


      // =====================================================
      // 2. IDENTIFICATION NUMBER
      // =====================================================

      const identificationNumber =
        this.verifiedIdentificationNumber ||
        this.loanForm
          .get('identificationNumber')
          ?.value
          ?.toString()
          .trim() ||
        '';


      if (!identificationNumber) {

        this.submitError =
          'The verified identification number could not be found. Please return to Step 1 and verify the customer again.';

        return;

      }


      // =====================================================
      // 3. MAKE SURE CREDIT ASSESSMENT IS NOT RUNNING
      // =====================================================

      if (
        this.eligibilityRunning ||
        this.isAssessing
      ) {

        this.submitError =
          'Credit assessment is still running. Please wait for it to complete.';

        return;

      }


      // =====================================================
      // 4. CREDIT ASSESSMENT MUST EXIST
      // =====================================================

      if (!this.submitLoanPreview) {

        await this.assessLoanEligibility();


        if (!this.submitLoanPreview) {

          this.submitError =
            'Credit assessment could not be completed. The loan was not submitted.';

          return;

        }

      }


      // =====================================================
      // 5. BACKEND CREDIT INTELLIGENCE RESULT
      // =====================================================

      const aiReport: any =
        this.submitLoanPreview;


      const recommendation =
        String(
          aiReport?.recommendation || ''
        )
          .trim()
          .toUpperCase();


      // =====================================================
      // 6. HONOUR BACKEND CREDIT DECISION
      // =====================================================

      if (
        recommendation ===
        'BLOCK & INVESTIGATE'
      ) {

        this.submitError =
          aiReport?.aiReason ||
          'Application blocked by the backend credit risk assessment.';

        return;

      }


      if (
        recommendation === 'DECLINE' ||
        recommendation === 'DECLINED'
      ) {

        this.submitError =
          aiReport?.aiReason ||
          'The backend credit assessment has declined this application.';

        return;

      }


      // =====================================================
      // 7. BACKEND ELIGIBLE AMOUNT
      // =====================================================

      const backendEligibleAmount =
        this.toFiniteNumber(
          aiReport?.eligibleAmount
        );


      // =====================================================
      // 8. REQUESTED AMOUNT
      // =====================================================

      const requestedAmount =
        this.parseAmount(
          this.loanForm
            .get('amount')
            ?.value
        );


      // =====================================================
      // 9. VALIDATE REQUESTED AMOUNT
      // =====================================================

      if (
        requestedAmount <= 0
      ) {

        this.submitError =
          'Please enter a valid loan amount before submitting the application.';

        return;

      }


      // =====================================================
      // 10. BACKEND ELIGIBILITY MUST BE POSITIVE
      // =====================================================

      if (
        backendEligibleAmount <= 0
      ) {

        this.submitError =
          'The backend credit assessment returned an eligible amount of KES 0. The application cannot be submitted.';

        return;

      }


      // =====================================================
      // 11. REQUESTED AMOUNT VS BACKEND ELIGIBLE AMOUNT
      // =====================================================

      if (
        requestedAmount >
        backendEligibleAmount
      ) {

        this.eligibleLimit =
          backendEligibleAmount;

        this.exceedsLimit = true;

        this.submitError =
          `Requested amount exceeds the backend eligible limit of KES ${
            this.formatCurrency(
              backendEligibleAmount
            )
          }.`;

        return;

      }


      this.eligibleLimit =
        backendEligibleAmount;

      this.exceedsLimit = false;


      // =====================================================
      // 12. FORM VALIDATION
      // =====================================================

      if (
        this.loanForm.invalid
      ) {

        this.loanForm.markAllAsTouched();

        this.submitError =
          'Please complete all required fields before submitting the loan application.';

        return;

      }


      // =====================================================
      // 13. DECLARATION
      // =====================================================

      if (
        !this.loanForm
          .get('agreeTerms')
          ?.value
      ) {

        this.submitError =
          'Please accept the declaration before submitting the application.';


        document
          .getElementById('agreeTerms')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });

        return;

      }


      // =====================================================
      // 14. START SUBMISSION
      // =====================================================

      this.isSubmitting = true;


      const raw =
        this.loanForm.getRawValue();


      // =====================================================
      // 15. BACKEND-DERIVED LOAN TERMS
      // =====================================================

      const backendDurationValue =
        aiReport?.approvedDurationWeeks ??
        aiReport?.durationMonths ??
        aiReport?.duration ??
        '';


      const backendDuration =
        backendDurationValue !== null &&
        backendDurationValue !== undefined
          ? String(
              backendDurationValue
            ).trim()
          : '';


      // -----------------------------------------------------
      // DUE DATE
      // -----------------------------------------------------

      const backendDueDateValue =
        aiReport?.dueDate;


      const backendDueDate =
        backendDueDateValue !== null &&
        backendDueDateValue !== undefined
          ? String(
              backendDueDateValue
            ).trim()
          : '';


      // -----------------------------------------------------
      // INTEREST RATE
      // -----------------------------------------------------

      const backendInterestRateNumber =
        this.toFiniteNumber(
          aiReport?.interestRate
        );


      const backendInterestRate =
        Number.isFinite(
          backendInterestRateNumber
        )
          ? String(
              backendInterestRateNumber
            )
          : '';


      // -----------------------------------------------------
      // RISK SCORE
      // -----------------------------------------------------

      const backendRiskScoreNumber =
        this.toFiniteNumber(
          aiReport?.riskScore
        );


      const backendRiskScore =
        Number.isFinite(
          backendRiskScoreNumber
        )
          ? String(
              backendRiskScoreNumber
            )
          : '';


      // =====================================================
      // 16. BUILD FORM DATA
      // =====================================================

      const formData =
        new FormData();


      formData.append(
        'applicantName',
        raw.fullName || ''
      );


      formData.append(
        'idNo',
        identificationNumber
      );


      formData.append(
        'phoneNumber',
        raw.phoneNumber || ''
      );


      formData.append(
        'location',
        raw.location || ''
      );


      formData.append(
        'amount',
        String(
          requestedAmount
        )
      );


      formData.append(
        'monthlyIncome',
        String(
          Number(
            raw.monthlyIncome
          ) || 0
        )
      );


      formData.append(
        'monthlyExpenses',
        String(
          Number(
            raw.monthlyExpenses
          ) || 0
        )
      );


      formData.append(
        'applicationDate',
        raw.applicationDate || ''
      );


      /*
       * NOTE:
       *
       * Your backend is being changed toward backend-authoritative
       * terms. If the current LoanController no longer accepts
       * duration, interestRate or riskScore, remove these three
       * append calls from this frontend as well.
       *
       * They are retained here only because they existed in the
       * supplied component.
       */

      if (
        backendDuration
      ) {

        formData.append(
          'duration',
          backendDuration
        );

      }


      if (
        backendDueDate
      ) {

        formData.append(
          'dueDate',
          backendDueDate
        );

      }


      if (
        backendInterestRate
      ) {

        formData.append(
          'interestRate',
          backendInterestRate
        );

      }


      if (
        backendRiskScore
      ) {

        formData.append(
          'riskScore',
          backendRiskScore
        );

      }


      // =====================================================
      // 17. OPTIONAL SUPPORTING FILE
      // =====================================================

      if (
        this.selectedImageFile
      ) {

        formData.append(
          'file',
          this.selectedImageFile
        );

      }


      // =====================================================
      // 18. SUBMIT TO BACKEND
      // =====================================================

      const response =
        await firstValueFrom(

          this.loanService
            .addLoanWithImage(
              formData
            )

        );


      // =====================================================
      // 19. BACKEND RESPONSE
      // =====================================================

      const savedLoan: any =
        response || {};


      // =====================================================
      // 20. CREATE UI SUCCESS MODEL
      // =====================================================

      this.submittedLoan = {

        id:
          savedLoan?.id ??
          null,

        applicationNumber:
          savedLoan?.applicationNumber ??
          null,

        applicantName:
          savedLoan?.applicantName ??
          raw.fullName ??
          '',

        idNo:
          identificationNumber,

        phoneNumber:
          savedLoan?.phoneNumber ??
          raw.phoneNumber ??
          '',

        location:
          savedLoan?.location ??
          raw.location ??
          '',

        amount:
          savedLoan?.amount ??
          requestedAmount,

        duration:
          savedLoan?.duration ??
          backendDuration,

        dueDate:
          savedLoan?.dueDate ??
          backendDueDate,

        interestRate:
          savedLoan?.interestRate ??
          (
            Number.isFinite(
              backendInterestRateNumber
            )
              ? backendInterestRateNumber
              : 0
          ),

        riskScore:
          Number.isFinite(
            backendRiskScoreNumber
          )
            ? backendRiskScoreNumber
            : 0,

        applicationDate:
          savedLoan?.applicationDate ??
          raw.applicationDate ??
          '',

        monthlyIncome:
          Number(
            raw.monthlyIncome
          ) || 0,

        monthlyExpenses:
          Number(
            raw.monthlyExpenses
          ) || 0,

        status:
          savedLoan?.status ??
          'SUBMITTED',

        predictiveRisk:
          aiReport?.predictiveRisk ??
          'NOT AVAILABLE',

        recommendation:
          aiReport?.recommendation ??
          'SUBMITTED FOR PROCESSING',

        eligibleAmount:
          this.toFiniteNumber(
            aiReport?.eligibleAmount
          ),

        behavioralScore:
          this.toFiniteNumber(
            aiReport?.behavioralScore
          ),

        kycScore:
          this.toFiniteNumber(
            aiReport?.kycScore
          ),

        fraudFlag:
          Boolean(
            aiReport?.fraudFlag
          ),

        parCategory:
          aiReport?.parCategory ??
          'CURRENT',

        daysPastDue:
          this.toFiniteNumber(
            aiReport?.daysPastDue
          ),

        completedLoans:
          this.toFiniteNumber(
            aiReport?.completedLoans
          ),

        overdueLoans:
          this.toFiniteNumber(
            aiReport?.overdueLoans
          ),

        aiConfidence:
          this.toFiniteNumber(
            aiReport?.aiConfidence
          ),

        aiReason:
          aiReport?.aiReason ??
          'Credit assessment completed.'

      };


      // =====================================================
      // 21. STORE BACKEND LOAN ID
      // =====================================================

      this.submittedLoanId =
        this.submittedLoan?.id ??
        null;


      // =====================================================
      // 22. STORE APPLICATION NUMBER
      // =====================================================

      this.submittedApplicationNumber =
        this.submittedLoan
          ?.applicationNumber ??
        null;


      // =====================================================
      // 23. STORE BACKEND STATUS
      // =====================================================

      this.submittedLoanStatus =
        this.submittedLoan?.status ||
        'SUBMITTED';


      // =====================================================
      // 24. APPLICATION NUMBER
      // =====================================================

      if (
        !this.submittedApplicationNumber
      ) {

        console.warn(
          'CREDITBANK: Backend did not return an applicationNumber.'
        );

      }


      // =====================================================
      // 25. SUCCESS STATE
      // =====================================================

      this.submitError = null;

      this.submitSuccess =
        'Your loan application has been submitted successfully.';

      this.submissionComplete = true;

      this.currentStep = 4;


      // =====================================================
      // 26. FORCE UI UPDATE
      // =====================================================

      this.cdr.detectChanges();


      // =====================================================
      // 27. DEBUG LOGGING
      // =====================================================

      console.log(
        '=============================================='
      );

      console.log(
        'CREDITBANK — LOAN SUBMISSION SUCCESSFUL'
      );

      console.log(
        'Backend Loan:',
        response
      );

      console.log(
        'Credit Intelligence:',
        aiReport
      );

      console.log(
        'Submitted Loan:',
        this.submittedLoan
      );

      console.log(
        'Backend Eligible Amount:',
        backendEligibleAmount
      );

      console.log(
        'Preliminary Eligible Amount:',
        this.preliminaryEligibleLimit
      );

      console.log(
        'Requested Amount:',
        requestedAmount
      );

      console.log(
        '=============================================='
      );


      // =====================================================
      // 28. SCROLL TO SUCCESS REPORT
      // =====================================================

      setTimeout(() => {

        const report =
          document.querySelector(
            '.loan-success-report'
          ) as HTMLElement | null;


        if (report) {

          report.scrollIntoView({

            behavior: 'smooth',

            block: 'start'

          });

        } else {

          console.warn(
            'CREDITBANK — SUCCESS REPORT NOT FOUND IN DOM'
          );

        }

      }, 300);


    } catch (err: any) {

      console.error(
        '=============================================='
      );

      console.error(
        'CREDITBANK — LOAN SUBMISSION FAILED'
      );

      console.error(
        'HTTP STATUS:',
        err?.status
      );

      console.error(
        'HTTP STATUS TEXT:',
        err?.statusText
      );

      console.error(
        'ERROR URL:',
        err?.url
      );

      console.error(
        'ERROR BODY:',
        err?.error
      );

      console.error(
        'FULL ERROR:',
        err
      );

      console.error(
        '=============================================='
      );


      this.submissionComplete = false;

      this.submittedLoan = null;

      this.submittedLoanId = null;

      this.submittedApplicationNumber = null;

      this.submittedLoanStatus = null;


      this.submitError =
        this.extractErrorMessage(
          err
        );


    } finally {

      this.isSubmitting = false;

      this.submitInProgress = false;

    }

  }


  // =========================================================
  // COPY APPLICATION REFERENCE
  // =========================================================

  copyApplicationReference(): void {

    if (
      !this.submittedApplicationNumber
    ) {

      return;

    }


    navigator.clipboard
      .writeText(
        this.submittedApplicationNumber
      )
      .then(() => {

        this.submitSuccess =
          'Application reference copied successfully.';

      })
      .catch(err => {

        console.error(
          'Unable to copy application reference:',
          err
        );

      });

  }


  // =========================================================
  // LOAN LIMIT PROGRESS
  // =========================================================

  getLoanLimitProgress(): number {

    const amount =
      this.parseAmount(
        this.loanForm
          .get('amount')
          ?.value
      );


    const limit =
      this.toFiniteNumber(
        this.eligibleLimit
      );


    if (
      limit <= 0 ||
      amount <= 0
    ) {

      return 0;

    }


    return Math.min(
      (
        amount /
        limit
      ) * 100,
      100
    );

  }


  // =========================================================
  // LOAN AMOUNT INPUT
  // =========================================================
  //
  // IMPORTANT:
  //
  // Changing the amount invalidates the previous backend
  // assessment.
  //
  // BUT it DOES NOT destroy the preliminary limit.
  //
  // =========================================================

  onLoanAmountInput(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    let value =
      input.value
        .replace(/[^0-9.]/g, '');


    const parts =
      value.split('.');


    if (
      parts.length > 2
    ) {

      value =
        parts[0] +
        '.' +
        parts.slice(1).join('');

    }


    if (
      parts.length === 2
    ) {

      value =
        parts[0] +
        '.' +
        parts[1].substring(
          0,
          2
        );

    }


    input.value = value;


    const numericValue =
      value
        ? Number(value)
        : null;


    const currentAmount =
      this.parseAmount(
        this.loanForm
          .get('amount')
          ?.value
      );


    const newAmount =
      numericValue || 0;


    this.loanForm
      .get('amount')
      ?.setValue(
        numericValue,
        {
          emitEvent: false
        }
      );


    /*
     * Only invalidate the backend assessment if the amount
     * genuinely changed.
     */

    if (
      currentAmount !== newAmount
    ) {

      this.resetBackendAssessment();

    }


    /*
     * Recalculate only the comparison state.
     *
     * The eligible limit itself remains stable.
     */

    this.updateLoanLimitState();

  }


  // =========================================================
  // FORMAT LOAN AMOUNT
  // =========================================================
  //
  // IMPORTANT:
  //
  // Formatting alone must NEVER destroy the eligibility
  // information.
  //
  // =========================================================

  formatLoanAmount(): void {

    const control =
      this.loanForm
        .get('amount');


    if (!control) {

      return;

    }


    const oldAmount =
      this.parseAmount(
        control.value
      );


    if (
      oldAmount > 0
    ) {

      control.setValue(

        Number(
          oldAmount.toFixed(2)
        ),

        {
          emitEvent: false
        }

      );


      const input =
        document.getElementById(
          'step2LoanAmount'
        ) as HTMLInputElement;


      if (input) {

        input.value =
          oldAmount.toLocaleString(
            'en-KE',
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          );

      }

    }


    /*
     * IMPORTANT:
     *
     * Do NOT resetBackendAssessment() here.
     *
     * Formatting does not mean the user changed the amount.
     */

    this.updateLoanLimitState();

  }


  // =========================================================
  // PULL LOAN RECEIPT / REPORT
  // =========================================================

  pullLoanReceipt(): void {

    if (
      !this.submissionComplete ||
      !this.submittedLoan
    ) {

      this.submitError =
        'The loan application report is not available because the loan submission data could not be found.';

      return;

    }


    if (
      this.receiptGenerating
    ) {

      return;

    }


    this.receiptGenerating = true;

    this.submitError = null;

    this.submitSuccess = null;


    try {

      const loan =
        this.submittedLoan;


      const reportReference =
        this.submittedApplicationNumber ||
        loan?.applicationNumber ||
        'CREDITBANK-LOAN';


      const reportElement =
        document.querySelector(
          '.loan-success-report'
        ) as HTMLElement | null;


      if (!reportElement) {

        throw new Error(
          'Loan success report element could not be found.'
        );

      }


      const reportWindow =
        window.open(
          '',
          '_blank',
          'width=1000,height=850,scrollbars=yes,resizable=yes'
        );


      if (!reportWindow) {

        throw new Error(
          'The report window was blocked by the browser. Please allow pop-ups for CreditBank.'
        );

      }


      const reportHtml =
        reportElement.outerHTML;


      reportWindow.document.open();


      reportWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

          <meta charset="UTF-8">

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          >

          <title>
            ${reportReference} - CreditBank Loan Report
          </title>

          <style>

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 30px;
              background: #f4f7fb;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
              color: #172033;
            }

            .loan-success-report {
              max-width: 1100px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 20px;
              padding: 35px;
              box-shadow:
                0 15px 50px
                rgba(15, 60, 100, .10);
            }

            .success-report-hero {
              display: flex;
              align-items: center;
              gap: 20px;
              padding: 25px;
              border-radius: 18px;
              background:
                linear-gradient(
                  135deg,
                  #eef7ff,
                  #ffffff
                );
              border:
                1px solid #d8e8f7;
            }

            .success-report-icon {
              width: 64px;
              height: 64px;
              min-width: 64px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              background: #198754;
              color: #ffffff;
              font-size: 28px;
            }

            .success-report-heading {
              flex: 1;
            }

            .success-eyebrow {
              display: block;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: .08em;
              color: #0d6efd;
              margin-bottom: 6px;
            }

            .success-report-heading h1 {
              margin: 0;
              font-size: 27px;
              color: #102a43;
            }

            .success-report-heading p {
              margin: 8px 0 0;
              color: #64748b;
              line-height: 1.5;
            }

            .success-status-badge {
              white-space: nowrap;
              padding: 10px 15px;
              border-radius: 999px;
              background: #e9f8ef;
              color: #157347;
              font-weight: 800;
              font-size: 12px;
            }

            .application-reference-card {
              display: flex;
              align-items: center;
              gap: 18px;
              margin-top: 22px;
              padding: 20px;
              border-radius: 15px;
              background: #f8fbff;
              border: 1px solid #dceafa;
            }

            .reference-icon {
              width: 50px;
              height: 50px;
              min-width: 50px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 12px;
              background: #e8f2ff;
              color: #0d6efd;
              font-size: 20px;
            }

            .reference-content {
              flex: 1;
            }

            .reference-content span {
              display: block;
              font-size: 11px;
              font-weight: 800;
              color: #64748b;
              letter-spacing: .07em;
            }

            .reference-content strong {
              display: block;
              margin-top: 4px;
              font-size: 22px;
              color: #0d47a1;
            }

            .reference-content small {
              display: block;
              margin-top: 4px;
              color: #64748b;
            }

            .copy-reference-button {
              border: 0;
              padding: 10px 15px;
              border-radius: 9px;
              background: #0d6efd;
              color: #ffffff;
              font-weight: 700;
            }

            .success-report-grid {
              display: grid;
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
              gap: 18px;
              margin-top: 22px;
            }

            .success-report-card {
              padding: 22px;
              border-radius: 15px;
              background: #ffffff;
              border: 1px solid #e1eaf4;
              box-shadow:
                0 5px 20px
                rgba(15, 50, 90, .05);
            }

            .report-card-header {
              display: flex;
              align-items: center;
              gap: 12px;
              padding-bottom: 15px;
              margin-bottom: 15px;
              border-bottom:
                1px solid #e7edf5;
            }

            .report-card-icon {
              width: 42px;
              height: 42px;
              min-width: 42px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 10px;
              background: #edf5ff;
              color: #0d6efd;
            }

            .report-card-header span {
              display: block;
              font-size: 10px;
              font-weight: 800;
              color: #64748b;
              letter-spacing: .07em;
            }

            .report-card-header h3 {
              margin: 3px 0 0;
              font-size: 16px;
              color: #102a43;
            }

            .report-detail-list {
              display: grid;
              gap: 12px;
            }

            .report-detail {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding: 10px 0;
              border-bottom:
                1px dashed #e5eaf0;
            }

            .report-detail:last-child {
              border-bottom: 0;
            }

            .report-detail span {
              color: #64748b;
              font-size: 13px;
            }

            .report-detail strong {
              color: #172033;
              font-size: 13px;
              text-align: right;
            }

            .amount-value {
              color: #0d47a1 !important;
              font-size: 16px !important;
            }

            .repayment-highlight {
              padding: 18px;
              margin-bottom: 15px;
              border-radius: 12px;
              background: #eef7ff;
              border: 1px solid #d6e8fa;
            }

            .repayment-highlight span {
              display: block;
              font-size: 10px;
              font-weight: 800;
              color: #64748b;
              letter-spacing: .06em;
            }

            .repayment-highlight strong {
              display: block;
              margin-top: 5px;
              font-size: 25px;
              color: #0d47a1;
            }

            .success-next-steps {
              display: flex;
              gap: 15px;
              margin-top: 22px;
              padding: 18px;
              border-radius: 13px;
              background: #f8fbff;
              border: 1px solid #e1ebf6;
            }

            .next-step-icon {
              color: #0d6efd;
              font-size: 22px;
            }

            .success-next-steps strong {
              color: #102a43;
            }

            .success-next-steps p {
              margin: 5px 0 0;
              color: #64748b;
              line-height: 1.5;
            }

            .receipt-action-panel,
            .success-final-actions {
              display: none !important;
            }

            .generated-report-footer {
              margin-top: 30px;
              padding-top: 18px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              color: #718096;
              font-size: 11px;
              line-height: 1.6;
            }

            @media print {

              body {
                padding: 0;
                background: #ffffff;
              }

              .loan-success-report {
                max-width: none;
                box-shadow: none;
                border-radius: 0;
                padding: 15px;
              }

            }

            @media(max-width: 700px) {

              body {
                padding: 10px;
              }

              .loan-success-report {
                padding: 18px;
              }

              .success-report-hero {
                flex-direction: column;
                align-items: flex-start;
              }

              .success-status-badge {
                white-space: normal;
              }

              .application-reference-card {
                flex-direction: column;
                align-items: flex-start;
              }

              .success-report-grid {
                grid-template-columns: 1fr;
              }

              .report-detail {
                flex-direction: column;
                gap: 4px;
              }

              .report-detail strong {
                text-align: left;
              }

            }

          </style>

        </head>

        <body>

          ${reportHtml}

          <div class="generated-report-footer">

            <strong>
              CREDITBANK — Intelligent Lending Platform
            </strong>

            <br>

            Loan Reference:
            ${reportReference}

            <br>

            Generated:
            ${new Date().toLocaleString()}

          </div>

          <script>

            window.onload = function() {

              setTimeout(function() {

                window.print();

              }, 600);

            };

          </script>

        </body>

        </html>

      `);


      reportWindow.document.close();


      this.submitSuccess =
        'Your CreditBank loan report is ready. Use the print dialog to print it or save it as PDF.';


      console.log(
        'CREDITBANK REPORT GENERATED SUCCESSFULLY'
      );


    } catch (error) {

      console.error(
        'CREDITBANK REPORT ERROR:',
        error
      );


      this.submitError =
        error instanceof Error
          ? error.message
          : 'Unable to generate the loan report. Please try again.';

    } finally {

      this.receiptGenerating = false;

    }

  }


  // =========================================================
  // PRINT RECEIPT
  // =========================================================

  printLoanReceipt(): void {

    window.print();

  }


  // =========================================================
  // VIEW LOANS
  // =========================================================

  goToLoans(): void {

    this.router.navigate([
      '/app/loans'
    ]);

  }


  // =========================================================
  // START NEW APPLICATION
  // =========================================================

  startNewLoanApplication(): void {

    this.submissionComplete = false;

    this.submittedLoan = null;

    this.submittedLoanId = null;

    this.submittedApplicationNumber = null;

    this.submittedLoanStatus = null;

    this.submitLoanPreview = null;

    this.submitSuccess = null;

    this.submitError = null;

    this.currentStep = 1;

    this.accountData = null;

    this.accountLoaded = false;

    this.identityVerified = false;

    this.verifiedIdentificationNumber = null;

    this.selectedImageFile = null;


    const today =
      new Date()
        .toISOString()
        .split('T')[0];


    this.loanForm.reset({

      idType:
        'NATIONAL_ID',

      identificationNumber:
        '',

      fullName:
        '',

      phoneNumber:
        '',

      location:
        '',

      monthlyIncome:
        0,

      monthlyExpenses:
        0,

      amount:
        null,

      applicationDate:
        today,

      agreeTerms:
        false

    });


    [
      'fullName',
      'phoneNumber',
      'location',
      'monthlyIncome',
      'monthlyExpenses'
    ].forEach(field => {

      this.loanForm
        .get(field)
        ?.enable();

    });


    this.preliminaryEligibleLimit = 0;

    this.resetBackendAssessment();


    this.startIdentityPlaceholderAnimation();


    window.scrollTo({

      top: 0,

      behavior: 'smooth'

    });

  }


  // =========================================================
  // SAVE DRAFT
  // =========================================================

  saveDraft(): void {

    const draftData =
      this.loanForm.getRawValue();


    localStorage.setItem(
      'loanApplicationDraft',
      JSON.stringify(
        draftData
      )
    );


    alert(
      'Loan application draft has been saved successfully.'
    );

  }


  // =========================================================
  // CANCEL
  // =========================================================

  cancel(): void {

    this.router.navigate([
      '/app/loans'
    ]);

  }


  // =========================================================
  // SET ASSESSMENT STEP
  // =========================================================

  private setStep(
    key: string,
    state: Partial<{
      done: boolean;
      loading: boolean;
    }>
  ): void {

    const step =
      this.eligibilitySteps
        .find(
          s => s.key === key
        );


    if (step) {

      step.done =
        state.done ??
        step.done;

      step.loading =
        state.loading ??
        false;

    }

  }


  // =========================================================
  // SLEEP
  // =========================================================

  private sleep(
    ms: number
  ): Promise<void> {

    return new Promise(
      resolve =>
        setTimeout(
          resolve,
          ms
        )
    );

  }


  // =========================================================
  // ERROR MESSAGE
  // =========================================================

  private extractErrorMessage(
    error: any
  ): string {

    console.error(
      'Backend Error:',
      error
    );


    if (
      error?.error?.message
    ) {

      return error.error.message;

    }


    if (
      error?.error?.error
    ) {

      return error.error.error;

    }


    if (
      typeof error?.error ===
      'string'
    ) {

      return error.error;

    }


    if (
      error?.error?.detail
    ) {

      return error.error.detail;

    }


    if (
      error?.message
    ) {

      return error.message;

    }


    return (
      'An unexpected error occurred. Please try again.'
    );

  }


  // =========================================================
  // DUE DATE
  // =========================================================

  calculateDueDate(): void {

    const intelligence: any =
      this.submitLoanPreview;


    this.calculatedDueDate =
      intelligence?.dueDate
        ? String(
            intelligence.dueDate
          )
        : '';

  }

}