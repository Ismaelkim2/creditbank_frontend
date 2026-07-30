import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountService } from '../services/account.service';
import { Router } from '@angular/router';
import { AbstractControl,ValidationErrors,ValidatorFn} from '@angular/forms';
import { County, Town } from '../../models/account.model';
import { KenyaLocationsService } from '../services/services/kenya-locations.service';


@Component({
  selector: 'app-account-registration',
  templateUrl: './account-registration.component.html',
  styleUrls: ['./account-registration.component.css']
})
export class AccountRegistrationComponent implements OnInit  {

counties: County[] = [];
towns: Town[] = [];

  accountForm: FormGroup;
  selectedImage: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
totalSteps = 6;
accountLoaded = false;
  existingAccount: any = null;
  isDuplicate: boolean = false;

  idMaxLength = 8;

idPlaceholder = 'Enter 8-digit National ID';

  // UI Notifications
  successMessage: string = '';
  errorMessage: string = '';
  imageError: string = '';
  loading: boolean = false;


 constructor(
  private fb: FormBuilder,
  private accountService: AccountService,
   private kenyaLocationsService: KenyaLocationsService,
  private router: Router
) {

  this.accountForm = this.fb.group({

    modeOfOperation: ['', Validators.required],

    fullName: ['', Validators.required],

   
  idType: ['NATIONAL_ID', Validators.required],

  nationalId: [
    '',
    [
      Validators.required,
      Validators.pattern(/^\d+$/)
    ]
  ],

    dateOfBirth: [
      '',
      [
        Validators.required,
        this.minimumAgeValidator(18)
      ]
    ],

    gender: ['', Validators.required],

    phoneNumber: [
      '',
      [
        Validators.required,
        Validators.pattern(/^(?:2547\d{8}|07\d{8})$/)
      ]
    ],

    email: [
      '',
      [
        Validators.required,
        Validators.email
      ]
    ],

    residentialAddress: ['', Validators.required],
    city: ['', Validators.required],
    county: ['', Validators.required],

    employmentStatus: ['', Validators.required],
    employerName: [''],
    businessType: [''],
    businessLocation: [''],
   

    monthlyIncome: [
      null,
      Validators.required
    ],

    sourceOfFunds: ['', Validators.required],

    accountType: ['', Validators.required],

    nextOfKinName: ['', Validators.required],

    nextOfKinPhone: [
      '',
      [
        Validators.required,
        Validators.pattern(/^(?:2547\d{8}|07\d{8})$/)
      ]
    ],

    nextOfKinRelationship: ['', Validators.required],

    declaration: [
      false,
      Validators.requiredTrue
    ],

    image: [
      null,
      Validators.required
    ]

  }, {
    validators: this.nextOfKinPhoneValidator()
  });

}

ngOnInit(): void {

  this.counties = this.kenyaLocationsService.counties;

  if (this.counties.length) {

    this.accountForm.patchValue({
      county: this.counties[0].id
    });

    this.onCountyChange();

  }

}

  /** Handle file selection & preview */
  onFileChange(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.imageError = 'Only image files are allowed.';
      this.accountForm.get('image')?.setErrors({ invalid: true });
      return;
    }

    this.selectedImage = file;
    this.imageError = '';

    this.accountForm.get('image')?.setValue(file);
    this.accountForm.get('image')?.updateValueAndValidity();

    const reader = new FileReader();
    reader.onload = () => this.previewUrl = reader.result;
    reader.readAsDataURL(file);
  }

onIdTypeChange() {

  const type = this.accountForm.get('idType')?.value;

  const control = this.accountForm.get('nationalId');

  if (type === 'NATIONAL_ID') {

    this.idMaxLength = 8;

    this.idPlaceholder = 'Enter 8-digit National ID';

    control?.setValidators([
      Validators.required,
      Validators.pattern(/^\d{8}$/)
    ]);

  } else {

    this.idMaxLength = 9;

    this.idPlaceholder = 'Enter 9-digit Maisha Card Number';

    control?.setValidators([
      Validators.required,
      Validators.pattern(/^\d{9}$/)
    ]);

  }

  control?.reset();

  control?.updateValueAndValidity();

}


allowNumbersOnly(event: any): void {

  const value = event.target.value.replace(/\D/g, '');

  event.target.value = value;

  this.accountForm.get('nationalId')?.setValue(value);

}

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

  resetFormKeepUI() {
  this.accountForm.reset();
  this.selectedImage = null;
  this.previewUrl = null;
  this.isDuplicate = false;
  this.imageError = '';
  this.errorMessage = '';
}

