import { filter } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { Router } from '@angular/router';

import { AccountService } from '../services/account.service';
import { KenyaLocationsService } from '../services/services/kenya-locations.service';

import { County, Town } from '../../models/account.model';
import { SafeUrl } from '@angular/platform-browser';



/* ============================================================
   DOCUMENT MODEL
============================================================ */

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



/* ============================================================
   CUSTOMER CATEGORY
============================================================ */

export enum CustomerCategory {

    INDIVIDUAL = 'INDIVIDUAL',

    GROUP = 'GROUP',

    COMPANY = 'COMPANY',

    INSTITUTION = 'INSTITUTION'

}



/* ============================================================
   MODE OF OPERATION
============================================================ */

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

get memorandumName(): string {

    return this.documents['memorandum']?.name ?? '';

}

onCertificateOfIncorporationSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.certificateOfIncorporation = file;

    this.setDocument(file, 'incorporation');

}

onCr12Selected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.cr12Document = file;

    this.setDocument(file, 'cr12');

}

onBoardResolutionSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.boardResolutionDocument = file;

    this.setDocument(file, 'boardResolution');

}

onMemorandumSelected(event:any){

    this.uploadDocument(event,'memorandum');

}

onMeetingResolutionSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.meetingResolution = file;

    this.setDocument(file, 'meetingResolution');

}

onGroupConstitutionSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.groupConstitution = file;

    this.setDocument(file, 'constitution');

}

onRegistrationCertificateSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.registrationCertificate = file;

    this.setDocument(file, 'registrationCertificate');

}

onTrustDeedSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.trustDeed = file;

    this.setDocument(file, 'trustDeed');

}

onInstitutionResolutionSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.institutionResolution = file;

    this.setDocument(file, 'institutionResolution');

}


addressProof: File | null = null;
accountForm!: FormGroup;

counties: County[] = [];

towns: Town[] = [];


documents: { [key: string]: UploadedDocument } = {};


selectedImage: File | null = null;

previewUrl: string | ArrayBuffer | null = null;

imageError = '';



/* ============================================================
   SYSTEM
============================================================ */

loading = false;

successMessage = '';

errorMessage = '';

missingItems: string[] = [];



/* ============================================================
   WIZARD
============================================================ */

currentStep = 0;

totalSteps = 6;

wizardStarted = false;

stepTitles: string[] = [];



/* ============================================================
   ACCOUNT
============================================================ */

accountLoaded = false;

existingAccount: any = null;

isDuplicate = false;



/* ============================================================
   ENUM REFERENCES
============================================================ */

readonly CustomerCategory = CustomerCategory;

readonly ModeOfOperation = ModeOfOperation;



/* ============================================================
   CUSTOMER CATEGORY
============================================================ */

selectedCustomerCategory: CustomerCategory | null = null;



modeOfOperationOptions: {

    value: string;

    label: string;

}[] = [];



/* ============================================================
   NATIONAL ID
============================================================ */

idMaxLength = 8;

idPlaceholder = 'Enter 8-digit National ID';



/* ============================================================
   DOCUMENTS
============================================================ */

readonly MAX_FILE_SIZE = 10 * 1024 * 1024;



supportingDocuments: File[] = [];

supportingDocumentNames: string[] = [];



/* ============================================================
   CUSTOMER TYPES
============================================================ */

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



/* ============================================================
   STEP TITLES
============================================================ */

private readonly individualSteps = [

'Personal',

'Contact',

'Employment',

'Next Of Kin',

'Documents',

'Review'

];



private readonly groupSteps = [

'Group Details',

'Officials',

'Signatories',

'Documents',

'Review'

];



private readonly companySteps = [

'Company',

'Directors',

'Signatories',

'Documents',

'Review'

];



private readonly institutionSteps = [

'Institution',

'Officials',

'Signatories',

'Documents',

'Review'

];



/* ============================================================
   CONSTRUCTOR
============================================================ */

constructor(

private fb: FormBuilder,

private accountService: AccountService,

private kenyaLocationsService: KenyaLocationsService,

private router: Router

){

this.buildForm();

}

onGroupCertificateSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    // Legacy property (used by onSubmit/buildMissingItems)
    this.groupCertificate = file;

    // New document repository
    this.setDocument(file, 'groupCertificate');

}


selectCustomerCategory(category: CustomerCategory): void {

    // ONLY SELECT THE CATEGORY
    // DO NOT MOVE TO THE NEXT STEP HERE

    this.selectedCustomerCategory = category;

    this.accountForm.patchValue({
        customerCategory: category
    });

    // Prepare the appropriate wizard steps
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

    // IMPORTANT:
    // DO NOT PUT currentStep = 1 HERE
}

get registrationTitle(): string {

    switch (this.selectedCustomerCategory) {

        case CustomerCategory.INDIVIDUAL:
            return 'Individual Account Opening';

        case CustomerCategory.GROUP:
            return 'Group Account Opening';

        case CustomerCategory.COMPANY:
            return 'Company Account Opening';

        case CustomerCategory.INSTITUTION:
            return 'Institution Account Opening';

        default:
            return 'Customer Account Opening';

    }

}

onIdTypeChange(): void {

  const idType =
    this.accountForm.get('idType')?.value;

  this.accountForm.get('nationalId')?.reset();

}

allowNumbersOnly(event: any): void {

  event.target.value =
      event.target.value.replace(/\D/g,'');

}

checkPhoneNumber(): void {

    const phone =
        this.accountForm.get('phoneNumber')?.value;

    if(!phone){
        return;
    }

    // Backend duplicate check later

}

