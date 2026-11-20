import { forkJoin, Observable, of } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../services/account.service';
import { KenyaLocationsService } from '../services/services/kenya-locations.service';
import { County, Town } from '../../models/account.model';

export interface UploadedDocument {
  file: File | null;
  name: string;
  preview: string | ArrayBuffer | null;
  uploaded: boolean;
  required: boolean;
  size: number;
  type: string;
  title: string;
  icon: string;
}

export enum CustomerCategory {
  INDIVIDUAL = 'INDIVIDUAL',
  GROUP = 'GROUP',
  COMPANY = 'COMPANY',
  INSTITUTION = 'INSTITUTION'
}

export enum ModeOfOperation {
  SINGLY = 'SINGLY',
  JOINT = 'JOINT',
  ANY_ONE = 'ANY_ONE',
  ANY_TWO = 'ANY_TWO',
  ANY_THREE = 'ANY_THREE',
  ALL = 'ALL',
  TTS = 'TTS',
  BOARD_APPROVAL = 'BOARD_APPROVAL'
}

@Component({
  selector: 'app-account-registration',
  templateUrl: './account-registration.component.html',
  styleUrls: ['./account-registration.component.css']
})
export class AccountRegistrationComponent implements OnInit {

  readonly CustomerCategory = CustomerCategory;
  readonly ModeOfOperation = ModeOfOperation;
  readonly MAX_FILE_SIZE = 10 * 1024 * 1024;
  readonly allowedDocumentTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  accountForm!: FormGroup;
  counties: County[] = [];
  towns: Town[] = [];

 currentStep: number = 0;
  wizardStarted = false;
  stepTitles: string[] = [];
  selectedCustomerCategory: CustomerCategory | null = null;

  loading = false;
  successMessage = '';
  errorMessage = '';
  missingItems: string[] = [];
  imageError = '';

  accountLoaded = false;
  existingAccount: any = null;
  isDuplicate = false;

  selectedImage: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;

  documents: { [key: string]: UploadedDocument } = {};
  supportingDocuments: File[] = [];
  supportingDocumentNames: string[] = [];

  groupCertificate: File | null = null;
  groupConstitution: File | null = null;
  meetingResolution: File | null = null;
  certificateOfIncorporation: File | null = null;
  cr12Document: File | null = null;
  boardResolutionDocument: File | null = null;
  memorandumDocument: File | null = null;
  businessPermit: File | null = null;
  taxCompliance: File | null = null;
  registrationCertificate: File | null = null;
  trustDeed: File | null = null;
  institutionResolution: File | null = null;
  charterDocument: File | null = null;
  operatingLicence: File | null = null;

  groupCertificateName = '';
  groupConstitutionName = '';
  meetingResolutionName = '';
  certificateOfIncorporationName = '';
  cr12Name = '';
  boardResolutionName = '';
  registrationCertificateName = '';
  trustDeedName = '';
  institutionResolutionName = '';

  idMaxLength = 8;
  idPlaceholder = 'Enter 8-digit National ID';

  ownerPhoneExists = false;
nextOfKinPhoneDuplicate = false;
ownerPhoneFormatValid = false;
nextOfKinPhoneFormatValid = false;

ownerEmailExists = false;

checkingOwnerPhone = false;
checkingOwnerEmail = false;

liveCredentialMessage = '';

  organizationOperationRequirement =
    'Select a mode of operation to determine the authorization requirement.';

  modeOfOperationOptions = [
    { value: ModeOfOperation.SINGLY, label: 'Single Signatory' },
    { value: ModeOfOperation.JOINT, label: 'Joint Account' },
    { value: ModeOfOperation.ANY_ONE, label: 'Any One to Sign' },
    { value: ModeOfOperation.ANY_TWO, label: 'Any Two to Sign' },
    { value: ModeOfOperation.ANY_THREE, label: 'Any Three to Sign' },
    { value: ModeOfOperation.ALL, label: 'All Must Sign' },
    { value: ModeOfOperation.TTS, label: 'TTS (Two to Sign)' },
    { value: ModeOfOperation.BOARD_APPROVAL, label: 'Board Approval' }
  ];

  // ============================================================
  // ENTERPRISE COMPLIANCE RULES
  // Keep these values synchronized with the HTML <select> options.
  // Backend validation must still enforce the same rules.
  // ============================================================

  readonly allowedIdTypes = [
    'NATIONAL_ID',
    'MAISHA_CARD',
    'PASSPORT'
  ];

  readonly allowedGenders = [
    'Male',
    'Female',
    'Other'
  ];

  readonly allowedMaritalStatuses = [
    'SINGLY',
    'MARRIED',
    'DIVORCED',
    'WIDOWED'
  ];

  readonly allowedEmploymentStatuses = [
    'EMPLOYED',
    'SELF_EMPLOYED',
    'BUSINESS_OWNER',
    'STUDENT',
    'RETIRED',
    'UNEMPLOYED'
  ];

  readonly allowedSourcesOfFunds = [
    'SALARY',
    'BUSINESS',
    'INVESTMENT',
    'PENSION',
    'FAMILY',
    'OTHER'
  ];

  readonly allowedAccountTypes = [
    'SAVINGS',
    'CURRENT',
    'SALARY',
    'STUDENT'
  ];

  readonly allowedNextOfKinRelationships = [
    'SPOUSE',
    'PARENT',
    'CHILD',
    'SIBLING',
    'GUARDIAN',
    'OTHER'
  ];

  readonly allowedInstitutionTypes = [
    'School',
    'Church',
    'NGO',
    'Government Agency',
    'Trust',
    'University',
    'Hospital'
  ];

  readonly allowedRegistrationTypes = [
    'LIMITED_COMPANY',
    'PUBLIC_LIMITED_COMPANY',
    'PARTNERSHIP',
    'SOLE_PROPRIETORSHIP',
    'SOCIETY',
    'COOPERATIVE',
    'TRUST',
    'NGO',
    'GOVERNMENT_AGENCY',
    'OTHER'
  ];

  readonly allowedIndustries = [
    'AGRICULTURE',
    'MANUFACTURING',
    'CONSTRUCTION',
    'RETAIL',
    'WHOLESALE',
    'TRANSPORT_LOGISTICS',
    'FINANCIAL_SERVICES',
    'REAL_ESTATE',
    'PROFESSIONAL_SERVICES',
    'EDUCATION',
    'HEALTHCARE',
    'HOSPITALITY',
    'ICT',
    'ENERGY',
    'MINING',
    'GOVERNMENT',
    'NON_PROFIT',
    'OTHER'
  ];

  // Keep this list deliberately controlled. Add approved business
  // classifications here rather than accepting arbitrary free text.
  readonly allowedNatureOfBusiness = [
    'AGRICULTURE',
    'MANUFACTURING',
    'CONSTRUCTION',
    'RETAIL',
    'WHOLESALE',
    'TRANSPORT_LOGISTICS',
    'PROFESSIONAL_SERVICES',
    'EDUCATION',
    'HEALTHCARE',
    'HOSPITALITY',
    'ICT_SERVICES',
    'REAL_ESTATE',
    'FINANCIAL_SERVICES',
    'OTHER'
  ];

  readonly allowedDesignations = [
    'CHAIRPERSON',
    'VICE_CHAIRPERSON',
    'SECRETARY',
    'TREASURER',
    'MEMBER',
    'DIRECTOR',
    'CEO',
    'COMPANY_SECRETARY',
    'FINANCE_DIRECTOR'
  ];

  // Kenyan mobile formats accepted at entry.
  // Canonical format sent to the backend is 2547XXXXXXXX / 2541XXXXXXXX.
  private readonly KENYA_PHONE_REGEX = /^(?:0(?:7|1)\d{8}|254(?:7|1)\d{8}|\+254(?:7|1)\d{8})$/;

  // Practical email syntax for onboarding. The backend must still
  // perform authoritative email/business verification where required.
  private readonly EMAIL_REGEX =
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

  private readonly PERSON_NAME_REGEX =
    /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/;

  private readonly ORGANIZATION_NAME_REGEX =
    /^[A-Za-z0-9][A-Za-z0-9 .,&'()\/-]{1,199}$/;

  private readonly REGISTRATION_NUMBER_REGEX =
    /^[A-Za-z0-9][A-Za-z0-9\-\/\.]{1,49}$/;

  private readonly MAX_MONEY = 999999999999999.99;

  customerCategories = [
    {
      id: CustomerCategory.INDIVIDUAL,
      title: 'Individual',
      description: 'Single customer account.',
      icon: 'fas fa-user'
    },
    {
      id: CustomerCategory.GROUP,
      title: 'Group',
      description: 'Chama, SACCO, Welfare Group, Investment Club.',
      icon: 'fas fa-users'
    },
    {
      id: CustomerCategory.COMPANY,
      title: 'Company',
      description: 'Registered Business or Corporate.',
      icon: 'fas fa-building'
    },
    {
      id: CustomerCategory.INSTITUTION,
      title: 'Institution',
      description: 'Schools, Churches, NGOs, Government Bodies.',
      icon: 'fas fa-university'
    }
  ];

  private readonly individualSteps = [
    'Customer Category', 'Personal', 'Contact', 'Account Operation',
    'Next Of Kin', 'Documents', 'Review'
  ];

  private readonly groupSteps = [
    'Customer Category', 'Group Details', 'Officials', 'Signatories',
    'Documents', 'Review'
  ];

  private readonly companySteps = [
    'Customer Category', 'Company', 'Directors', 'Signatories',
    'Documents', 'Review'
  ];

  private readonly institutionSteps = [
    'Customer Category', 'Institution', 'Officials', 'Signatories',
    'Documents', 'Review'
  ];

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private kenyaLocationsService: KenyaLocationsService,
    private router: Router
  ) {
    this.buildForm();
  }

ngOnInit(): void {

  /*
   * Load locations once.
   */
  this.counties =
    this.kenyaLocationsService.counties || [];

  /*
   * Initialize document registry once.
   */
  this.initializeDocuments();

  /*
   * Live form validation.
   */
  this.accountForm.valueChanges.subscribe(() => {
    this.refreshLiveValidation();
  });

  /*
   * Missing requirements indicator.
   */
  this.accountForm.statusChanges.subscribe(() => {
    this.buildMissingItems(false);
  });
}

private refreshLiveValidation(): void {

  if (!this.accountForm) {
    return;
  }

  /*
   * Update the individual phone controls only.
   *
   * Do NOT recursively validate the entire form here.
   */
  const ownerPhone =
    this.accountForm.get('phoneNumber');

  const nextOfKinPhone =
    this.accountForm.get('nextOfKinPhone');

  ownerPhone?.updateValueAndValidity({
    onlySelf: true,
    emitEvent: false
  });

  nextOfKinPhone?.updateValueAndValidity({
    onlySelf: true,
    emitEvent: false
  });

  /*
   * Update live duplicate/format state.
   *
   * This method no longer calls form.updateValueAndValidity().
   */
  this.updateLiveCredentialValidation();

  /*
   * Update the missing-items display.
   */
  this.buildMissingItems(false);
}
  