private minimumAgeValidator(minAge: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {

    if (!control.value) {
      return null;
    }

    const dob = new Date(control.value);
    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();

    const monthDiff = today.getMonth() - dob.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dob.getDate())
    ) {
      age--;
    }

    return age >= minAge
      ? null
      : { underAge: true };
  };
}

private nextOfKinPhoneValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {

    const phone =
      group.get('phoneNumber')?.value;

    const kinPhone =
      group.get('nextOfKinPhone')?.value;

    if (
      phone &&
      kinPhone &&
      phone.trim() === kinPhone.trim()
    ) {
      return { samePhone: true };
    }

    return null;
  };
}


  onSubmit() {

const dobControl = this.accountForm.get('dateOfBirth');

if (dobControl?.hasError('underAge')) {
  this.errorMessage =
    'Applicant must be 18 years and above.';
  return;
}

if (this.accountForm.errors?.['samePhone']) {
  this.errorMessage =
    'Next of Kin phone number cannot be the same as applicant phone number.';
  return;
}


    this.successMessage = '';
    this.errorMessage = '';
    this.imageError = '';

    if (!this.selectedImage) {
      this.imageError = 'Profile picture is required.';
      return;
    }

    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      this.errorMessage = 'Please fill all required fields correctly.';
      return;
    }

    const formData = new FormData();
   Object.keys(this.accountForm.value).forEach(key => {
  let value = this.accountForm.value[key];

  if (key === 'dateOfBirth' && value) {
    value = new Date(value).toISOString().split('T')[0];
  }

  if (value !== null && value !== '') {
    formData.append(key, value.toString());
  }
});

    if (this.selectedImage) {
      formData.append('image', this.selectedImage);
    }

    // Trim National ID to prevent backend 404
    const nationalIdControl = this.accountForm.get('nationalId');
    if (nationalIdControl) {
      formData.set('nationalId', nationalIdControl.value.trim());
    }

    this.loading = true;

    this.accountService.createAccount(formData).subscribe({
      next: (res: any) => {
        this.loading = false;

       if (res?.status === 'success') {

  this.loading = false;

  // 1. Set success message FIRST
  this.successMessage = res.message || 'Account created successfully! 🎉';

  // 2. DO NOT reset form immediately
  this.resetFormKeepUI();

  // 3. Wait 5 seconds then navigate
  setTimeout(() => {

    this.successMessage = '';

    this.router.navigate(['/app/accounts']);

  }, 8000);
} else {
          this.errorMessage = res?.message || 'Account creation returned unexpected response.';
        }
      },
      error: (err) => {
        this.loading = false;

        if (err.status === 409) {
          this.errorMessage = err.error?.message || 'An account with this National ID already exists.';
        } else if (err.status === 400) {
          this.errorMessage = err.error?.message || 'Invalid data provided. Please check your input.';
        } else {
          this.errorMessage = 'Failed to create account. Please try again.';
        }
      }
    });
  }

  /** Check National ID uniqueness on blur */
checkNationalId() {
  const id = this.accountForm.get('nationalId')?.value?.trim();
  if (!id) return;

  this.accountService.getByNationalId(id).subscribe({
    next: () => {
      this.accountForm.get('nationalId')?.setErrors({ duplicate: true });
    },
    error: (err) => {
      if (err.status === 404) {
        const control = this.accountForm.get('nationalId');
        if (control?.hasError('duplicate')) {
          const errors = { ...control.errors };
          delete errors['duplicate'];
          control.setErrors(Object.keys(errors).length ? errors : null);
        }
      }
    }
  });
}

checkPhoneNumber() {
  const phone = this.accountForm.get('phoneNumber')?.value?.trim();
  if (!phone) return;

  this.accountService.getByPhoneNumber(phone).subscribe({
    next: () => {
      this.accountForm.get('phoneNumber')?.setErrors({ duplicate: true });
    },
    error: (err) => {
      if (err.status === 404) {
        const control = this.accountForm.get('phoneNumber');
        if (control?.hasError('duplicate')) {
          const errors = { ...control.errors };
          delete errors['duplicate'];
          control.setErrors(Object.keys(errors).length ? errors : null);
        }
      }
    }
  });
}

checkEmail() {
  const email = this.accountForm.get('email')?.value?.trim();
  if (!email) return;

  this.accountService.getByEmail(email).subscribe({
    next: () => {
      this.accountForm.get('email')?.setErrors({ duplicate: true });
    },
    error: (err) => {
      if (err.status === 404) {
        const control = this.accountForm.get('email');
        if (control?.hasError('duplicate')) {
          const errors = { ...control.errors };
          delete errors['duplicate'];
          control.setErrors(Object.keys(errors).length ? errors : null);
        }
      }
    }
  });
}

currentStep = 1;