addOrganizationPerson(): void {

    this.organizationPeople.push(
        this.createOrganizationPerson()
    );

}

hasDuplicateErrors(): boolean {

    return false;

}

private nextOfKinPhoneValidator(): ValidatorFn {

    return (group: AbstractControl): ValidationErrors | null => {

        const phone = group.get('phoneNumber')?.value;

        const kin = group.get('nextOfKinPhone')?.value;

        if (phone && kin && phone === kin) {

            return {

                samePhone: true

            };

        }

        return null;

    };

}

formatFieldName(field:string):string{

    return field

        .replace(/([A-Z])/g,' $1')

        .replace(/^./,str=>str.toUpperCase());

}


getUploadedDocuments(): UploadedDocument[] {

    return Object.values(this.documents)

        .filter(doc => doc.file != null);

}

getRequiredDocuments(): UploadedDocument[] {

    const docs: UploadedDocument[] = [

        this.documents['profile'],
        this.documents['kra'],
        this.documents['signature']

    ];

    if (this.isIndividual) {

        docs.push(this.documents['nationalId']);

    }

    if (this.isGroup) {

        docs.push(
            this.documents['groupCertificate'],
            this.documents['constitution'],
            this.documents['meetingResolution']
        );

    }

    if (this.isCompany) {

        docs.push(
            this.documents['incorporation'],
            this.documents['cr12'],
            this.documents['boardResolution']
        );

    }

    if (this.isInstitution) {

        docs.push(
            this.documents['registrationCertificate'],
            this.documents['trustDeed'],
            this.documents['institutionResolution']
        );

    }

    return docs.filter(doc => !!doc);

}

resetForm(): void {

    this.accountForm.reset();

    this.currentStep = 0;

    this.selectedCustomerCategory = null;

}

private createOrganizationPerson(): FormGroup {

    return this.fb.group({

        fullName: ['', Validators.required],

        nationalId: ['', Validators.required],

        kraPin: [''],

        phone: [''],

        email: ['', Validators.email],

        designation: ['', Validators.required],

        position: [''],

        shareholding: [0],

        isOfficial: [true],

        isDirector: [false],

        isTrustee: [false],

        isBeneficialOwner: [false],

        isSignatory: [false],

        primarySignatory: [false],

        signingLimit: ['']

    });

}


get isIndividual(): boolean {
    return this.accountForm.get('customerCategory')?.value === 'INDIVIDUAL';
}

get isGroup(): boolean {
    return this.accountForm.get('customerCategory')?.value === 'GROUP';
}

get isCompany(): boolean {
    return this.accountForm.get('customerCategory')?.value === 'COMPANY';
}

get isInstitution(): boolean {
    return this.accountForm.get('customerCategory')?.value === 'INSTITUTION';
}

get totalSignatories(): number {

    return this.organizationPeople.controls
        .filter(person =>
            person.get('isSignatory')?.value
        )
        .length;

}

get uploadedDocuments(): number {

    return this.getRequiredDocuments()
        .filter(doc => doc.uploaded)
        .length;

}

get requiredDocuments(): number {

    return this.getRequiredDocuments().length;

}

get uploadProgress(): number {

    if (this.requiredDocuments === 0) {

        return 0;

    }

    return Math.round(
        (this.uploadedDocuments / this.requiredDocuments) * 100
    );

}

get allRequiredDocumentsUploaded(): boolean {

    return this.uploadedDocuments >= this.requiredDocuments;

}



/* ============================================================
   BUILD FORM
============================================================ */

private buildForm(): void {

this.accountForm = this.fb.group({

customerCategory: ['', Validators.required],

modeOfOperation: ['', Validators.required],



/*------------------------------------
 INDIVIDUAL
------------------------------------*/

fullName: [''],

idType: ['NATIONAL_ID'],

nationalId: [''],

dateOfBirth: [''],

gender: [''],



/*------------------------------------
 CONTACT
------------------------------------*/

phoneNumber: [''],

email: ['', Validators.email],

residentialAddress: [''],

county: [''],

city: [''],



/*------------------------------------
 ORGANIZATION
------------------------------------*/

organizationName: [''],

registrationNumber: [''],

registrationDate: [''],

registrationType: [''],

kraPin: [''],



/*------------------------------------
 FINANCIAL
------------------------------------*/

employmentStatus: [''],

employerName: [''],

businessType: [''],

businessLocation: [''],

monthlyIncome: [''],

sourceOfFunds: [''],

accountType: [''],



/*------------------------------------
 NEXT OF KIN
------------------------------------*/

nextOfKinName: [''],

nextOfKinPhone: [''],

nextOfKinRelationship: [''],



/*------------------------------------
 DECLARATION
------------------------------------*/

image: [null],

declaration: [false],



/*------------------------------------
 ARRAYS
------------------------------------*/

organizationPeople: this.fb.array([]),

directors: this.fb.array([]),

officials: this.fb.array([]),

signatories: this.fb.array([]),

beneficialOwners: this.fb.array([])

},

{

validators: [

this.nextOfKinPhoneValidator()

]

});

}



/* ============================================================
   FORM ARRAY GETTERS
============================================================ */

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

/* ============================================================
   NG ON INIT
============================================================ */