  private buildForm(): void {
    this.accountForm = this.fb.group({
      customerCategory: ['', Validators.required],
      modeOfOperation: [''],

      currency: ['KES', Validators.required],
      internetBanking: [false],
      mobileBanking: [false],
      smsAlerts: [true],
      emailStatements: [true],
      atmCard: [false],
      visaCard: [false],
      chequeBook: [false],
      standingOrder: [false],
      statementFrequency: ['MONTHLY'],
      communicationChannel: ['BOTH'],
      dailyWithdrawalLimit: [0, [Validators.min(0)]],
      dailyTransferLimit: [0, [Validators.min(0)]],
      maximumTransactionLimit: [0, [Validators.min(0)]],

      fullName: [''],
      idType: ['NATIONAL_ID'],
      nationalId: [''],
      dateOfBirth: [''],
      gender: [''],
      nationality: [''],
      maritalStatus: [''],
      phoneNumber: [''],
      email: [''],
      residentialAddress: [''],
      county: [''],
      city: [''],

      organizationName: [''],
      registrationNumber: [''],
      registrationDate: [''],
      registrationType: [''],
      kraPin: [''],
      industry: [''],
      natureOfBusiness: [''],
      institutionType: [''],

      employmentStatus: [''],
      employerName: [''],
      businessType: [''],
      businessLocation: [''],
      monthlyIncome: [null],
      sourceOfFunds: [''],
      accountType: [''],

      nextOfKinName: [''],
      nextOfKinPhone: [''],
      nextOfKinRelationship: [''],
      nextOfKinEmail: [''],

      image: [null],
      declaration: [false],

      organizationPeople: this.fb.array([]),
      directors: this.fb.array([]),
      officials: this.fb.array([]),
      signatories: this.fb.array([]),
      beneficialOwners: this.fb.array([])
    }, {
      validators: [this.nextOfKinPhoneValidator()]
    });
  }

  get organizationPeople(): FormArray {
    return this.accountForm.get('organizationPeople') as FormArray;
  }

  get directors(): FormArray {
    return this.accountForm.get('directors') as FormArray;
  }

  get officials(): FormArray {
    return this.accountForm.get('officials') as FormArray;
  }

  get signatories(): FormArray {
    return this.accountForm.get('signatories') as FormArray;
  }

  get beneficialOwners(): FormArray {
    return this.accountForm.get('beneficialOwners') as FormArray;
  }

  get isIndividual(): boolean {
    return this.accountForm.get('customerCategory')?.value === CustomerCategory.INDIVIDUAL;
  }

  get isGroup(): boolean {
    return this.accountForm.get('customerCategory')?.value === CustomerCategory.GROUP;
  }

  get isCompany(): boolean {
    return this.accountForm.get('customerCategory')?.value === CustomerCategory.COMPANY;
  }

  get isInstitution(): boolean {
    return this.accountForm.get('customerCategory')?.value === CustomerCategory.INSTITUTION;
  }

  get totalSignatories(): number {
    return this.organizationPeople.controls.filter(
      person => person.get('isSignatory')?.value === true
    ).length;
  }

  get primarySignatoryName(): string {
    const primary = this.organizationPeople.controls.find(
      person => person.get('primarySignatory')?.value === true
    );
    return primary?.get('fullName')?.value || 'Not Selected';
  }

  get organizationModeOfOperation(): string {
    return this.accountForm.get('modeOfOperation')?.value || '';
  }

  get requiredSignatoriesText(): string {
    const mode = this.organizationModeOfOperation;
    if (!mode) return 'Selection required';
    if (mode === ModeOfOperation.ALL) {
      return `${this.organizationPeople.length} / ${this.organizationPeople.length} required`;
    }
    const required = this.getRequiredSignatories(mode);
    return `${required} signator${required === 1 ? 'y' : 'ies'} required`;
  }

  get registrationTitle(): string {
    if (this.isIndividual) return 'Individual Account Opening';
    if (this.isGroup) return 'Group Account Opening';
    if (this.isCompany) return 'Company Account Opening';
    if (this.isInstitution) return 'Institution Account Opening';
    return 'Customer Account Opening';
  }

  get maxStep(): number {
    return Math.max(this.stepTitles.length - 1, 0);
  }

get canProceed(): boolean {
  return this.currentStep >= 0 &&
         this.currentStep <= this.maxStep;
}

  get canSubmit(): boolean {
    return this.validateCompleteRegistration().length === 0;
  }

  get reviewReady(): boolean {
    return this.canSubmit;
  }

  get requiredDocumentKeys(): string[] {
    if (this.isIndividual) {
      return ['profile', 'nationalId', 'kra', 'signature'];
    }
    if (this.isGroup) {
      return ['profile', 'kra', 'signature', 'groupCertificate', 'constitution', 'meetingResolution'];
    }
    if (this.isCompany) {
      return ['profile', 'kra', 'signature', 'incorporation', 'cr12', 'boardResolution'];
    }
    if (this.isInstitution) {
      return ['profile', 'kra', 'signature', 'registrationCertificate', 'trustDeed', 'institutionResolution'];
    }
    return [];
  }

  get requiredDocuments(): number {
    return this.requiredDocumentKeys.length;
  }

  get uploadedDocuments(): number {
    return this.requiredDocumentKeys.filter(key => !!this.documents[key]?.file).length;
  }

  get uploadProgress(): number {
    return this.requiredDocuments === 0
      ? 0
      : Math.round((this.uploadedDocuments / this.requiredDocuments) * 100);
  }

  get allRequiredDocumentsUploaded(): boolean {
    return this.requiredDocumentKeys.length > 0 &&
      this.requiredDocumentKeys.every(key => !!this.documents[key]?.file);
  }

  get allDocumentsReady(): boolean {
    return this.allRequiredDocumentsUploaded;
  }

  get memorandumName(): string {
    return this.documents['memorandum']?.name || '';
  }

  selectCustomerCategory(category: CustomerCategory): void {
    this.selectedCustomerCategory = category;
    this.accountForm.patchValue({ customerCategory: category }, { emitEvent: false });

    switch (category) {
      case CustomerCategory.INDIVIDUAL:
        this.stepTitles = [...this.individualSteps];
        break;
      case CustomerCategory.GROUP:
        this.stepTitles = [...this.groupSteps];
        break;
      case CustomerCategory.COMPANY:
        this.stepTitles = [...this.companySteps];
        break;
      case CustomerCategory.INSTITUTION:
        this.stepTitles = [...this.institutionSteps];
        break;
    }

    this.applyCategoryValidators();
    this.clearCategorySpecificData();
    this.missingItems = [];
    this.errorMessage = '';
    this.wizardStarted = false;
  }

  private applyCategoryValidators(): void {
    const all = [
      'modeOfOperation', 'fullName', 'nationalId', 'dateOfBirth', 'gender',
      'nationality', 'maritalStatus', 'phoneNumber', 'email',
      'residentialAddress', 'county', 'city',
      'organizationName', 'registrationNumber', 'registrationDate',
      'registrationType', 'kraPin', 'industry', 'natureOfBusiness',
      'institutionType', 'employmentStatus', 'employerName', 'businessType',
      'businessLocation', 'monthlyIncome', 'sourceOfFunds', 'accountType',
      'nextOfKinName', 'nextOfKinPhone', 'nextOfKinRelationship',
      'nextOfKinEmail', 'declaration'
    ];

    all.forEach(name => this.accountForm.get(name)?.clearValidators());

    // These are controlled values even when optional.
    this.setOptional('idType', [
      this.allowedValueValidator(this.allowedIdTypes)
    ]);
    this.setOptional('gender', [
      this.allowedValueValidator(this.allowedGenders)
    ]);
    this.setOptional('maritalStatus', [
      this.allowedValueValidator(this.allowedMaritalStatuses)
    ]);
    this.setOptional('nextOfKinEmail', [
      this.emailValidator()
    ]);

    if (this.isIndividual) {
      this.setRequired('modeOfOperation', [
        Validators.required,
        this.allowedValueValidator(Object.values(ModeOfOperation))
      ]);

      this.setRequired('fullName', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100),
        this.personNameValidator()
      ]);

      this.setRequired('nationalId', [
        Validators.required,
        this.identityOrPassportValidator()
      ]);

      this.setRequired('dateOfBirth', [
        Validators.required,
        this.adultValidator(),
        this.notFutureDateValidator()
      ]);

      this.setRequired('gender', [
        Validators.required,
        this.allowedValueValidator(this.allowedGenders)
      ]);