nextStep() {

  this.accountForm.markAllAsTouched();
  this.errorMessage = '';

  // Duplicate checks
  if (this.hasDuplicateErrors()) {
    this.errorMessage =
      'User with this information already exists. Please check National ID, Phone Number or Email.';
    return;
  }

  // AGE VALIDATION
  if (
    this.currentStep === 1 &&
    this.accountForm.get('dateOfBirth')?.hasError('underAge')
  ) {
    this.errorMessage =
      'Applicant must be 18 years or older.';
    return;
  }

  // PHONE FORMAT VALIDATION
  if (
    this.currentStep === 2 &&
    this.accountForm.get('phoneNumber')?.hasError('pattern')
  ) {
    this.errorMessage =
      'Phone number must start with 07 (10 digits) or 254 (12 digits).';
    return;
  }

  // NEXT OF KIN PHONE FORMAT
  if (
    this.currentStep === 4 &&
    this.accountForm.get('nextOfKinPhone')?.hasError('pattern')
  ) {
    this.errorMessage =
      'Next of Kin phone number must start with 07 (10 digits) or 254 (12 digits).';
    return;
  }

  // SAME PHONE VALIDATION
  if (
    this.currentStep === 4 &&
    this.accountForm.errors?.['samePhone']
  ) {
    this.errorMessage =
      'Next of Kin phone number cannot be the same as the applicant phone number.';
    return;
  }

  // REQUIRED FIELD VALIDATION
  if (!this.isStepValid(this.currentStep)) {

    const controlsPerStep: any = {
      1: [ 'modeOfOperation','fullName', 'nationalId', 'dateOfBirth', 'gender'],
      2: ['phoneNumber', 'email', 'residentialAddress', 'city', 'county'],
      3: ['employmentStatus', 'monthlyIncome', 'sourceOfFunds', 'accountType',  'modeOfOperation'],
      4: ['nextOfKinName', 'nextOfKinPhone', 'nextOfKinRelationship'],
      5: ['image'],
      6: ['declaration']
    };

    const controls = controlsPerStep[this.currentStep];

    const firstInvalid = controls.find(
      (name: string) => this.accountForm.get(name)?.invalid
    );

    if (firstInvalid) {
      this.errorMessage =
        `${this.formatFieldName(firstInvalid)} is required.`;
    } else {
      this.errorMessage =
        'Please complete all required fields before continuing.';
    }

    return;
  }

  if (this.currentStep < 6) {
    this.currentStep++;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}

previousStep() {
  if (this.currentStep > 1) {
    this.currentStep--;
  }
}

private formatFieldName(field: string): string {

  const labels: any = {
    fullName: 'Full Name',
    nationalId: 'National ID',
    dateOfBirth: 'Date of Birth',
    gender: 'Gender',
    phoneNumber: 'Phone Number',
    email: 'Email Address',
    residentialAddress: 'Residential Address',
    city: 'City',
    county: 'County',
    employmentStatus: 'Employment Status',
    modeOfOperation: 'Mode Of Operation',
    monthlyIncome: 'Monthly Income',
    sourceOfFunds: 'Source Of Funds',
    accountType: 'Account Type',
    nextOfKinName: 'Next Of Kin Name',
    nextOfKinPhone: 'Next Of Kin Phone',
    nextOfKinRelationship: 'Relationship',
    image: 'Profile Picture',
    declaration: 'Declaration'
  };

  return labels[field] || field;
}


hasDuplicateErrors(): boolean {
  const controls = ['nationalId', 'phoneNumber', 'email'];

  return controls.some(controlName =>
    this.accountForm.get(controlName)?.errors?.['duplicate']
  );
}

private isStepValid(step: number): boolean {

  const controlsPerStep: any = {
    1: ['fullName', 'nationalId', 'dateOfBirth', 'gender', 'modeOfOperation',],
    2: ['phoneNumber', 'email', 'residentialAddress', 'city', 'county'],
    3: ['employmentStatus', 'monthlyIncome', 'sourceOfFunds', 'accountType'],
    4: ['nextOfKinName', 'nextOfKinPhone', 'nextOfKinRelationship'],
    5: ['image'],
    6: ['declaration']
  };

  const controls = controlsPerStep[step];

  return controls.every((name: string) =>
    this.accountForm.get(name)?.valid
  );
}

  /** Fallback for broken images */
  onImageError(event: any) {
    event.target.src = 'assets/default-user.png';
  }

  /** Reset form after submission */
  resetForm() {
    this.accountForm.reset();
    this.selectedImage = null;
    this.previewUrl = null;
    this.isDuplicate = false;
    this.errorMessage = '';
    this.imageError = '';
    this.successMessage = '';
  }
}