ngOnInit(): void {


      this.modeOfOperationOptions = [
        { value: ModeOfOperation.SINGLY, label: 'Single Signatory' },
        { value: ModeOfOperation.JOINT, label: 'Joint Account' },
        { value: ModeOfOperation.ANY_ONE, label: 'Any One to Sign' },
        { value: ModeOfOperation.ANY_TWO, label: 'Any Two to Sign' },
        { value: ModeOfOperation.ANY_THREE, label: 'Any Three to Sign' },
        { value: ModeOfOperation.ALL, label: 'All Must Sign' },
        { value: ModeOfOperation.TTS, label: 'TTS (Two to Sign)' },
        { value: ModeOfOperation.BOARD_APPROVAL, label: 'Board Approval' }
    ];

    this.counties = this.kenyaLocationsService.counties;

    if (this.counties.length > 0) {
        this.accountForm.patchValue({
            county: this.counties[0].id
        });
        this.onCountyChange();
    }

    this.initializeDocuments();

    this.accountForm.statusChanges.subscribe(() => {
        this.buildMissingItems();
    });

    this.accountForm.valueChanges.subscribe(() => {
        this.buildMissingItems();
    });

    // Load Counties
    this.counties = this.kenyaLocationsService.counties;

    if (this.counties.length > 0) {

        this.accountForm.patchValue({
            county: this.counties[0].id
        });

        this.onCountyChange();

    }

    // Initialize document repository
    this.initializeDocuments();

    // Build missing items automatically
    this.accountForm.statusChanges.subscribe(() => {

        this.buildMissingItems();

    });

    this.accountForm.valueChanges.subscribe(() => {

        this.buildMissingItems();

    });

}

onModeOfOperationChanged(): void {

  console.log(
    'Valid Mode Of Operations:',
    Object.values(ModeOfOperation)
  );

const mode =
  this.accountForm.get('modeOfOperation')?.value;

switch (mode) {

  case ModeOfOperation.SINGLY:
  case 'SINGLE':
  case ModeOfOperation.ANY_ONE:

    if (this.totalSignatories !== 1) {
      this.missingItems.push(
        'Exactly ONE signatory required.'
      );
    }

    break;

  case ModeOfOperation.ANY_TWO:

    if (this.totalSignatories < 2) {
      this.missingItems.push(
        'Any TWO requires at least two signatories.'
      );
    }

    break;

  case ModeOfOperation.ANY_THREE:

    if (this.totalSignatories < 3) {
      this.missingItems.push(
        'Any THREE requires at least three signatories.'
      );
    }

    break;

  case ModeOfOperation.TTS:

    if (this.totalSignatories !== 2) {
      this.missingItems.push(
        'TTS requires exactly two signatories.'
      );
    }

    break;

  case ModeOfOperation.ALL:

    if (
      this.totalSignatories !==
      this.organizationPeople.length
    ) {
      this.missingItems.push(
        'Every official must be a signatory.'
      );
    }

    break;

  case ModeOfOperation.BOARD_APPROVAL:

    // Apply your board approval rule here
    break;
}

  const correctedMode =
    this.accountForm.get('modeOfOperation')?.value;

  const required =
    this.getRequiredSignatories(correctedMode);

  const selected =
    this.organizationPeople.controls.filter(
      person =>
        person.get('isSignatory')?.value
    ).length;

  if (selected < required) {

    this.errorMessage =
      `Please select at least ${required} signatories.`;

  } else {

    this.errorMessage = '';

  }

}

toggleSignatory(index: number): void {

    const mode = this.accountForm.get('modeOfOperation')?.value;

    const required = this.getRequiredSignatories(mode);

    const person = this.organizationPeople.at(index);

    const checked = person.get('isSignatory')?.value;

    if (checked) {

        const selected = this.totalSignatories;

        if (selected > required && mode !== ModeOfOperation.ALL) {

            person.patchValue({
                isSignatory: false
            });

            this.errorMessage =
                `Only ${required} signatories are allowed for the selected mode.`;

            return;
        }

    }

    this.ensurePrimarySignatory();

    this.buildMissingItems();

}

private getRequiredSignatories(mode: string): number {

    switch (mode) {

        case ModeOfOperation.SINGLY:
        case ModeOfOperation.ANY_ONE:
            return 1;

        case ModeOfOperation.ANY_TWO:
        case ModeOfOperation.TTS:
            return 2;

        case ModeOfOperation.ANY_THREE:
            return 3;

        case ModeOfOperation.ALL:
            return this.organizationPeople.length;

        case ModeOfOperation.BOARD_APPROVAL:
            return 1; // or whatever your policy is

        default:
            return 1;
    }

}

/* ============================================================
   COUNTY CHANGED
============================================================ */

onCountyChange(): void {

    const countyId = Number(

        this.accountForm.get('county')?.value

    );

    this.towns = this.kenyaLocationsService.towns.filter(

        town => town.countyId === countyId

    );

    this.accountForm.patchValue({

        city: ''

    });

}



/* ============================================================
   INITIALIZE DOCUMENTS
============================================================ */

private initializeDocuments(): void {

    this.documents = {

        profile: this.createDocument(
            'Profile Photo',
            true,
            'fa-user-circle'
        ),

        nationalId: this.createDocument(
            'National ID / Passport',
            true,
            'fa-id-card'
        ),

        kra: this.createDocument(
            'KRA PIN Certificate',
            true,
            'fa-file-invoice'
        ),

        signature: this.createDocument(
            'Signature Specimen',
            true,
            'fa-signature'
        ),

        address: this.createDocument(
            'Proof of Address',
            false,
            'fa-map-marker-alt'
        ),

        income: this.createDocument(
            'Proof of Income',
            false,
            'fa-money-check'
        ),

        groupCertificate: this.createDocument(
            'Group Certificate',
            true,
            'fa-users'
        ),

        constitution: this.createDocument(
            'Group Constitution',
            true,
            'fa-book'
        ),

        meetingResolution: this.createDocument(
            'Meeting Resolution',
            true,
            'fa-gavel'
        ),

        incorporation: this.createDocument(
            'Certificate of Incorporation',
            true,
            'fa-building'
        ),

        cr12: this.createDocument(
            'CR12',
            true,
            'fa-file-alt'
        ),

        boardResolution: this.createDocument(
            'Board Resolution',
            true,
            'fa-landmark'
        ),

        memorandum: this.createDocument(
            'Memorandum & Articles',
            false,
            'fa-file-contract'
        ),

        registrationCertificate: this.createDocument(
            'Registration Certificate',
            true,
            'fa-certificate'
        ),

        trustDeed: this.createDocument(
            'Trust Deed',
            true,
            'fa-balance-scale'
        ),

        institutionResolution: this.createDocument(
            'Institution Resolution',
            true,
            'fa-university'
        )

    };

}