      this.setRequired('nationality', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(60),
        this.nationalityValidator()
      ]);

      this.setRequired('phoneNumber', [
        Validators.required,
        this.phoneValidator()
      ]);

      this.setRequired('email', [
        Validators.required,
        this.emailValidator()
      ]);

      this.setRequired('residentialAddress', [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(250),
        this.addressValidator()
      ]);

      this.setRequired('county', [
        Validators.required,
        this.countyValidator()
      ]);

      this.setRequired('city', [
        Validators.required,
        this.cityValidator()
      ]);

      this.setRequired('employmentStatus', [
        Validators.required,
        this.allowedValueValidator(this.allowedEmploymentStatuses)
      ]);

      this.setRequired('monthlyIncome', [
        Validators.required,
        this.moneyValidator()
      ]);

      this.setRequired('sourceOfFunds', [
        Validators.required,
        this.allowedValueValidator(this.allowedSourcesOfFunds)
      ]);

      this.setRequired('accountType', [
        Validators.required,
        this.allowedValueValidator(this.allowedAccountTypes)
      ]);

      this.setRequired('nextOfKinName', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100),
        this.personNameValidator()
      ]);

      this.setRequired('nextOfKinPhone', [
        Validators.required,
        this.phoneValidator()
      ]);

      this.setRequired('nextOfKinRelationship', [
        Validators.required,
        this.allowedValueValidator(this.allowedNextOfKinRelationships)
      ]);
    } else {
      this.setRequired('organizationName', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(200),
        this.organizationNameValidator()
      ]);

      this.setRequired('registrationNumber', [
        Validators.required,
        Validators.maxLength(50),
        this.registrationNumberValidator()
      ]);

      this.setRequired('registrationDate', [
        Validators.required,
        this.notFutureDateValidator()
      ]);

      this.setRequired('registrationType', [
        Validators.required,
        this.allowedValueValidator(this.allowedRegistrationTypes)
      ]);

      this.setRequired('kraPin', [
        Validators.required,
        this.kraPinValidator()
      ]);

      this.setRequired('email', [
        Validators.required,
        this.emailValidator()
      ]);

      this.setRequired('phoneNumber', [
        Validators.required,
        this.phoneValidator()
      ]);

      this.setRequired('residentialAddress', [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(250),
        this.addressValidator()
      ]);

      this.setRequired('county', [
        Validators.required,
        this.countyValidator()
      ]);

      this.setRequired('city', [
        Validators.required,
        this.cityValidator()
      ]);

      this.setRequired('modeOfOperation', [
        Validators.required,
        this.allowedValueValidator(Object.values(ModeOfOperation))
      ]);

      if (this.isCompany) {
        this.setRequired('industry', [
          Validators.required,
          this.allowedValueValidator(this.allowedIndustries)
        ]);

        this.setRequired('natureOfBusiness', [
          Validators.required,
          this.allowedValueValidator(this.allowedNatureOfBusiness)
        ]);
      }

      if (this.isInstitution) {
        this.setRequired('institutionType', [
          Validators.required,
          this.allowedValueValidator(this.allowedInstitutionTypes)
        ]);
      }
    }

    this.onIdTypeChange();
    this.accountForm.updateValueAndValidity({ emitEvent: false });
  }

  private setRequired(name: string, validators: ValidatorFn[]): void {
    const control = this.accountForm.get(name);
    if (control) {
      control.setValidators(validators);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private setOptional(name: string, validators: ValidatorFn[]): void {
    const control = this.accountForm.get(name);
    if (control) {
      control.setValidators(validators);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private clearCategorySpecificData(): void {
    this.organizationPeople.clear();
    this.documents = {};
    this.initializeDocuments();
    this.selectedImage = null;
    this.previewUrl = null;

    if (!this.isIndividual) {
      this.addOrganizationPerson();
    }
  }

  onIdTypeChange(): void {
    const idType = String(this.accountForm.get('idType')?.value || 'NATIONAL_ID').trim();
    const control = this.accountForm.get('nationalId');

    // ID type belongs to individual onboarding. Organization officials
    // have their own identity controls inside organizationPeople.
    if (!this.isIndividual) {
      control?.clearValidators();
      control?.updateValueAndValidity({ emitEvent: false });
      return;
    }

    control?.reset('', { emitEvent: false });

    if (idType === 'PASSPORT') {
      this.idMaxLength = 15;
      this.idPlaceholder = 'Enter passport number';
      control?.setValidators([
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(15),
        Validators.pattern(/^[A-Za-z0-9]{6,15}$/)
      ]);
    } else {
      this.idMaxLength = 8;
      this.idPlaceholder = idType === 'MAISHA_CARD'
        ? 'Enter 8-digit Maisha Card number'
        : 'Enter 8-digit National ID';

      control?.setValidators([
        Validators.required,
        this.identityValidator()
      ]);
    }

    control?.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Kept for compatibility with the existing HTML.
   * It is ID-type aware: passports remain alphanumeric while
   * National ID / Maisha Card remain numeric.
   */
  allowNumbersOnly(event: any): void {
    const input = event?.target as HTMLInputElement | null;
    if (!input) return;

    const idType = String(this.accountForm.get('idType')?.value || 'NATIONAL_ID');

    if (idType === 'PASSPORT') {
      input.value = String(input.value || '')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 15)
        .toUpperCase();

      this.accountForm.get('nationalId')?.setValue(input.value, {
        emitEvent: false
      });
      return;
    }

    input.value = String(input.value || '')
      .replace(/\D/g, '')
      .slice(0, 8);

    this.accountForm.get('nationalId')?.setValue(input.value, {
      emitEvent: false
    });
  }



 sanitizePhone(
  event: any,
  controlName: string
): void {

  const input = event?.target as HTMLInputElement | null;

  if (!input) {
    return;
  }

  /*
   * Only allow:
   * - digits
   * - one leading +
   */
  let value = String(input.value || '')
    .replace(/[^\d+]/g, '');

  /*
   * '+' can only appear once and at the beginning.
   */
  if (value.includes('+')) {
    value =
      '+' +
      value.replace(/\+/g, '');
  }

  /*
   * Prevent impossible lengths while typing.
   *
   * +254XXXXXXXXX = 13 characters
   * 254XXXXXXXXX  = 12 characters
   * 07XXXXXXXX    = 10 characters
   */
  if (value.startsWith('+')) {
    value = value.slice(0, 13);
  } else {
    value = value.slice(0, 12);
  }

  /*
   * Update visible input.
   */
  input.value = value;

  /*
   * Update the EXACT FormControl requested by the HTML.
   */
  const control = this.accountForm.get(controlName);

  if (!control) {
    console.error(
      `Phone control "${controlName}" does not exist.`
    );
    return;
  }

  control.setValue(value, {
    emitEvent: true
  });

  /*
   * Validate immediately.
   */
  control.markAsDirty();

  control.updateValueAndValidity({
    onlySelf: true,
    emitEvent: false
  });

  /*
   * Critical:
   * refresh cross-field owner/Next-of-Kin validation immediately.
   */
  this.accountForm.updateValueAndValidity({
    onlySelf: true,
    emitEvent: false
  });

  /*
   * Update the live UI.
   */
  this.updateLiveCredentialValidation();
  this.buildMissingItems(false);
}


/**
 * Returns the current phone validation state.
 */
getPhoneValidationState(
  controlName: string
): 'EMPTY' | 'INVALID' | 'VALID' | 'DUPLICATE' {

  const control = this.accountForm.get(controlName);

  if (!control) {
    return 'EMPTY';
  }

  const value = String(control.value || '').trim();

  if (!value) {
    return 'EMPTY';
  }

  if (control.hasError('invalidPhone')) {
    return 'INVALID';
  }

  if (
    controlName === 'nextOfKinPhone' &&
    this.isOwnerAndNextOfKinPhoneDuplicate()
  ) {
    return 'DUPLICATE';
  }

  return 'VALID';
}


/**
 * True when Owner and Next of Kin have the same
 * normalized Kenyan phone number.
 */
isOwnerAndNextOfKinPhoneDuplicate(): boolean {

  const owner = this.normalizeKenyanPhone(
    this.accountForm.get('phoneNumber')?.value
  );

  const kin = this.normalizeKenyanPhone(
    this.accountForm.get('nextOfKinPhone')?.value
  );

  if (!owner || !kin) {
    return false;
  }

  /*
   * Do not report duplicate while either number is
   * still syntactically invalid.
   */
  if (
    !this.KENYA_PHONE_REGEX.test(
      String(this.accountForm.get('phoneNumber')?.value || '').trim()
    )
  ) {
    return false;
  }

  if (
    !this.KENYA_PHONE_REGEX.test(
      String(this.accountForm.get('nextOfKinPhone')?.value || '').trim()
    )
  ) {
    return false;
  }

  return owner === kin;
}


  sanitizeOrganizationPersonPhone(event: any, index: number): void {
    const input = event?.target as HTMLInputElement | null;
    if (!input) return;

    let value = String(input.value || '').replace(/[^\d+]/g, '');
    if (value.includes('+')) {
      value = '+' + value.replace(/\+/g, '');
    }

    value = value.startsWith('+')
      ? value.slice(0, 13)
      : value.slice(0, 12);

    input.value = value;

    const control = this.organizationPeople.at(index)?.get('phone');
    control?.setValue(value, { emitEvent: false });
    control?.updateValueAndValidity({ emitEvent: false });
  }

  sanitizeEmail(event: any, controlName = 'email'): void {
    const input = event?.target as HTMLInputElement | null;
    if (!input) return;

    const value = String(input.value || '')
      .replace(/\s+/g, '')
      .slice(0, 254)
      .toLowerCase();

    input.value = value;

    const control = this.accountForm.get(controlName);
    control?.setValue(value, { emitEvent: false });
    control?.updateValueAndValidity({ emitEvent: false });
  }

  sanitizeOrganizationPersonEmail(event: any, index: number): void {
    const input = event?.target as HTMLInputElement | null;
    if (!input) return;

    const value = String(input.value || '')
      .replace(/\s+/g, '')
      .slice(0, 254)
      .toLowerCase();

    input.value = value;

    const control = this.organizationPeople.at(index)?.get('email');
    control?.setValue(value, { emitEvent: false });
    control?.updateValueAndValidity({ emitEvent: false });
  }

  sanitizeKraPin(event: any, controlName = 'kraPin'): void {
    const input = event?.target as HTMLInputElement | null;
    if (!input) return;

    const value = String(input.value || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 11)
      .toUpperCase();

    input.value = value;

    const control = this.accountForm.get(controlName);
    control?.setValue(value, { emitEvent: false });
    control?.updateValueAndValidity({ emitEvent: false });
  }

  sanitizeOrganizationPersonKraPin(event: any, index: number): void {
    const input = event?.target as HTMLInputElement | null;
    if (!input) return;

    const value = String(input.value || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 11)
      .toUpperCase();

    input.value = value;

    const control = this.organizationPeople.at(index)?.get('kraPin');
    control?.setValue(value, { emitEvent: false });
    control?.updateValueAndValidity({ emitEvent: false });
  }

  sanitizePersonName(event: any, controlName: string, index?: number): void {
    const input = event?.target as HTMLInputElement | null;
    if (!input) return;

    let value = String(input.value || '')
      .replace(/[^A-Za-z '\\-]/g, '')
      .replace(/\s{2,}/g, ' ')
      .slice(0, 100);

    input.value = value;

    if (typeof index === 'number') {
      this.organizationPeople.at(index)?.get(controlName)?.setValue(value, {
        emitEvent: false
      });
    } else {
      this.accountForm.get(controlName)?.setValue(value, {
        emitEvent: false
      });
    }
  }

  sanitizeOrganizationName(event: any): void {
    const input = event?.target as HTMLInputElement | null;
    if (!input) return;

    const value = String(input.value || '')
      .replace(/[^A-Za-z0-9 .,&'()\/-]/g, '')
      .replace(/\s{2,}/g, ' ')
      .slice(0, 200);

    input.value = value;
    this.accountForm.get('organizationName')?.setValue(value, {
      emitEvent: false
    });
  }

  sanitizeRegistrationNumber(event: any): void {
    const input = event?.target as HTMLInputElement | null;
    if (!input) return;

    const value = String(input.value || '')
      .replace(/[^A-Za-z0-9./-]/g, '')
      .slice(0, 50)
      .toUpperCase();

    input.value = value;
    this.accountForm.get('registrationNumber')?.setValue(value, {
      emitEvent: false
    });
  }

checkPhoneNumber(): void {

  const control =
    this.accountForm.get('phoneNumber');

  if (!control) {
    return;
  }

  const value =
    String(control.value || '').trim();

  /*
   * Do not normalize incomplete/invalid input.
   * Let the user see the format error.
   */
  if (this.KENYA_PHONE_REGEX.test(value)) {

    const normalized =
      this.normalizeKenyanPhone(value);

    control.setValue(
      normalized,
      {
        emitEvent: false
      }
    );
  }

  control.updateValueAndValidity({
    onlySelf: true,
    emitEvent: false
  });

  this.updateLiveCredentialValidation();

  this.accountForm.updateValueAndValidity({
    onlySelf: true,
    emitEvent: false
  });
}

checkEmail(): void {

  const control =
    this.accountForm.get('email');

  if (!control) {
    return;
  }

  const value =
    String(control.value || '')
      .trim()
      .toLowerCase();

  control.setValue(
    value,
    {
      emitEvent: false
    }
  );

  control.updateValueAndValidity({
    onlySelf: true,
    emitEvent: false
  });

  this.updateLiveCredentialValidation();
}

  addOrganizationPerson(): void {
    this.organizationPeople.push(this.createOrganizationPerson());
    this.buildMissingItems(false);
  }

  removeOrganizationPerson(index: number): void {
    if (this.organizationPeople.length <= 1) {
      this.errorMessage = 'At least one organization official is required.';
      return;
    }
    this.organizationPeople.removeAt(index);
    this.ensurePrimarySignatory();
    this.buildMissingItems(false);
  }

hasDuplicateErrors(): boolean {

  const seen = new Set<string>();

  const values: string[] = [];

  /*
   * ----------------------------------------------------------
   * OWNER
   * ----------------------------------------------------------
   */

  const id = String(
    this.accountForm.get('nationalId')?.value || ''
  )
    .trim()
    .toUpperCase();

  const phone = this.normalizeKenyanPhone(
    this.accountForm.get('phoneNumber')?.value
  );

  const email = String(
    this.accountForm.get('email')?.value || ''
  )
    .trim()
    .toLowerCase();

  if (id) {
    values.push(`id:${id}`);
  }

  if (phone) {
    values.push(`phone:${phone}`);
  }

  if (email) {
    values.push(`email:${email}`);
  }

  /*
   * ----------------------------------------------------------
   * NEXT OF KIN
   * ----------------------------------------------------------
   *
   * Give Next of Kin its own key so that the explicit
   * owner-vs-kin comparison below remains clear.
   */

  const nextOfKinPhone =
    this.normalizeKenyanPhone(
      this.accountForm.get('nextOfKinPhone')?.value
    );

  const nextOfKinEmail =
    String(
      this.accountForm.get('nextOfKinEmail')?.value || ''
    )
      .trim()
      .toLowerCase();

  if (nextOfKinPhone) {
    values.push(`nextOfKinPhone:${nextOfKinPhone}`);
  }

  if (nextOfKinEmail) {
    values.push(`email:${nextOfKinEmail}`);
  }

  /*
   * ----------------------------------------------------------
   * ORGANIZATION PEOPLE
   * ----------------------------------------------------------
   */

  for (const person of this.organizationPeople.controls) {

    const personId = String(
      person.get('nationalId')?.value || ''
    )
      .trim()
      .toUpperCase();

    const personPhone =
      this.normalizeKenyanPhone(
        person.get('phone')?.value
      );

    const personEmail = String(
      person.get('email')?.value || ''
    )
      .trim()
      .toLowerCase();

    if (personId) {
      values.push(`id:${personId}`);
    }

    if (personPhone) {
      values.push(`phone:${personPhone}`);
    }

    if (personEmail) {
      values.push(`email:${personEmail}`);
    }
  }

  /*
   * ----------------------------------------------------------
   * DUPLICATE SCAN
   * ----------------------------------------------------------
   */

  for (const value of values) {

    if (seen.has(value)) {
      return true;
    }

    seen.add(value);
  }

  /*
   * ----------------------------------------------------------
   * OWNER ↔ NEXT OF KIN
   * ----------------------------------------------------------
   */

  if (
    phone &&
    nextOfKinPhone &&
    phone === nextOfKinPhone
  ) {
    return true;
  }

  return false;
}


/**
 * ============================================================
 * LIVE CREDENTIAL VALIDATION
 * ============================================================
 *
 * IMPORTANT:
 * This method MUST NOT call:
 *
 *   accountForm.updateValueAndValidity()
 *
 * because it can be invoked during form validation itself and
 * cause recursive validation.
 */
private updateLiveCredentialValidation(): void {

  if (!this.accountForm) {
    return;
  }

  const ownerPhoneControl =
    this.accountForm.get('phoneNumber');

  const kinPhoneControl =
    this.accountForm.get('nextOfKinPhone');

  /*
   * ----------------------------------------------------------
   * OWNER PHONE FORMAT
   * ----------------------------------------------------------
   */
  const ownerPhone =
    String(ownerPhoneControl?.value || '').trim();

  this.ownerPhoneFormatValid =
    !!ownerPhone &&
    this.KENYA_PHONE_REGEX.test(ownerPhone);

  /*
   * ----------------------------------------------------------
   * NEXT OF KIN PHONE FORMAT
   * ----------------------------------------------------------
   */
  const kinPhone =
    String(kinPhoneControl?.value || '').trim();

  this.nextOfKinPhoneFormatValid =
    !!kinPhone &&
    this.KENYA_PHONE_REGEX.test(kinPhone);

  /*
   * ----------------------------------------------------------
   * OWNER ↔ NEXT OF KIN DUPLICATE
   * ----------------------------------------------------------
   */
  this.nextOfKinPhoneDuplicate =
    this.isOwnerAndNextOfKinPhoneDuplicate();

  /*
   * Apply duplicate error directly to Next of Kin.
   *
   * IMPORTANT:
   * Do not trigger another validation event here.
   */
  this.applyNextOfKinDuplicateError();
}


/**
 * Put the owner/Next-of-Kin duplicate error directly
 * on the Next of Kin phone field without triggering
 * another validation cycle.
 */
private applyNextOfKinDuplicateError(): void {

  const control =
    this.accountForm.get('nextOfKinPhone');

  if (!control) {
    return;
  }

  const currentErrors =
    { ...(control.errors || {}) };

  const hadDuplicateError =
    !!currentErrors['sameAsOwnerPhone'];

  /*
   * Remove our previous duplicate error.
   */
  delete currentErrors['sameAsOwnerPhone'];

  /*
   * Add duplicate error only when applicable.
   */
  if (this.nextOfKinPhoneDuplicate) {

    currentErrors['sameAsOwnerPhone'] = true;

    /*
     * Only update when the state actually changed.
     */
    if (!hadDuplicateError) {
      control.setErrors(currentErrors, {
        emitEvent: false
      });
    }

    return;
  }

  /*
   * Duplicate no longer exists.
   */
  if (hadDuplicateError) {

    control.setErrors(
      Object.keys(currentErrors).length
        ? currentErrors
        : null,
      {
        emitEvent: false
      }
    );
  }
}


  private createOrganizationPerson(): FormGroup {
    const group = this.fb.group({
      fullName: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100),
        this.personNameValidator()
      ]],
      nationalId: ['', [
        Validators.required,
        this.identityValidator()
      ]],
      kraPin: ['', [
        this.kraPinValidator()
      ]],
      phone: ['', [
        Validators.required,
        this.phoneValidator()
      ]],
      email: ['', [
        Validators.required,
        this.emailValidator()
      ]],
      designation: ['', [
        Validators.required,
        this.allowedValueValidator(this.allowedDesignations)
      ]],
      position: ['', [
        Validators.maxLength(100),
        this.optionalTextValidator()
      ]],
      shareholding: [0, [
        this.moneyOrPercentageValidator(100)
      ]],
      isOfficial: [true],
      isDirector: [false],
      isTrustee: [false],
      isBeneficialOwner: [false],
      isSignatory: [false],
      primarySignatory: [false],
      signingLimit: [0, [
        this.moneyValidator()
      ]],
      isMaker: [false],
      isChecker: [false],
      isApprover: [false],
      transactionLimit: [0, [
        this.moneyValidator()
      ]]
    });

    return group;
  }

private nextOfKinPhoneValidator(): ValidatorFn {

  return (group: AbstractControl): ValidationErrors | null => {

    const ownerControl =
      group.get('phoneNumber');

    const kinControl =
      group.get('nextOfKinPhone');

    if (!ownerControl || !kinControl) {
      return null;
    }

    const ownerRaw =
      String(ownerControl.value || '').trim();

    const kinRaw =
      String(kinControl.value || '').trim();

    /*
     * Nothing to compare yet.
     */
    if (!ownerRaw || !kinRaw) {
      return null;
    }

    /*
     * Don't classify malformed numbers as duplicates.
     * Their individual phoneValidator() should handle that.
     */
    if (
      !this.KENYA_PHONE_REGEX.test(ownerRaw) ||
      !this.KENYA_PHONE_REGEX.test(kinRaw)
    ) {
      return null;
    }

    const ownerPhone =
      this.normalizeKenyanPhone(ownerRaw);

    const kinPhone =
      this.normalizeKenyanPhone(kinRaw);

    if (
      ownerPhone &&
      kinPhone &&
      ownerPhone === kinPhone
    ) {
      return {
        samePhone: true,
        duplicatePhone: true
      };
    }

    return null;
  };
}

  private allowedValueValidator(allowed: readonly string[]): ValidatorFn {
    const allowedSet = new Set(allowed.map(v => String(v)));

    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const value = String(control.value).trim();

      return allowedSet.has(value)
        ? null
        : { invalidOption: { value, allowed: [...allowedSet] } };
    };
  }

  private emailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const value = String(control.value).trim().toLowerCase();

      if (value.length > 254 || /\s/.test(value)) {
        return { invalidEmail: true };
      }

      return this.EMAIL_REGEX.test(value)
        ? null
        : { invalidEmail: true };
    };
  }

 private phoneValidator(): ValidatorFn {

  return (control: AbstractControl): ValidationErrors | null => {

    if (
      control.value === null ||
      control.value === undefined ||
      String(control.value).trim() === ''
    ) {
      return null;
    }

    const value =
      String(control.value).trim();

    /*
     * Only valid Kenyan mobile numbers:
     *
     * 0712345678
     * 0112345678
     * 254712345678
     * 254112345678
     * +254712345678
     * +254112345678
     */
    if (!this.KENYA_PHONE_REGEX.test(value)) {
      return {
        invalidPhone: true
      };
    }

    return null;
  };
}

  private normalizeKenyanPhone(value: any): string {
    const raw = String(value ?? '').trim();

    if (!raw) return '';

    if (/^07\d{8}$/.test(raw)) {
      return `254${raw.substring(1)}`;
    }

    if (/^01\d{8}$/.test(raw)) {
      return `254${raw.substring(1)}`;
    }

    if (/^\+254[71]\d{8}$/.test(raw)) {
      return raw.substring(1);
    }

    if (/^254[71]\d{8}$/.test(raw)) {
      return raw;
    }

    return raw;
  }

  private identityOrPassportValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const idType = String(this.accountForm?.get('idType')?.value || 'NATIONAL_ID');
      const value = String(control.value || '').trim();

      if (!value) return null;

      if (idType === 'PASSPORT') {
        return /^[A-Za-z0-9]{6,15}$/.test(value)
          ? null
          : { invalidIdentity: true };
      }

      return /^\d{8}$/.test(value)
        ? null
        : { invalidIdentity: true };
    };
  }

  private identityValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = String(control.value).trim();

      return /^\d{8}$/.test(value)
        ? null
        : { invalidIdentity: true };
    };
  }