/* ============================================================
   CREATE DOCUMENT
============================================================ */

private createDocument(

    title: string,

    required: boolean,

    icon: string

): UploadedDocument {

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



/* ============================================================
   VALIDATE FILE
============================================================ */

private validateFile(file: File): boolean {

    this.imageError = '';

    if (!file) {

        return false;

    }

    if (file.size > this.MAX_FILE_SIZE) {

        this.imageError =
            'Maximum file size allowed is 10 MB.';

        return false;

    }

    return true;

}



/* ============================================================
   IMAGE PREVIEW
============================================================ */

private createImagePreview(

    file: File,

    callback: (preview: string | ArrayBuffer | null) => void

): void {

    const reader = new FileReader();

    reader.onload = () => {

        callback(reader.result);

    };

    reader.readAsDataURL(file);

}



/* ============================================================
   STORE DOCUMENT
============================================================ */

private setDocument(

    file: File,

    key: string

): void {

    if (!this.validateFile(file)) {

        return;

    }

    const document = this.documents[key];

    if (!document) {

        console.warn('Unknown document key:', key);

        return;

    }

    document.file = file;

    document.name = file.name;

    document.uploaded = true;

    document.size = file.size;

    document.type = file.type;

    if (file.type.startsWith('image/')) {

        this.createImagePreview(

            file,

            preview => {

                document.preview = preview;

            }

        );

    }

    else {

        document.preview = null;

    }

    this.buildMissingItems();

}



/* ============================================================
   FORMAT FILE SIZE
============================================================ */

formatFileSize(bytes: number): string {

    if (!bytes) {

        return '0 Bytes';

    }

    const units = [

        'Bytes',

        'KB',

        'MB',

        'GB'

    ];

    let index = 0;

    let size = bytes;

    while (

        size >= 1024 &&

        index < units.length - 1

    ) {

        size /= 1024;

        index++;

    }

    return `${size.toFixed(2)} ${units[index]}`;

}

/* ============================================================
   GENERIC DOCUMENT UPLOAD
============================================================ */

uploadDocument(event: any, key: string): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.setDocument(file, key);

}



/* ============================================================
   REPLACE DOCUMENT
============================================================ */

replaceDocument(event: any, key: string): void {

    this.uploadDocument(event, key);

}



/* ============================================================
   REMOVE DOCUMENT
============================================================ */

removeDocument(key: string): void {

    const doc = this.documents[key];

    if (!doc) {
        return;
    }

    doc.file = null;
    doc.name = '';
    doc.preview = null;
    doc.uploaded = false;
    doc.size = 0;
    doc.type = '';

    this.buildMissingItems();

}



/* ============================================================
   PREVIEW DOCUMENT
============================================================ */

previewDocument(key: string): void {

    const doc = this.documents[key];

    if (!doc?.file) {
        return;
    }

    const url = URL.createObjectURL(doc.file);

    window.open(url, '_blank');

}



/* ============================================================
   DOWNLOAD DOCUMENT
============================================================ */

downloadDocument(key: string): void {

    const doc = this.documents[key];

    if (!doc?.file) {
        return;
    }

    const url = URL.createObjectURL(doc.file);

    const a = document.createElement('a');

    a.href = url;

    a.download = doc.file.name;

    a.click();

    URL.revokeObjectURL(url);

}



/* ============================================================
   VIEW DOCUMENT (Backward Compatibility)
============================================================ */

viewDocument(file: File): void {

    const url = URL.createObjectURL(file);

    window.open(url, '_blank');

}



/* ============================================================
   REMOVE PROFILE PHOTO
============================================================ */

removeProfilePhoto(): void {

    this.selectedImage = null;

    this.previewUrl = null;

    this.removeDocument('profile');

    this.accountForm.patchValue({

        image: null

    });

}



/* ============================================================
   IMAGE INPUT (PROFILE PHOTO)
============================================================ */

onFileChange(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith('image/')) {

        this.imageError = 'Only image files are allowed.';

        return;

    }

    this.selectedImage = file;

    this.previewUrl = null;

    this.accountForm.patchValue({

        image: file

    });

    this.accountForm.get('image')?.updateValueAndValidity();

    this.setDocument(file, 'profile');

    const reader = new FileReader();

    reader.onload = () => {

        this.previewUrl = reader.result;

    };

    reader.readAsDataURL(file);

}



/* ============================================================
   RESET SINGLE DOCUMENT
============================================================ */

resetDocument(key: string): void {

    this.removeDocument(key);

}



/* ============================================================
   CLEAR ALL DOCUMENTS
============================================================ */

clearAllDocuments(): void {

    Object.keys(this.documents).forEach(key => {

        this.removeDocument(key);

    });

}



/* ============================================================
   DOCUMENT EXISTS
============================================================ */

hasDocument(key: string): boolean {

    return !!this.documents[key]?.uploaded;

}



/* ============================================================
   GET DOCUMENT
============================================================ */

getDocument(key: string): UploadedDocument | null {

    return this.documents[key] ?? null;

}



/* ============================================================
   GET DOCUMENT NAME
============================================================ */

getDocumentName(key: string): string {

    return this.documents[key]?.name ?? '';

}



/* ============================================================
   GET DOCUMENT PREVIEW
============================================================ */

getDocumentPreview(key: string): string | ArrayBuffer | null {

    return this.documents[key]?.preview ?? null;

}



/* ============================================================
   DOCUMENT ICON
============================================================ */

getDocumentIcon(key: string): string {

    return this.documents[key]?.icon || 'fa-file';

}



/* ============================================================
   DOCUMENT TITLE
============================================================ */

getDocumentTitle(key: string): string {

    return this.documents[key]?.title || '';

}



/* ============================================================
   DOCUMENT SIZE
============================================================ */

getDocumentSize(key: string): number {

    return this.documents[key]?.size || 0;

}



/* ============================================================
   DOCUMENT MIME TYPE
============================================================ */

getDocumentType(key: string): string {

    return this.documents[key]?.type || '';

}



/* ============================================================
   DOCUMENT STATUS
============================================================ */

isDocumentUploaded(key: string): boolean {

    return this.documents[key]?.uploaded ?? false;

}

/* ============================================================
   INDIVIDUAL DOCUMENTS
============================================================ */

/**
 * Passport / Profile Photo
 */
onPassportPhotoSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.selectedImage = file;

    this.accountForm.patchValue({
        image: file
    });

    this.accountForm.get('image')?.updateValueAndValidity();

    this.setDocument(file, 'profile');

    const reader = new FileReader();

    reader.onload = () => {

        this.previewUrl = reader.result;

    };

    reader.readAsDataURL(file);

}



/**
 * National ID / Passport
 */
onNationalIdSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.setDocument(file, 'nationalId');

}



/**
 * Backward compatibility
 */
onIdDocumentSelected(event: any): void {

    this.onNationalIdSelected(event);

}



/**
 * KRA PIN Certificate
 */
onKraDocumentSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.setDocument(file, 'kra');

}



/**
 * Signature Specimen
 */
onSignatureSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.setDocument(file, 'signature');

}



/**
 * Proof of Address
 */
onAddressProofSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.setDocument(file, 'address');

}



/**
 * Proof of Income
 */
onIncomeProofSelected(event: any): void {

    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    this.setDocument(file, 'income');

}



/* ============================================================
   REMOVE INDIVIDUAL DOCUMENTS
============================================================ */

removeNationalId(): void {

    this.removeDocument('nationalId');

}



removeKraDocument(): void {

    this.removeDocument('kra');

}



removeSignature(): void {

    this.removeDocument('signature');

}



removeAddressProof(): void {

    this.removeDocument('address');

}



removeIncomeProof(): void {

    this.removeDocument('income');

}



/* ============================================================
   GETTERS
============================================================ */

get passportPhoto(): File | null {

    return this.documents['profile']?.file ?? null;

}



get nationalIdDocument(): File | null {

    return this.documents['nationalId']?.file ?? null;

}



get kraPinDocument(): File | null {

    return this.documents['kra']?.file ?? null;

}



get signatureDocument(): File | null {

    return this.documents['signature']?.file ?? null;

}



get proofOfAddressDocument(): File | null {

    return this.documents['address']?.file ?? null;

}



get incomeProofDocument(): File | null {

    return this.documents['income']?.file ?? null;

}



/* ============================================================
   FILE NAMES
============================================================ */

get passportPhotoName(): string {

    return this.documents['profile']?.name ?? '';

}



get nationalIdDocumentName(): string {

    return this.documents['nationalId']?.name ?? '';

}



get kraPinDocumentName(): string {

    return this.documents['kra']?.name ?? '';

}



get signatureName(): string {

    return this.documents['signature']?.name ?? '';

}



get proofOfAddressName(): string {

    return this.documents['address']?.name ?? '';

}



get incomeProofName(): string {

    return this.documents['income']?.name ?? '';

}



/* ============================================================
   PREVIEWS
============================================================ */

get passportPhotoPreview(): string | ArrayBuffer | null {

    return this.documents['profile']?.preview ?? null;

}



get nationalIdDocumentPreview(): string | ArrayBuffer | null {

    return this.documents['nationalId']?.preview ?? null;

}



get kraPinDocumentPreview(): string | ArrayBuffer | null {

    return this.documents['kra']?.preview ?? null;

}



get signaturePreview(): string | ArrayBuffer | null {

    return this.documents['signature']?.preview ?? null;

}



get proofOfAddressPreview(): string | ArrayBuffer | null {

    return this.documents['address']?.preview ?? null;

}



get incomeProofPreview(): string | ArrayBuffer | null {

    return this.documents['income']?.preview ?? null;

}

// =====================================================
// PRIMARY SIGNATORY
// =====================================================

setPrimarySignatory(index: number): void {

  this.organizationPeople.controls.forEach((person, i) => {

    const isPrimary = i === index;

    person.patchValue({

      primarySignatory: isPrimary,

      isSignatory: isPrimary
        ? true
        : person.get('isSignatory')?.value

    }, { emitEvent: false });

  });

  this.organizationPeople.updateValueAndValidity();

  this.buildMissingItems();

}


// =====================================================
// ENSURE ONE PRIMARY SIGNATORY EXISTS
// =====================================================