private kraPinValidator(): ValidatorFn {
return (control: AbstractControl): ValidationErrors | null => {

const rawValue = control.value;

// Empty values are handled by Validators.required
if (
  rawValue === null ||
  rawValue === undefined ||
  String(rawValue).trim() === ''
) {
  return null;
}

const value = String(rawValue)
  .trim()
  .toUpperCase();


const kraPinPattern = /^[A-Z]\d{9}[A-Z]$/;

return kraPinPattern.test(value)
  ? null
  : { invalidKraPin: true };
};
}


  private personNameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = String(control.value).trim();

      return this.PERSON_NAME_REGEX.test(value)
        ? null
        : { invalidName: true };
    };
  }

  private organizationNameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = String(control.value).trim();

      return this.ORGANIZATION_NAME_REGEX.test(value)
        ? null
        : { invalidOrganizationName: true };
    };
  }

  private registrationNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = String(control.value).trim();

      return this.REGISTRATION_NUMBER_REGEX.test(value)
        ? null
        : { invalidRegistrationNumber: true };
    };
  }

  private nationalityValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = String(control.value).trim();

      return /^[A-Za-z][A-Za-z .'-]{1,59}$/.test(value)
        ? null
        : { invalidNationality: true };
    };
  }

  private addressValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = String(control.value).trim();

      return /^[A-Za-z0-9][A-Za-z0-9 .,#'()\/-]{4,249}$/.test(value)
        ? null
        : { invalidAddress: true };
    };
  }

  private optionalTextValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = String(control.value).trim();

      return /^[A-Za-z0-9][A-Za-z0-9 .,'()\/&_-]{0,99}$/.test(value)
        ? null
        : { invalidText: true };
    };
  }

  private countyValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = String(control.value).trim();
      const valid = (this.counties || []).some(c => String(c.id) === value);

      return valid ? null : { invalidCounty: true };
    };
  }

  private cityValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = String(control.value).trim();
      const valid = (this.towns || []).some(t => String(t.name) === value);

      return valid ? null : { invalidCity: true };
    };
  }

  private moneyValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const raw = String(control.value).trim();

      // No signs, commas or scientific notation.
      if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(raw)) {
        return { invalidMoney: true };
      }

      const amount = Number(raw);

      if (!Number.isFinite(amount) || amount < 0 || amount > this.MAX_MONEY) {
        return { invalidMoney: true };
      }

      return null;
    };
  }

  private moneyOrPercentageValidator(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const raw = String(control.value).trim();

      if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(raw)) {
        return { invalidNumber: true };
      }

      const value = Number(raw);

      return Number.isFinite(value) && value >= 0 && value <= max
        ? null
        : { invalidNumber: true };
    };
  }

  private notFutureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const date = new Date(control.value);

      if (isNaN(date.getTime())) {
        return { invalidDate: true };
      }

      const selected = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      const today = new Date();

      const current = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      return selected <= current
        ? null
        : { futureDate: true };
    };
  }

  private adultValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const dob = new Date(control.value);

      if (isNaN(dob.getTime())) {
        return { invalidDate: true };
      }

      const today = new Date();

      let age = today.getFullYear() - dob.getFullYear();
      const month = today.getMonth() - dob.getMonth();

      if (month < 0 || (month === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      return age >= 18
        ? null
        : { underAge: true };
    };
  }

  private hasUsableValue(control: AbstractControl | null): boolean {
    if (!control) return false;
    const value = control.value;
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return !isNaN(value) && value >= 0;
    if (typeof value === 'boolean') return value;
    return true;
  }

  private getRequiredSignatories(mode: string): number {
    switch (mode) {
      case ModeOfOperation.SINGLY:
      case ModeOfOperation.ANY_ONE:
      case ModeOfOperation.BOARD_APPROVAL:
        return 1;
      case ModeOfOperation.JOINT:
      case ModeOfOperation.ANY_TWO:
      case ModeOfOperation.TTS:
        return 2;
      case ModeOfOperation.ANY_THREE:
        return 3;
      case ModeOfOperation.ALL:
        return this.organizationPeople.length;
      default:
        return 0;
    }
  }

  private getModeLabel(mode: string): string {
    const found = this.modeOfOperationOptions.find(x => x.value === mode);
    return found?.label || 'Signing rule';
  }

  onModeOfOperationChanged(): void {
    const mode = this.organizationModeOfOperation;
    this.organizationOperationRequirement = this.getOperationRequirementText(mode);
    this.normalizePrimarySignatory();
    this.buildMissingItems(false);
  }

  private getOperationRequirementText(mode: string): string {
    if (!mode) return 'Select a mode of operation to determine the authorization requirement.';
    if (mode === ModeOfOperation.ALL) {
      return 'Every authorized organization official must be selected as a signatory.';
    }
    const required = this.getRequiredSignatories(mode);
    if (mode === ModeOfOperation.SINGLY || mode === ModeOfOperation.TTS) {
      return `${this.getModeLabel(mode)} requires exactly ${required} signator${required === 1 ? 'y' : 'ies'}.`;
    }
    return `${this.getModeLabel(mode)} requires at least ${required} signator${required === 1 ? 'y' : 'ies'}.`;
  }

  toggleSignatory(index: number): void {
    const person = this.organizationPeople.at(index);
    const checked = person.get('isSignatory')?.value === true;
    const mode = this.organizationModeOfOperation;
    const selected = this.totalSignatories;

    if (!checked) {
      person.patchValue({ primarySignatory: false }, { emitEvent: false });
      this.normalizePrimarySignatory();
      this.buildMissingItems(false);
      return;
    }

    if (mode === ModeOfOperation.SINGLY && selected > 1) {
      person.patchValue({ isSignatory: false }, { emitEvent: false });
      this.errorMessage = 'Single Signatory allows exactly ONE authorized signatory.';
      return;
    }

    if (mode === ModeOfOperation.TTS && selected > 2) {
      person.patchValue({ isSignatory: false }, { emitEvent: false });
      this.errorMessage = 'TTS allows exactly TWO authorized signatories.';
      return;
    }

    if (mode === ModeOfOperation.ALL) {
      this.organizationPeople.controls.forEach(p =>
        p.patchValue({ isSignatory: true }, { emitEvent: false })
      );
    }

    this.normalizePrimarySignatory();
    this.buildMissingItems(false);
  }

  setPrimarySignatory(index: number): void {
    const selected = this.organizationPeople.at(index);
    if (!selected.get('isSignatory')?.value) {
      this.errorMessage = 'Only an authorized signatory can be selected as primary.';
      return;
    }

    this.organizationPeople.controls.forEach((person, i) => {
      person.patchValue({ primarySignatory: i === index }, { emitEvent: false });
    });
    this.buildMissingItems(false);
  }

  private normalizePrimarySignatory(): void {
    const signatories = this.organizationPeople.controls.filter(
      p => p.get('isSignatory')?.value === true
    );

    this.organizationPeople.controls.forEach(p => {
      if (!p.get('isSignatory')?.value) {
        p.patchValue({ primarySignatory: false }, { emitEvent: false });
      }
    });

    if (!signatories.some(p => p.get('primarySignatory')?.value === true) && signatories.length) {
      signatories[0].patchValue({ primarySignatory: true }, { emitEvent: false });
    }
  }

  private ensurePrimarySignatory(): void {
    this.normalizePrimarySignatory();
  }

  onCountyChange(): void {
    const countyId = Number(this.accountForm.get('county')?.value);
    this.towns = (this.kenyaLocationsService.towns || []).filter(
      town => town.countyId === countyId
    );
    this.accountForm.patchValue({ city: '' }, { emitEvent: false });
  }

  private initializeDocuments(): void {
    this.documents = {
      profile: this.createDocument('Profile Photo', true, 'fa-user-circle'),
      nationalId: this.createDocument('National ID / Passport', false, 'fa-id-card'),
      kra: this.createDocument('KRA PIN Certificate', true, 'fa-file-invoice'),
      signature: this.createDocument('Signature Specimen', true, 'fa-signature'),
      address: this.createDocument('Proof of Address', false, 'fa-map-marker-alt'),
      income: this.createDocument('Proof of Income', false, 'fa-money-check'),
      groupCertificate: this.createDocument('Group Registration Certificate', true, 'fa-users'),
      constitution: this.createDocument('Constitution', true, 'fa-book'),
      meetingResolution: this.createDocument('Meeting Resolution', true, 'fa-gavel'),
      incorporation: this.createDocument('Certificate of Incorporation', true, 'fa-building'),
      cr12: this.createDocument('CR12', true, 'fa-file-alt'),
      boardResolution: this.createDocument('Board Resolution', true, 'fa-landmark'),
      memorandum: this.createDocument('Memorandum & Articles', false, 'fa-file-contract'),
      registrationCertificate: this.createDocument('Registration Certificate', true, 'fa-certificate'),
      trustDeed: this.createDocument('Trust Deed', true, 'fa-balance-scale'),
      institutionResolution: this.createDocument('Institution Resolution', true, 'fa-university')
    };
  }

  private createDocument(title: string, required: boolean, icon: string): UploadedDocument {
    return {
      file: null,
      name: '',
      preview: null,
      uploaded: false,
      required,
      size: 0,
      type: '',
      title,
      icon
    };
  }

  private validateFile(file: File, imageOnly = false): boolean {
    this.imageError = '';
    if (!file) return false;

    if (file.size <= 0 || file.size > this.MAX_FILE_SIZE) {
      this.imageError = 'File must be greater than 0 bytes and not exceed 10 MB.';
      return false;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const safeExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
    if (!safeExtensions.includes(extension)) {
      this.imageError = 'Only PDF, JPG, JPEG, PNG or WEBP files are allowed.';
      return false;
    }

    if (imageOnly && !file.type.startsWith('image/')) {
      this.imageError = 'Only image files are allowed for the profile photograph.';
      return false;
    }

    if (!imageOnly && file.type && !this.allowedDocumentTypes.includes(file.type)) {
      this.imageError = 'The selected document type is not supported.';
      return false;
    }

    return true;
  }

  private createImagePreview(file: File, callback: (preview: string | ArrayBuffer | null) => void): void {
    const reader = new FileReader();
    reader.onload = () => callback(reader.result);
    reader.onerror = () => callback(null);
    reader.readAsDataURL(file);
  }

  private setDocument(file: File, key: string): void {
    if (!this.validateFile(file)) return;
    const document = this.documents[key];
    if (!document) return;

    document.file = file;
    document.name = file.name;
    document.uploaded = true;
    document.size = file.size;
    document.type = file.type;
    document.preview = null;

    if (file.type.startsWith('image/')) {
      this.createImagePreview(file, preview => document.preview = preview);
    }
    this.buildMissingItems(false);
  }

  uploadDocument(event: any, key: string): void {
    const file = event.target.files?.[0] as File | undefined;
    if (file) this.setDocument(file, key);
    event.target.value = '';
  }

  replaceDocument(event: any, key: string): void {
    this.uploadDocument(event, key);
  }

  removeDocument(key: string): void {
    const doc = this.documents[key];
    if (!doc) return;
    doc.file = null;
    doc.name = '';
    doc.preview = null;
    doc.uploaded = false;
    doc.size = 0;
    doc.type = '';
    this.buildMissingItems(false);
  }

  previewDocument(key: string): void {
    const file = this.documents[key]?.file;
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  downloadDocument(key: string): void {
    const file = this.documents[key]?.file;
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace(/[\\/:*?"<>|]/g, '_');
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  viewDocument(file: File): void {
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  onFileChange(event: any): void {
    const file = event.target.files?.[0] as File | undefined;
    if (!file || !this.validateFile(file, true)) return;
    this.selectedImage = file;
    this.accountForm.patchValue({ image: file }, { emitEvent: false });
    this.setDocument(file, 'profile');
    this.createImagePreview(file, preview => this.previewUrl = preview);
    event.target.value = '';
  }

  removeProfilePhoto(): void {
    this.selectedImage = null;
    this.previewUrl = null;
    this.removeDocument('profile');
    this.accountForm.patchValue({ image: null }, { emitEvent: false });
  }

  onPassportPhotoSelected(event: any): void {
    this.onFileChange(event);
  }

  onNationalIdSelected(event: any): void { this.uploadDocument(event, 'nationalId'); }
  onIdDocumentSelected(event: any): void { this.onNationalIdSelected(event); }
  onKraDocumentSelected(event: any): void { this.uploadDocument(event, 'kra'); }
  onSignatureSelected(event: any): void { this.uploadDocument(event, 'signature'); }
  onAddressProofSelected(event: any): void { this.uploadDocument(event, 'address'); }
  onIncomeProofSelected(event: any): void { this.uploadDocument(event, 'income'); }

  onGroupCertificateSelected(event: any): void {
    this.groupCertificate = event.target.files?.[0] || null;
    this.uploadDocument(event, 'groupCertificate');
    this.groupCertificateName = this.documents['groupCertificate']?.name || '';
  }
  onGroupConstitutionSelected(event: any): void {
    this.groupConstitution = event.target.files?.[0] || null;
    this.uploadDocument(event, 'constitution');
    this.groupConstitutionName = this.documents['constitution']?.name || '';
  }
  onMeetingResolutionSelected(event: any): void {
    this.meetingResolution = event.target.files?.[0] || null;
    this.uploadDocument(event, 'meetingResolution');
    this.meetingResolutionName = this.documents['meetingResolution']?.name || '';
  }
  onCertificateOfIncorporationSelected(event: any): void {
    this.certificateOfIncorporation = event.target.files?.[0] || null;
    this.uploadDocument(event, 'incorporation');
    this.certificateOfIncorporationName = this.documents['incorporation']?.name || '';
  }
  onCr12Selected(event: any): void {
    this.cr12Document = event.target.files?.[0] || null;
    this.uploadDocument(event, 'cr12');
    this.cr12Name = this.documents['cr12']?.name || '';
  }
  onBoardResolutionSelected(event: any): void {
    this.boardResolutionDocument = event.target.files?.[0] || null;
    this.uploadDocument(event, 'boardResolution');
    this.boardResolutionName = this.documents['boardResolution']?.name || '';
  }
  onMemorandumSelected(event: any): void {
    this.memorandumDocument = event.target.files?.[0] || null;
    this.uploadDocument(event, 'memorandum');
    this.documents['memorandum'].name = this.documents['memorandum']?.name || '';
  }
  onRegistrationCertificateSelected(event: any): void {
    this.registrationCertificate = event.target.files?.[0] || null;
    this.uploadDocument(event, 'registrationCertificate');
    this.registrationCertificateName = this.documents['registrationCertificate']?.name || '';
  }
  onTrustDeedSelected(event: any): void {
    this.trustDeed = event.target.files?.[0] || null;
    this.uploadDocument(event, 'trustDeed');
    this.trustDeedName = this.documents['trustDeed']?.name || '';
  }
  onInstitutionResolutionSelected(event: any): void {
    this.institutionResolution = event.target.files?.[0] || null;
    this.uploadDocument(event, 'institutionResolution');
    this.institutionResolutionName = this.documents['institutionResolution']?.name || '';
  }

  removeNationalId(): void { this.removeDocument('nationalId'); }
  removeKraDocument(): void { this.removeDocument('kra'); }
  removeSignature(): void { this.removeDocument('signature'); }
  removeAddressProof(): void { this.removeDocument('address'); }
  removeIncomeProof(): void { this.removeDocument('income'); }

  get passportPhoto(): File | null { return this.documents['profile']?.file || null; }
  get nationalIdDocument(): File | null { return this.documents['nationalId']?.file || null; }
  get kraPinDocument(): File | null { return this.documents['kra']?.file || null; }
  get signatureDocument(): File | null { return this.documents['signature']?.file || null; }
  get proofOfAddressDocument(): File | null { return this.documents['address']?.file || null; }
  get incomeProofDocument(): File | null { return this.documents['income']?.file || null; }

  get passportPhotoName(): string { return this.documents['profile']?.name || ''; }
  get nationalIdDocumentName(): string { return this.documents['nationalId']?.name || ''; }
  get kraPinDocumentName(): string { return this.documents['kra']?.name || ''; }
  get signatureName(): string { return this.documents['signature']?.name || ''; }
  get proofOfAddressName(): string { return this.documents['address']?.name || ''; }
  get incomeProofName(): string { return this.documents['income']?.name || ''; }

  get passportPhotoPreview(): string | ArrayBuffer | null { return this.documents['profile']?.preview || null; }
  get nationalIdDocumentPreview(): string | ArrayBuffer | null { return this.documents['nationalId']?.preview || null; }
  get kraPinDocumentPreview(): string | ArrayBuffer | null { return this.documents['kra']?.preview || null; }
  get signaturePreview(): string | ArrayBuffer | null { return this.documents['signature']?.preview || null; }
  get proofOfAddressPreview(): string | ArrayBuffer | null { return this.documents['address']?.preview || null; }
  get incomeProofPreview(): string | ArrayBuffer | null { return this.documents['income']?.preview || null; }

  get addressProofName(): string { return this.proofOfAddressName; }
  get addressProofPreview(): string | ArrayBuffer | null { return this.proofOfAddressPreview; }

  getUploadedDocuments(): UploadedDocument[] {
    return Object.values(this.documents).filter(doc => !!doc.file);
  }

  getRequiredDocuments(): UploadedDocument[] {
    return this.requiredDocumentKeys
      .map(key => this.documents[key])
      .filter((doc): doc is UploadedDocument => !!doc);
  }

  getDocument(key: string): UploadedDocument | null { return this.documents[key] || null; }
  getDocumentName(key: string): string { return this.documents[key]?.name || ''; }
  getDocumentPreview(key: string): string | ArrayBuffer | null { return this.documents[key]?.preview || null; }
  getDocumentIcon(key: string): string { return this.documents[key]?.icon || 'fa-file'; }
  getDocumentTitle(key: string): string { return this.documents[key]?.title || ''; }
  getDocumentSize(key: string): number { return this.documents[key]?.size || 0; }
  getDocumentType(key: string): string { return this.documents[key]?.type || ''; }
  isDocumentUploaded(key: string): boolean { return !!this.documents[key]?.uploaded; }
  hasDocument(key: string): boolean { return !!this.documents[key]?.file; }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(2)} ${units[i]}`;
  }

  resetDocument(key: string): void { this.removeDocument(key); }
  clearAllDocuments(): void { Object.keys(this.documents).forEach(key => this.removeDocument(key)); }

  private getInvalidFieldsForCurrentStep(): { name: string; label: string }[] {
    const fields: { name: string; label: string }[] = [];

    if (this.currentStep === 1) {
      if (this.isIndividual) {
        fields.push(
          { name: 'modeOfOperation', label: 'Mode of Operation' },
          { name: 'fullName', label: 'Full Name' },
          { name: 'nationalId', label: this.accountForm.get('idType')?.value === 'PASSPORT' ? 'Passport Number' : 'National ID' },
          { name: 'dateOfBirth', label: 'Date of Birth' },
          { name: 'gender', label: 'Gender' },
          { name: 'nationality', label: 'Nationality' }
        );
      } else {
        fields.push(
          { name: 'organizationName', label: 'Organization Name' },
          { name: 'registrationNumber', label: 'Registration Number' },
          { name: 'registrationDate', label: 'Registration Date' },
          { name: 'registrationType', label: 'Registration Type' },
          { name: 'kraPin', label: 'KRA PIN' },
          { name: 'email', label: 'Organization Email' },
          { name: 'phoneNumber', label: 'Organization Phone' },
          { name: 'residentialAddress', label: 'Physical Address' },
          { name: 'county', label: 'County' },
          { name: 'city', label: 'Town / City' }
        );
        if (this.isCompany) {
          fields.push(
            { name: 'industry', label: 'Industry' },
            { name: 'natureOfBusiness', label: 'Nature of Business' }
          );
        }
        if (this.isInstitution) {
          fields.push({ name: 'institutionType', label: 'Institution Type' });
        }
      }
    }

    if (this.currentStep === 2 && this.isIndividual) {
      fields.push(
        { name: 'phoneNumber', label: 'Phone Number' },
        { name: 'email', label: 'Email Address' },
        { name: 'residentialAddress', label: 'Residential Address' },
        { name: 'county', label: 'County' },
        { name: 'city', label: 'Town / City' }
      );
    }

    if (this.currentStep === 3 && this.isIndividual) {
      fields.push(
        { name: 'modeOfOperation', label: 'Mode of Operation' },
        { name: 'employmentStatus', label: 'Employment Status' },
        { name: 'monthlyIncome', label: 'Monthly Income' },
        { name: 'sourceOfFunds', label: 'Source of Funds' },
        { name: 'accountType', label: 'Account Type' }
      );
    }

    if (this.currentStep === 4 && this.isIndividual) {
      fields.push(
        { name: 'nextOfKinName', label: 'Next of Kin Name' },
        { name: 'nextOfKinPhone', label: 'Next of Kin Phone' },
        { name: 'nextOfKinRelationship', label: 'Next of Kin Relationship' }
      );
    }

    if (this.currentStep === 6 && this.isIndividual) {
      fields.push({ name: 'declaration', label: 'Declaration' });
    }

    return fields.filter(field => {
      const control = this.accountForm.get(field.name);
      if (!control) return false;
      control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      return control.invalid || !this.hasUsableValue(control);
    });
  }

private validateOrganizationPeople(
  add: (message: string) => void
): void {

  if (!this.organizationPeople || this.organizationPeople.length === 0) {
    add('Add at least one official/member.');
    return;
  }

  this.organizationPeople.controls.forEach((person, index) => {

    const number = index + 1;

    const fullName = person.get('fullName');
    const nationalId = person.get('nationalId');
    const phone = person.get('phone');
    const email = person.get('email');
    const designation = person.get('designation');

    // IMPORTANT:
    // Do not require KRA PIN here unless your business rules
    // explicitly require every official to provide one.

    fullName?.updateValueAndValidity({
      onlySelf: true,
      emitEvent: false
    });

    nationalId?.updateValueAndValidity({
      onlySelf: true,
      emitEvent: false
    });

    phone?.updateValueAndValidity({
      onlySelf: true,
      emitEvent: false
    });

    email?.updateValueAndValidity({
      onlySelf: true,
      emitEvent: false
    });

    designation?.updateValueAndValidity({
      onlySelf: true,
      emitEvent: false
    });

    if (!fullName || fullName.invalid || !this.hasUsableValue(fullName)) {
      add(`Official ${number}: Full Name`);
    }

    if (!nationalId || nationalId.invalid || !this.hasUsableValue(nationalId)) {
      add(`Official ${number}: National ID`);
    }

    if (!phone || phone.invalid || !this.hasUsableValue(phone)) {
      add(`Official ${number}: Phone Number`);
    }

    if (!designation || designation.invalid || !this.hasUsableValue(designation)) {
      add(`Official ${number}: Designation`);
    }

    // Email is optional, but if entered it must be valid.
    if (
      email &&
      this.hasUsableValue(email) &&
      email.invalid
    ) {
      add(`Official ${number}: Email Address is invalid`);
    }
  });
}

  private validateOrganizationSignatories(add?: (message: string) => void): boolean {
    const target = add || ((message: string) => this.missingItems.push(message));
    const mode = this.organizationModeOfOperation;
    const officials = this.organizationPeople.length;
    const selected = this.totalSignatories;

    if (!mode) {
      target('Mode of Operation');
      return false;
    }
    if (officials === 0) {
      target('Add at least one organization official.');
      return false;
    }
    if (selected === 0) {
      target('Select at least one authorized signatory.');
      return false;
    }

    const required = this.getRequiredSignatories(mode);
    if (mode === ModeOfOperation.ALL && selected !== officials) {
      target(`All ${officials} officials must be selected as signatories.`);
      return false;
    }
    if ((mode === ModeOfOperation.SINGLY || mode === ModeOfOperation.TTS) && selected !== required) {
      target(`${this.getModeLabel(mode)} requires exactly ${required} signator${required === 1 ? 'y' : 'ies'}.`);
      return false;
    }
    if (mode !== ModeOfOperation.ALL && mode !== ModeOfOperation.SINGLY && mode !== ModeOfOperation.TTS && selected < required) {
      target(`${this.getModeLabel(mode)} requires at least ${required} signatories.`);
      return false;
    }

    const hasPrimary = this.organizationPeople.controls.some(
      p => p.get('isSignatory')?.value && p.get('primarySignatory')?.value
    );
    if (!hasPrimary) {
      target('Select a Primary Signatory.');
      return false;
    }

    return true;
  }

  private validateDocuments(add: (message: string) => void): void {
    const labels: { [key: string]: string } = {
      profile: 'Profile Picture',
      nationalId: 'National ID / Passport',
      kra: 'KRA PIN Certificate',
      signature: 'Signature Specimen',
      groupCertificate: 'Group Registration Certificate',
      constitution: 'Group Constitution',
      meetingResolution: 'Meeting Resolution',
      incorporation: 'Certificate of Incorporation',
      cr12: 'CR12',
      boardResolution: 'Board Resolution',
      registrationCertificate: 'Registration Certificate',
      trustDeed: 'Trust Deed',
      institutionResolution: 'Institution Resolution'
    };

    this.requiredDocumentKeys.forEach(key => {
      const doc = this.documents[key];
      if (!doc?.file) add(labels[key] || key);
    });
  }

 private validateCompleteRegistration(): string[] {

  /*
   * ONE complete form validation pass.
   */
  this.accountForm.updateValueAndValidity({
    emitEvent: false
  });

  /*
   * Update live credential state only.
   */
  this.updateLiveCredentialValidation();

  const missing: string[] = [];

  const add = (message: string) => {

    if (
      message &&
      !missing.includes(message)
    ) {
      missing.push(message);
    }
  };

  /*
   * ----------------------------------------------------------
   * OWNER ↔ NEXT OF KIN PHONE
   * ----------------------------------------------------------
   */
  if (
    this.accountForm.hasError('samePhone') ||
    this.accountForm.hasError('duplicatePhone') ||
    this.accountForm
      .get('nextOfKinPhone')
      ?.hasError('sameAsOwnerPhone')
  ) {

    add(
      'Next of Kin phone number must be different from the applicant phone number.'
    );
  }

  /*
   * ----------------------------------------------------------
   * DUPLICATE INFORMATION
   * ----------------------------------------------------------
   */
  if (this.hasDuplicateErrors()) {

    add(
      'Duplicate identity, phone or email information detected.'
    );
  }

  /*
   * ----------------------------------------------------------
   * CUSTOMER CATEGORY
   * ----------------------------------------------------------
   */
  if (!this.selectedCustomerCategory) {

    add('Customer Category');

    return [...new Set(missing)];
  }

  /*
   * ----------------------------------------------------------
   * INDIVIDUAL
   * ----------------------------------------------------------
   */
  if (this.isIndividual) {

    const fields: Array<[string, string]> = [

      ['modeOfOperation', 'Mode of Operation'],
      ['fullName', 'Full Name'],
      ['nationalId', 'National ID / Passport'],
      ['dateOfBirth', 'Date of Birth'],
      ['gender', 'Gender'],
      ['nationality', 'Nationality'],
      ['phoneNumber', 'Phone Number'],
      ['email', 'Email Address'],
      ['residentialAddress', 'Residential Address'],
      ['county', 'County'],
      ['city', 'Town / City'],
      ['employmentStatus', 'Employment Status'],
      ['monthlyIncome', 'Monthly Income'],
      ['sourceOfFunds', 'Source of Funds'],
      ['accountType', 'Account Type'],
      ['nextOfKinName', 'Next of Kin Name'],
      ['nextOfKinPhone', 'Next of Kin Phone'],
      ['nextOfKinRelationship', 'Next of Kin Relationship']
    ];

    fields.forEach(([field, label]) => {

      const control =
        this.accountForm.get(field);

      control?.updateValueAndValidity({
        onlySelf: true,
        emitEvent: false
      });

      if (
        !control ||
        control.invalid ||
        !this.hasUsableValue(control)
      ) {
        add(label);
      }
    });

  } else {

    /*
     * --------------------------------------------------------
     * ORGANIZATION
     * --------------------------------------------------------
     */
    const fields: Array<[string, string]> = [

      ['organizationName', 'Organization Name'],
      ['registrationNumber', 'Registration Number'],
      ['registrationDate', 'Registration Date'],
      ['registrationType', 'Registration Type'],
      ['kraPin', 'KRA PIN'],
      ['email', 'Organization Email'],
      ['phoneNumber', 'Organization Phone'],
      ['residentialAddress', 'Physical Address'],
      ['county', 'County'],
      ['city', 'Town / City']
    ];

    if (this.isCompany) {

      fields.push(
        ['industry', 'Industry'],
        ['natureOfBusiness', 'Nature of Business']
      );
    }

    if (this.isInstitution) {

      fields.push(
        ['institutionType', 'Institution Type']
      );
    }

    fields.forEach(([field, label]) => {

      const control =
        this.accountForm.get(field);

      control?.updateValueAndValidity({
        onlySelf: true,
        emitEvent: false
      });

      if (
        !control ||
        control.invalid ||
        !this.hasUsableValue(control)
      ) {
        add(label);
      }
    });

    this.validateOrganizationPeople(add);
    this.validateOrganizationSignatories(add);
  }

  /*
   * ----------------------------------------------------------
   * OPTIONAL FIELDS
   * ----------------------------------------------------------
   */
  const optionalFields: Array<[string, string]> = [
    ['maritalStatus', 'Marital Status'],
    ['nextOfKinEmail', 'Next of Kin Email']
  ];

  optionalFields.forEach(([field, label]) => {

    const control =
      this.accountForm.get(field);

    control?.updateValueAndValidity({
      onlySelf: true,
      emitEvent: false
    });

    if (
      control?.value &&
      control.invalid
    ) {
      add(`${label} is invalid`);
    }
  });

  /*
   * ----------------------------------------------------------
   * DOCUMENTS
   * ----------------------------------------------------------
   */
  this.validateDocuments(add);

  /*
   * ----------------------------------------------------------
   * DECLARATION
   * ----------------------------------------------------------
   */
  if (
    !this.accountForm.get('declaration')?.value
  ) {
    add('Accept the declaration.');
  }

  return [...new Set(missing)];
}

  buildMissingItems(updateError = true): void {
    const previous = this.missingItems;
    this.missingItems = [];

    if (!this.accountForm || !this.selectedCustomerCategory) return;

    if (this.currentStep === 0) {
      if (!this.accountForm.get('customerCategory')?.value) this.missingItems.push('Customer Category');
    } else if (this.currentStep === 1) {
      this.missingItems.push(...this.getInvalidFieldsForCurrentStep().map(x => x.label));
    } else if (this.currentStep === 2) {
      if (this.isIndividual) {
        this.missingItems.push(...this.getInvalidFieldsForCurrentStep().map(x => x.label));
      } else {
        this.validateOrganizationPeople(message => this.missingItems.push(message));
      }
    } else if (this.currentStep === 3) {
      if (this.isIndividual) {
        this.missingItems.push(...this.getInvalidFieldsForCurrentStep().map(x => x.label));
      } else {
        this.validateOrganizationSignatories(message => this.missingItems.push(message));
      }
    } else if (this.currentStep === 4) {
      if (this.isIndividual) {
        this.missingItems.push(...this.getInvalidFieldsForCurrentStep().map(x => x.label));
      } else {
        this.validateDocuments(message => this.missingItems.push(message));
      }
    } else if (this.currentStep === 5) {
      if (this.isIndividual) {
        this.validateDocuments(message => this.missingItems.push(message));
      } else {
        this.validateCompleteRegistration().forEach(x => this.missingItems.push(x));
      }
    } else if (this.currentStep === 6 && this.isIndividual) {
      this.validateCompleteRegistration().forEach(x => this.missingItems.push(x));
    }

    this.missingItems = [...new Set(this.missingItems)];
    if (updateError && previous.length !== this.missingItems.length) {
      this.errorMessage = this.missingItems.length
        ? 'Please complete the highlighted requirements before continuing.'
        : '';
    }
  }

 private isStepValid(
  step: number,
  touch = true
): boolean {

  /*
   * ----------------------------------------------------------
   * ONE authoritative form validation pass.
   * ----------------------------------------------------------
   */
  this.accountForm.updateValueAndValidity({
    emitEvent: false
  });

  /*
   * Update live UI state only.
   *
   * IMPORTANT:
   * updateLiveCredentialValidation() no longer validates
   * the entire form recursively.
   */
  this.updateLiveCredentialValidation();

  this.missingItems = [];

  /*
   * ----------------------------------------------------------
   * STEP 0 — CUSTOMER CATEGORY
   * ----------------------------------------------------------
   */
  if (step === 0) {

    const control =
      this.accountForm.get('customerCategory');

    const valid =
      !!control?.value;

    if (!valid && touch) {
      control?.markAsTouched();
    }

    if (!valid) {
      this.missingItems = [
        'Customer Category'
      ];
    }

    return valid;
  }

  /*
   * ----------------------------------------------------------
   * STEP 1 — PERSONAL / ORGANIZATION DETAILS
   * ----------------------------------------------------------
   */
  if (step === 1) {

    const invalid =
      this.getInvalidFieldsForCurrentStep();

    if (invalid.length && touch) {

      invalid.forEach(item => {
        this.accountForm
          .get(item.name)
          ?.markAsTouched();
      });
    }

    this.missingItems =
      invalid.map(item => item.label);

    return invalid.length === 0;
  }

  /*
   * ----------------------------------------------------------
   * STEP 2
   * ----------------------------------------------------------
   */
  if (step === 2) {

    if (this.isIndividual) {

      const invalid =
        this.getInvalidFieldsForCurrentStep();

      if (invalid.length && touch) {

        invalid.forEach(item => {
          this.accountForm
            .get(item.name)
            ?.markAsTouched();
        });
      }

      this.missingItems =
        invalid.map(item => item.label);

      return invalid.length === 0;
    }

    this.validateOrganizationPeople(
      message => this.missingItems.push(message)
    );

    this.missingItems =
      [...new Set(this.missingItems)];

    return this.missingItems.length === 0;
  }

  /*
   * ----------------------------------------------------------
   * STEP 3
   * ----------------------------------------------------------
   */
  if (step === 3) {

    if (this.isIndividual) {

      const invalid =
        this.getInvalidFieldsForCurrentStep();

      if (invalid.length && touch) {

        invalid.forEach(item => {
          this.accountForm
            .get(item.name)
            ?.markAsTouched();
        });
      }

      this.missingItems =
        invalid.map(item => item.label);

      return invalid.length === 0;
    }

    this.validateOrganizationSignatories(
      message => this.missingItems.push(message)
    );

    this.missingItems =
      [...new Set(this.missingItems)];

    return this.missingItems.length === 0;
  }

  /*
   * ----------------------------------------------------------
   * STEP 4
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   * For organizations this is Documents.
   * For individuals this is Next Of Kin.
   */
  if (step === 4) {

    if (this.isIndividual) {

      const invalid =
        this.getInvalidFieldsForCurrentStep();

      if (invalid.length && touch) {

        invalid.forEach(item => {
          this.accountForm
            .get(item.name)
            ?.markAsTouched();
        });
      }

      this.missingItems =
        invalid.map(item => item.label);

      return invalid.length === 0;
    }

    this.validateDocuments(
      message => this.missingItems.push(message)
    );

    this.missingItems =
      [...new Set(this.missingItems)];

    return this.missingItems.length === 0;
  }

  /*
   * ----------------------------------------------------------
   * STEP 5
   * ----------------------------------------------------------
   *
   * For individuals = Documents.
   * For organizations = Review.
   */
  if (step === 5) {

    if (this.isIndividual) {

      this.validateDocuments(
        message => this.missingItems.push(message)
      );

      this.missingItems =
        [...new Set(this.missingItems)];

      return this.missingItems.length === 0;
    }

    const missing =
      this.validateCompleteRegistration();

    this.missingItems =
      [...new Set(missing)];

    return this.missingItems.length === 0;
  }

  /*
   * ----------------------------------------------------------
   * STEP 6 — INDIVIDUAL REVIEW
   * ----------------------------------------------------------
   */
  if (
    step === 6 &&
    this.isIndividual
  ) {

    const declaration =
      this.accountForm.get('declaration');

    if (!declaration?.value) {
      this.missingItems.push(
        'Accept the declaration.'
      );

      if (touch) {
        declaration?.markAsTouched();
      }
    }

    const completeMissing =
      this.validateCompleteRegistration();

    this.missingItems.push(
      ...completeMissing
    );

    this.missingItems =
      [...new Set(this.missingItems)];

    return this.missingItems.length === 0;
  }

  return true;
}


nextStep(): void {

  /*
   * Prevent accidental repeated clicks while Angular
   * is processing the current navigation.
   */
  if (this.loading) {
    return;
  }

  this.errorMessage = '';
  this.missingItems = [];

  /*
   * Customer category must exist.
   */
  if (!this.selectedCustomerCategory) {

    this.currentStep = 0;

    const categoryControl =
      this.accountForm.get('customerCategory');

    categoryControl?.markAsTouched();

    this.missingItems = [
      'Customer Category'
    ];

    this.errorMessage =
      'Please select a customer category before continuing.';

    this.scrollToError();

    return;
  }

  /*
   * Validate ONLY the current step.
   */
  const valid =
    this.isStepValid(
      this.currentStep,
      true
    );

  if (!valid) {

    this.errorMessage =
      'Cannot continue yet. Please correct the highlighted fields before continuing.';

    this.missingItems =
      [...new Set(this.missingItems)];

    this.scrollToError();

    return;
  }

  /*
   * Move to the next step.
   */
  if (this.currentStep < this.maxStep) {

    this.currentStep++;

    this.wizardStarted = true;

    this.errorMessage = '';
    this.missingItems = [];

    this.scrollToTop();
  }
}

  previousStep(): void {
    this.errorMessage = '';
    this.missingItems = [];
    if (this.currentStep > 0) {
      this.currentStep--;
      this.scrollToTop();
    }
  }

  private scrollToTop(): void {
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }

  private scrollToError(): void {
    setTimeout(() => {
      const element = document.querySelector('.registration-validation-summary, .alert-danger');
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

isStep2Valid(): boolean {
  return this.isStepValid(2, false);
}


  formatFieldName(field: string): string {
    return field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  }

  getPersonControl(person: AbstractControl, controlName: string): FormControl {
    return person.get(controlName) as FormControl;
  }
  

onSubmit(): void {

  if (this.loading) {
    return;
  }

  this.successMessage = '';
  this.errorMessage = '';
  this.imageError = '';

  /*
   * ==========================================================
   * FINAL SYNCHRONIZATION
   * ==========================================================
   *
   * Never trust stale validation state at submission.
   */
  this.accountForm.updateValueAndValidity({
    emitEvent: false
  });

  this.updateLiveCredentialValidation();

  /*
   * Validate EVERYTHING.
   */
  const missing =
    this.validateCompleteRegistration();

  this.missingItems =
    [...new Set(missing)];

  if (this.missingItems.length > 0) {

    this.errorMessage =
      'Cannot submit yet. Please resolve all highlighted requirements.';

    this.accountForm.markAllAsTouched();

    /*
     * Re-run validation after marking controls touched.
     */
    this.accountForm.updateValueAndValidity({
      emitEvent: false
    });

    this.scrollToError();

    return;
  }

  /*
   * ==========================================================
   * SUBMISSION
   * ==========================================================
   */

  this.loading = true;

  const formData =
    new FormData();

  Object.keys(
    this.accountForm.controls
  ).forEach(key => {

    const value =
      this.accountForm.get(key)?.value;

    if (
      [
        'organizationPeople',
        'directors',
        'officials',
        'signatories',
        'beneficialOwners',
        'image',
        'declaration'
      ].includes(key)
    ) {
      return;
    }

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return;
    }

    if (
      key === 'dateOfBirth' ||
      key === 'registrationDate'
    ) {

      const date =
        new Date(value);

      formData.append(
        key,
        isNaN(date.getTime())
          ? String(value)
          : date.toISOString().split('T')[0]
      );

    } else if (
      key === 'phoneNumber'
    ) {

      formData.append(
        key,
        this.normalizeKenyanPhone(value)
      );

    } else if (
      key === 'email'
    ) {

      formData.append(
        key,
        String(value)
          .trim()
          .toLowerCase()
      );

    } else if (
      key === 'kraPin'
    ) {

      formData.append(
        key,
        String(value)
          .trim()
          .toUpperCase()
      );

    } else {

      formData.append(
        key,
        String(value).trim()
      );
    }
  });

  if (this.selectedImage) {
    formData.append(
      'image',
      this.selectedImage
    );
  }

  formData.append(
    'declaration',
    'true'
  );

  this.accountService
    .createAccount(formData)
    .subscribe({

      next: (res: any) => {

        if (
          !res ||
          res.status !== 'SUCCESS'
        ) {

          this.loading = false;

          this.errorMessage =
            res?.message ||
            'Account creation failed.';

          this.scrollToError();

          return;
        }

        const accountId =
          res?.account?.id ??
          res?.accountId ??
          res?.id;

        if (!accountId) {

          this.loading = false;

          this.errorMessage =
            'Customer was created, but the account ID was not returned by the server.';

          this.scrollToError();

          return;
        }

        this.savePostAccountData(
          Number(accountId)
        );
      },

      error: (err: any) => {

        this.loading = false;

        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          'Failed to create account. Please try again.';

        this.scrollToError();
      }
    });
}

  private getOrganizationPeoplePayload(): any[] {
    return this.organizationPeople.getRawValue().map((person: any) => ({
      fullName: person.fullName?.trim(),
      nationalId: person.nationalId?.trim(),
      kraPin: person.kraPin?.trim(),
      phone: this.normalizeKenyanPhone(person.phone),
      email: person.email?.trim().toLowerCase(),
      designation: person.designation,
      position: person.position,
      shareholding: Number(person.shareholding || 0),
      isOfficial: !!person.isOfficial,
      isDirector: !!person.isDirector,
      isTrustee: !!person.isTrustee,
      isBeneficialOwner: !!person.isBeneficialOwner,
      isSignatory: !!person.isSignatory,
      primarySignatory: !!person.primarySignatory,
      signingLimit: Number(person.signingLimit || 0),
      isMaker: !!person.isMaker,
      isChecker: !!person.isChecker,
      isApprover: !!person.isApprover,
      transactionLimit: Number(person.transactionLimit || 0)
    }));
  }

  private savePostAccountData(accountId: number): void {
    const people = this.isIndividual ? [] : this.getOrganizationPeoplePayload();
    const peopleRequest = this.isIndividual
      ? of(null)
      : this.accountService.saveOrganizationPeople(accountId, people);

    peopleRequest.subscribe({
      next: () => this.uploadAllDocuments(accountId),
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Account created, but organization members could not be saved.';
      }
    });
  }

  private uploadAllDocuments(accountId: number): void {
    const uploads: Observable<any>[] = [];

    this.addAccountDocumentUpload(uploads, accountId, this.passportPhoto, 'PASSPORT_PHOTO');
    this.addAccountDocumentUpload(uploads, accountId, this.signatureDocument, 'SIGNATURE');
    this.addAccountDocumentUpload(uploads, accountId, this.kraPinDocument, 'KRA_PIN');

    if (this.isIndividual) {
      this.addAccountDocumentUpload(uploads, accountId, this.nationalIdDocument, 'NATIONAL_ID');
      this.addAccountDocumentUpload(uploads, accountId, this.proofOfAddressDocument, 'PROOF_OF_ADDRESS');
      this.addAccountDocumentUpload(uploads, accountId, this.incomeProofDocument, 'PROOF_OF_INCOME');
    }

    if (this.isGroup) {
      this.addOrganizationDocumentUpload(uploads, accountId, this.documents['groupCertificate']?.file, 'GROUP_CERTIFICATE');
      this.addOrganizationDocumentUpload(uploads, accountId, this.documents['constitution']?.file, 'CONSTITUTION');
      this.addOrganizationDocumentUpload(uploads, accountId, this.documents['meetingResolution']?.file, 'MEETING_RESOLUTION');
    }

    if (this.isCompany) {
      this.addOrganizationDocumentUpload(uploads, accountId, this.documents['incorporation']?.file, 'CERTIFICATE_OF_INCORPORATION');
      this.addOrganizationDocumentUpload(uploads, accountId, this.documents['cr12']?.file, 'CR12');
      this.addOrganizationDocumentUpload(uploads, accountId, this.documents['boardResolution']?.file, 'BOARD_RESOLUTION');
      if (this.documents['memorandum']?.file) {
        this.addOrganizationDocumentUpload(uploads, accountId, this.documents['memorandum'].file, 'MEMORANDUM');
      }
    }

    if (this.isInstitution) {
      this.addOrganizationDocumentUpload(uploads, accountId, this.documents['registrationCertificate']?.file, 'REGISTRATION_CERTIFICATE');
      this.addOrganizationDocumentUpload(uploads, accountId, this.documents['trustDeed']?.file, 'TRUST_DEED');
      this.addOrganizationDocumentUpload(uploads, accountId, this.documents['institutionResolution']?.file, 'INSTITUTION_RESOLUTION');
    }

    if (!uploads.length) {
      this.finishSubmission(accountId);
      return;
    }

    forkJoin(uploads).subscribe({
      next: () => this.finishSubmission(accountId),
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Account was created, but one or more documents could not be saved.';
      }
    });
  }

  private addAccountDocumentUpload(
    uploads: Observable<any>[], accountId: number,
    file: File | null | undefined, documentType: string
  ): void {
    if (!file) return;
    uploads.push(this.accountService.uploadAccountDocument(accountId, file, documentType, 'ACCOUNT_REGISTRATION'));
  }

  private addOrganizationDocumentUpload(
    uploads: Observable<any>[], accountId: number,
    file: File | null | undefined, documentType: string
  ): void {
    if (!file) return;
    uploads.push(this.accountService.uploadOrganizationDocument(accountId, file, documentType));
  }

 private finishSubmission(accountId: number): void {

  this.loading = false;

  // Keep the success state visible.
  this.successMessage =
    'Customer onboarded successfully. Account, organization members and all required documents have been saved.';

  this.errorMessage = '';
  this.missingItems = [];

  // Do NOT immediately destroy the visible success state.
  // Reset only the form data while preserving the success banner.
  this.resetFormKeepUI(false);

  // Give staff enough time to see the confirmation.
  setTimeout(() => {

    this.successMessage = '';

    this.router.navigate(['/app/accounts']);

  }, 8000);
}

 private resetFormKeepUI(clearSuccessMessage: boolean = true): void {
    this.accountForm.reset({
      customerCategory: '', currency: 'KES', smsAlerts: true,
      emailStatements: true, statementFrequency: 'MONTHLY', communicationChannel: 'BOTH',
      declaration: false
    });
    this.organizationPeople.clear();
    this.documents = {};
    this.initializeDocuments();
    this.selectedImage = null;
    this.previewUrl = null;
    this.selectedCustomerCategory = null;
    this.stepTitles = [];
    this.currentStep = 0;
    this.wizardStarted = false;
  this.missingItems = [];
this.errorMessage = '';

if (clearSuccessMessage) {
  this.successMessage = '';
}
  }

  resetForm(): void {
    this.resetFormKeepUI();
  }
}