private ensurePrimarySignatory(): void {

  const signatories = this.organizationPeople.controls.filter(person =>
      person.get('isSignatory')?.value
  );

  if (signatories.length === 0) {

      this.organizationPeople.controls.forEach(person => {

          person.patchValue({
              primarySignatory: false
          }, { emitEvent: false });

      });

      return;

  }

  const hasPrimary = signatories.some(person =>
      person.get('primarySignatory')?.value
  );

  if (!hasPrimary) {

      this.organizationPeople.controls.forEach(person => {

          person.patchValue({
              primarySignatory: false
          }, { emitEvent: false });

      });

      signatories[0].patchValue({

          primarySignatory: true

      }, { emitEvent: false });

  }

}



// =====================================================
// BUILD MISSING ITEMS
// =====================================================

// =====================================================
// BUILD MISSING ITEMS (STEP AWARE)
// =====================================================

buildMissingItems(): void {

    this.missingItems = [];

    //----------------------------------------------------
    // STEP 1
    //----------------------------------------------------
    if (this.currentStep === 1) {

        if (this.isIndividual) {

            [
                'modeOfOperation',
                'fullName',
                'nationalId',
                'dateOfBirth',
                'gender'
            ].forEach(field => {

                if (this.accountForm.get(field)?.invalid) {
                    this.missingItems.push(this.formatFieldName(field));
                }

            });

        } else {

            if (this.accountForm.get('modeOfOperation')?.invalid) {
                this.missingItems.push('Mode of Operation');
            }

        }

    }

    //----------------------------------------------------
    // STEP 2
    //----------------------------------------------------
    else if (this.currentStep === 2) {

        if (this.isIndividual) {

            [
                'phoneNumber',
                'email',
                'residentialAddress',
                'county',
                'city'
            ].forEach(field => {

                if (this.accountForm.get(field)?.invalid) {
                    this.missingItems.push(this.formatFieldName(field));
                }

            });

        } else {

            if (this.organizationPeople.length === 0) {

                this.missingItems.push('Add at least one Official');

            } else {

                this.organizationPeople.controls.forEach((person, index) => {

                    if (person.get('fullName')?.invalid) {
                        this.missingItems.push(`Official ${index + 1}: Full Name`);
                    }

                    if (person.get('nationalId')?.invalid) {
                        this.missingItems.push(`Official ${index + 1}: National ID`);
                    }

                    if (person.get('designation')?.invalid) {
                        this.missingItems.push(`Official ${index + 1}: Designation`);
                    }

                });

            }

        }

    }

    //----------------------------------------------------
    // STEP 3 (SIGNATORIES)
    //----------------------------------------------------
    else if (this.currentStep === 3 && !this.isIndividual) {

        if (this.totalSignatories === 0) {

            this.missingItems.push('Select at least one Signatory');

        }

        const hasPrimary = this.organizationPeople.controls.some(person =>
            person.get('isSignatory')?.value &&
            person.get('primarySignatory')?.value
        );

        if (this.totalSignatories > 0 && !hasPrimary) {

            this.missingItems.push('Select Primary Signatory');

        }

        const mode = this.accountForm.get('modeOfOperation')?.value;

        switch (mode) {

            case ModeOfOperation.SINGLY:
            case ModeOfOperation.ANY_ONE:

                if (this.totalSignatories !== 1) {
                    this.missingItems.push('Exactly ONE signatory required.');
                }

                break;

            case ModeOfOperation.ANY_TWO:

                if (this.totalSignatories < 2) {
                    this.missingItems.push('Any TWO requires at least two signatories.');
                }

                break;

            case ModeOfOperation.ANY_THREE:

                if (this.totalSignatories < 3) {
                    this.missingItems.push('Any THREE requires at least three signatories.');
                }

                break;

            case ModeOfOperation.TTS:

                if (this.totalSignatories !== 2) {
                    this.missingItems.push('TTS requires exactly two signatories.');
                }

                break;

            case ModeOfOperation.ALL:

                if (this.totalSignatories !== this.organizationPeople.length) {
                    this.missingItems.push('Every official must be a signatory.');
                }

                break;
        }

    }

    //----------------------------------------------------
    // STEP 4 (DOCUMENTS)
    //----------------------------------------------------
    else if (
        (this.isIndividual && this.currentStep === 5) ||
        (!this.isIndividual && this.currentStep === 4)
    ) {

        if (!this.documents['profile']?.uploaded) {
            this.missingItems.push('Profile Picture');
        }

        if (!this.documents['signature']?.uploaded) {
            this.missingItems.push('Signature');
        }

        if (!this.documents['kra']?.uploaded) {
            this.missingItems.push('KRA PIN Certificate');
        }

        if (this.isIndividual) {

            if (!this.documents['nationalId']?.uploaded) {
                this.missingItems.push('National ID Copy');
            }

        }

        if (this.isGroup) {

            if (!this.documents['groupCertificate']?.uploaded) {
                this.missingItems.push('Group Certificate');
            }

            if (!this.documents['constitution']?.uploaded) {
                this.missingItems.push('Group Constitution');
            }

            if (!this.documents['meetingResolution']?.uploaded) {
                this.missingItems.push('Meeting Resolution');
            }

        }

        if (this.isCompany) {

            if (!this.documents['incorporation']?.uploaded) {
                this.missingItems.push('Certificate of Incorporation');
            }

            if (!this.documents['cr12']?.uploaded) {
                this.missingItems.push('CR12');
            }

            if (!this.documents['boardResolution']?.uploaded) {
                this.missingItems.push('Board Resolution');
            }

        }

        if (this.isInstitution) {

            if (!this.documents['registrationCertificate']?.uploaded) {
                this.missingItems.push('Registration Certificate');
            }

            if (!this.documents['trustDeed']?.uploaded) {
                this.missingItems.push('Trust Deed');
            }

            if (!this.documents['institutionResolution']?.uploaded) {
                this.missingItems.push('Institution Resolution');
            }

        }

    }

    //----------------------------------------------------
    // Remove duplicates
    //----------------------------------------------------

    this.missingItems = [...new Set(this.missingItems)];

}

// =====================================================
// NEXT STEP
// =====================================================

nextStep(): void {

    // =========================================================
    // STEP 0 → FIRST REGISTRATION STEP
    // =========================================================

    if (this.currentStep === 0) {

        const category =
            this.accountForm.get('customerCategory')?.value;

        if (!category) {
            return;
        }

        // Safety: make sure the category was selected
        this.selectedCustomerCategory = category;

        // Now, and ONLY now, move forward
        this.currentStep = 1;

        return;
    }

    // =========================================================
    // NORMAL WIZARD NAVIGATION
    // =========================================================

    if (this.currentStep < this.stepTitles.length - 1) {
        this.currentStep++;
    }
}



// =====================================================
// PREVIOUS STEP
// =====================================================

previousStep(): void {

    this.errorMessage = '';

    if (this.currentStep > 0) {

        this.currentStep--;

    }

}



// =====================================================
// STEP VALIDATION
// =====================================================

private isStepValid(step: number): boolean {

    switch (step) {

        //------------------------------------------------
        // STEP 1
        //------------------------------------------------

        case 1:

            if (this.isIndividual) {

                return [

                    'modeOfOperation',

                    'fullName',

                    'nationalId',

                    'dateOfBirth',

                    'gender'

                ].every(field =>

                    this.accountForm.get(field)?.valid

                );

            }

            return this.accountForm.get('modeOfOperation')?.valid ?? false;



        //------------------------------------------------
        // STEP 2
        //------------------------------------------------

        case 2:

            if (this.isIndividual) {

                return [

                    'phoneNumber',

                    'email',

                    'residentialAddress',

                    'county',

                    'city'

                ].every(field =>

                    this.accountForm.get(field)?.valid

                );

            }

            return (

                this.organizationPeople.length > 0 &&

                this.organizationPeople.controls.every(person =>

                    person.valid

                )

            );



        //------------------------------------------------
        // STEP 3
        //------------------------------------------------

        case 3:

            if (this.isIndividual) {

                return [

                    'employmentStatus',

                    'monthlyIncome',

                    'sourceOfFunds',

                    'accountType'

                ].every(field =>

                    this.accountForm.get(field)?.valid

                );

            }

            return this.totalSignatories > 0;



        //------------------------------------------------
        // STEP 4
        //------------------------------------------------

        case 4:

            if (this.isIndividual) {

                return [

                    'nextOfKinName',

                    'nextOfKinPhone',

                    'nextOfKinRelationship'

                ].every(field =>

                    this.accountForm.get(field)?.valid

                );

            }

            return this.allRequiredDocumentsUploaded;



        //------------------------------------------------
        // STEP 5
        //------------------------------------------------

        case 5:

            if (this.isIndividual) {

                return (

                    this.passportPhoto != null &&

                    this.nationalIdDocument != null &&

                    this.signatureDocument != null &&

                    this.kraPinDocument != null

                );

            }

            return this.missingItems.length === 0;



        //------------------------------------------------
        // STEP 6
        //------------------------------------------------

        case 6:

            return this.accountForm.get('declaration')?.valid ?? false;

    }

    return true;

}



// =====================================================
// CAN GO NEXT
// =====================================================

get canProceed(): boolean {

    return this.isStepValid(this.currentStep);

}



// =====================================================
// CAN SUBMIT
// =====================================================

get canSubmit(): boolean {

    this.buildMissingItems();

    return (

        this.accountForm.valid &&

        this.missingItems.length === 0 &&

        this.allRequiredDocumentsUploaded

    );

}



// =====================================================
// REVIEW STATUS
// =====================================================

get reviewReady(): boolean {

    return this.canSubmit;

}

// =====================================================
// ENTERPRISE SUBMIT
// =====================================================

onSubmit(): void {

    this.errorMessage = '';
    this.successMessage = '';

    this.accountForm.markAllAsTouched();

    this.buildMissingItems();

    //-----------------------------------------------------
    // FORM VALIDATION
    //-----------------------------------------------------

    if (!this.canSubmit) {

        this.errorMessage =
            'Please complete all required information before submitting.';

        return;

    }

    //-----------------------------------------------------
    // CREATE MULTIPART REQUEST
    //-----------------------------------------------------

    const formData = new FormData();

    //-----------------------------------------------------
    // NORMAL FORM VALUES
    //-----------------------------------------------------

 Object.keys(this.accountForm.controls).forEach(key => {

  if (
    key === 'organizationPeople' ||
    key === 'directors' ||
    key === 'officials' ||
    key === 'signatories' ||
    key === 'beneficialOwners'
  ) {
    return;
  }

  let value = this.accountForm.get(key)?.value;

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return;
  }

  // ---------------------------------------------
  // DATE
  // ---------------------------------------------
  if (key === 'dateOfBirth') {

    value = new Date(value)
      .toISOString()
      .substring(0, 10);

  }

  // ---------------------------------------------
  // MODE OF OPERATION
  // ---------------------------------------------
  if (key === 'modeOfOperation') {

    // Safety conversion for old "SINGLE" values
    if (value === 'SINGLE') {
      value = ModeOfOperation.SINGLY;
    }

    // Make absolutely sure the value is valid
    const validModes = Object.values(ModeOfOperation);

    if (!validModes.includes(value as ModeOfOperation)) {

      console.error(
        'Invalid Mode Of Operation:',
        value
      );

      return;
    }
  }

  formData.append(
    key,
    String(value)
  );

});


    //-----------------------------------------------------
    // ORGANIZATION PEOPLE
    //-----------------------------------------------------

    formData.append(

        'organizationPeople',

        JSON.stringify(
            this.organizationPeople.value
        )

    );



    //-----------------------------------------------------
    // PROFILE PHOTO
    //-----------------------------------------------------

    if (this.passportPhoto) {

        formData.append(

            'passportPhoto',

            this.passportPhoto,

            this.passportPhoto.name

        );

    }



    //-----------------------------------------------------
    // INDIVIDUAL
    //-----------------------------------------------------

    if (this.nationalIdDocument) {

        formData.append(

            'nationalIdDocument',

            this.nationalIdDocument,

            this.nationalIdDocument.name

        );

    }

    if (this.kraPinDocument) {

        formData.append(

            'kraPinDocument',

            this.kraPinDocument,

            this.kraPinDocument.name

        );

    }

    if (this.signatureDocument) {

        formData.append(

            'signatureDocument',

            this.signatureDocument,

            this.signatureDocument.name

        );

    }

    if (this.proofOfAddressDocument) {

        formData.append(

            'proofOfAddressDocument',

            this.proofOfAddressDocument,

            this.proofOfAddressDocument.name

        );

    }

    if (this.incomeProofDocument) {

        formData.append(

            'incomeProofDocument',

            this.incomeProofDocument,

            this.incomeProofDocument.name

        );

    }



    //-----------------------------------------------------
    // GROUP
    //-----------------------------------------------------

    if (this.groupCertificate) {

        formData.append(

            'groupCertificate',

            this.groupCertificate,

            this.groupCertificate.name

        );

    }

    if (this.groupConstitution) {

        formData.append(

            'groupConstitution',

            this.groupConstitution,

            this.groupConstitution.name

        );

    }

    if (this.meetingResolution) {

        formData.append(

            'meetingResolution',

            this.meetingResolution,

            this.meetingResolution.name

        );

    }

if (this.officials.length > 0) {

    formData.append(
        'officials',
        JSON.stringify(this.officials.value)
    );

}



    //-----------------------------------------------------
    // COMPANY
    //-----------------------------------------------------

    if (this.certificateOfIncorporation) {

        formData.append(

            'certificateOfIncorporation',

            this.certificateOfIncorporation,

            this.certificateOfIncorporation.name

        );

    }

    if (this.cr12Document) {

        formData.append(

            'cr12Document',

            this.cr12Document,

            this.cr12Document.name

        );

    }

    if (this.boardResolutionDocument) {

        formData.append(

            'boardResolutionDocument',

            this.boardResolutionDocument,

            this.boardResolutionDocument.name

        );

    }

    if (this.memorandumDocument) {

        formData.append(

            'memorandumDocument',

            this.memorandumDocument,

            this.memorandumDocument.name

        );

    }

    if (this.businessPermit) {

        formData.append(

            'businessPermit',

            this.businessPermit,

            this.businessPermit.name

        );

    }

    if (this.taxCompliance) {

        formData.append(

            'taxCompliance',

            this.taxCompliance,

            this.taxCompliance.name

        );

    }



    //-----------------------------------------------------
    // INSTITUTION
    //-----------------------------------------------------

    if (this.registrationCertificate) {

        formData.append(

            'registrationCertificate',

            this.registrationCertificate,

            this.registrationCertificate.name

        );

    }

    if (this.trustDeed) {

        formData.append(

            'trustDeed',

            this.trustDeed,

            this.trustDeed.name

        );

    }

    if (this.institutionResolution) {

        formData.append(

            'institutionResolution',

            this.institutionResolution,

            this.institutionResolution.name

        );

    }

    if (this.charterDocument) {

        formData.append(

            'charterDocument',

            this.charterDocument,

            this.charterDocument.name

        );

    }

    if (this.operatingLicence) {

        formData.append(

            'operatingLicence',

            this.operatingLicence,

            this.operatingLicence.name

        );

    }



    //-----------------------------------------------------
    // SUPPORTING DOCUMENTS
    //-----------------------------------------------------

    this.supportingDocuments.forEach(file => {

        formData.append(

            'supportingDocuments',

            file,

            file.name

        );

    });



    //-----------------------------------------------------
    // SAVE
    //-----------------------------------------------------

    this.loading = true;

    this.accountService.createAccount(formData)

        .subscribe({

            next: (response: any) => {

                this.loading = false;

                this.successMessage =
                    response.message ??
                    'Account created successfully.';

                this.resetForm();

                setTimeout(() => {

                    this.router.navigate([
                        '/app/accounts'
                    ]);

                }, 3000);

            },

            error: (error) => {

                this.loading = false;

                this.errorMessage =
                    error?.error?.message ??
                    'Unable to create account.';

            }

        });

}


checkEmail(): void {

  const email = this.accountForm.get('email')?.value;

  if (!email) {
    return;
  }

  // TODO:
  // Later call backend
  // this.accountService.checkEmail(email)

}

removeOrganizationPerson(index: number): void {

    this.organizationPeople.removeAt(index);

    this.ensurePrimarySignatory();

    this.buildMissingItems();

}

get addressProofName(): string {

    return this.documents['address']?.name ?? '';

}

get addressProofPreview(): string | ArrayBuffer | null {

    return this.documents['address']?.preview ?? null;

}

}