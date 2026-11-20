
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  IdentificationType,
  TenantResidentRequest,
  TenantResidentResponse,
  TenantResidentService
} from '../services/tenant-resident-request.service';

import { environment } from '../../environments/environment';

@Component({
  selector: 'app-tenant-registration',
  templateUrl: './tenant-registration.component.html',
  styleUrls: ['./tenant-registration.component.css']
})
export class TenantRegistrationComponent implements OnInit, OnDestroy {

  tenantForm!: FormGroup;

  readonly identificationTypes: {
    value: IdentificationType;
    label: string;
  }[] = [
    { value: 'NATIONAL_ID', label: 'National ID' },
    { value: 'PASSPORT', label: 'Passport' }
  ];

  isSubmitting = false;
  isLoadingTenant = false;
  submitted = false;

  isEditMode = false;
  editingTenantId: number | null = null;

  successMessage = '';
  errorMessage = '';

  registeredTenant: TenantResidentResponse | null = null;

  // Tenant photograph
  selectedTenantImage: File | null = null;
  tenantImagePreviewUrl: string | null = null;
  tenantImageError = '';

  // Existing photograph URL from the backend
  private existingTenantImageUrl: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly tenantService: TenantResidentService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.buildForm();

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {

        const rawId = params.get('editId');
        const tenantId = Number(rawId);

        if (
          rawId &&
          Number.isInteger(tenantId) &&
          tenantId > 0
        ) {
          if (
            this.editingTenantId !== tenantId ||
            !this.isEditMode
          ) {
            this.loadTenantForEditing(tenantId);
          }
        } else {
          this.enterCreateMode();
        }
      });
  }

 
private buildForm(): void {
  this.tenantForm = this.fb.group({
    fullName: [
      '',
      [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(120),
        Validators.pattern(/^[\p{L}]+(?:[ '\-’][\p{L}]+)+$/u)
      ]
    ],

    identificationType: [
      'NATIONAL_ID',
      Validators.required
    ],

    identificationNumber: [
      '',
      [
        Validators.required
      ]
    ],

    phoneNumber: [
      '',
      [
        Validators.required,
        Validators.maxLength(25),
        Validators.pattern(
          /^(?:0[17][0-9]{2}[ -]?[0-9]{3}[ -]?[0-9]{3}|\+254[17][0-9]{2}[ -]?[0-9]{3}[ -]?[0-9]{3})$/
        )
      ]
    ],

    email: [
      '',
      [
        Validators.email,
        Validators.maxLength(254)
      ]
    ],

    address: [
      '',
      [
        Validators.maxLength(250)
      ]
    ],

    emergencyContactName: [
      '',
      [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(120),
        Validators.pattern(/^[\p{L}]+(?:[ '\-’][\p{L}]+)+$/u)
      ]
    ],

    emergencyContactPhone: [
      '',
      [
        Validators.required,
        Validators.maxLength(25),
        Validators.pattern(
          /^(?:0[17][0-9]{2}[ -]?[0-9]{3}[ -]?[0-9]{3}|\+254[17][0-9]{2}[ -]?[0-9]{3}[ -]?[0-9]{3})$/
        )
      ]
    ],

    notes: [
      '',
      [
        Validators.maxLength(2000)
      ]
    ]
  });

  this.applyIdentificationNumberValidators();

  this.tenantForm.get('identificationType')!
    .valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.applyIdentificationNumberValidators();
    });
}



private applyIdentificationNumberValidators(): void {
  const typeControl = this.tenantForm.get('identificationType');
  const numberControl = this.tenantForm.get('identificationNumber');

  if (!typeControl || !numberControl) {
    return;
  }

  const identificationType = typeControl.value as IdentificationType;

  if (identificationType === 'NATIONAL_ID') {
    numberControl.setValidators([
      Validators.required,
      Validators.pattern(/^[0-9]{8,9}$/)
    ]);
  } else if (identificationType === 'PASSPORT') {
    numberControl.setValidators([
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(40),
      Validators.pattern(/^[A-Za-z0-9-]+$/)
    ]);
  } else {
    numberControl.setValidators([
      Validators.required
    ]);
  }

  numberControl.updateValueAndValidity({
    emitEvent: false
  });
}




private normalizeKenyanPhone(value: unknown): string {
  const phone = String(value ?? '')
    .trim()
    .replace(/[\s-]/g, '');

  if (phone.startsWith('+254')) {
    return phone;
  }

  if (/^0[17][0-9]{8}$/.test(phone)) {
    return '+254' + phone.substring(1);
  }

  return phone;
}

private normalizeFullName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

private normalizeIdentificationNumber(
  value: unknown,
  type: IdentificationType
): string {
  const identificationNumber = String(value ?? '').trim();

  return type === 'PASSPORT'
    ? identificationNumber.toUpperCase()
    : identificationNumber;
}



  get f(): { [key: string]: AbstractControl } {
    return this.tenantForm.controls;
  }

  // ---------------------------------------------------------
  // EDIT MODE
  // ---------------------------------------------------------

  private loadTenantForEditing(id: number): void {

    this.isLoadingTenant = true;
    this.isEditMode = true;
    this.editingTenantId = id;

    this.errorMessage = '';
    this.successMessage = '';
    this.registeredTenant = null;

    this.clearSelectedTenantImage();

    this.tenantService.getTenant(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingTenant = false)
      )
      .subscribe({

        next: tenant => {

          // Prevent displaying an unexpected record.
          if (Number(tenant.id) !== id) {
            this.errorMessage =
              'The server returned a different tenant record.';
            return;
          }

          this.populateTenantForm(tenant);

          this.registeredTenant = tenant;
        },

        error: error => {

          this.errorMessage =
            error.message || 'Unable to load tenant details for editing.';
        }

      });
  }

  private populateTenantForm(
    tenant: TenantResidentResponse
  ): void {

    this.tenantForm.patchValue({

      fullName: tenant.fullName ?? '',

      identificationType:
        tenant.identificationType ?? 'NATIONAL_ID',

      identificationNumber:
        tenant.identificationNumber ?? '',

      phoneNumber: tenant.phoneNumber ?? '',

      email: tenant.email ?? '',

      address: tenant.address ?? '',

      emergencyContactName:
        tenant.emergencyContactName ?? '',

      emergencyContactPhone:
        tenant.emergencyContactPhone ?? '',

      notes: tenant.notes ?? ''

    });

    this.applyIdentificationNumberValidators();
this.tenantForm.updateValueAndValidity();

    this.existingTenantImageUrl = tenant.imageUrl ?? null;

    this.tenantImagePreviewUrl = this.existingTenantImageUrl
      ? this.resolveImageUrl(this.existingTenantImageUrl)
      : null;

    this.selectedTenantImage = null;
    this.tenantImageError = '';

    this.submitted = false;

    this.tenantForm.markAsPristine();
    this.tenantForm.markAsUntouched();
  }

  private enterCreateMode(): void {

    if (
      !this.isEditMode &&
      this.editingTenantId === null
    ) {
      return;
    }

    this.isEditMode = false;
    this.editingTenantId = null;

    this.existingTenantImageUrl = null;

    this.clearSelectedTenantImage();

    this.tenantForm?.reset(this.emptyFormValue());

    this.submitted = false;

    this.successMessage = '';
    this.errorMessage = '';
    this.tenantImageError = '';

    this.registeredTenant = null;
  }

 
private emptyFormValue(): Record<string, string> {
  return {
    fullName: '',
    identificationType: 'NATIONAL_ID',
    identificationNumber: '',
    phoneNumber: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: ''
  };
}


  // ---------------------------------------------------------
  // PHOTOGRAPH HANDLING
  // ---------------------------------------------------------

  onTenantImageSelected(event: Event): void {

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.tenantImageError = '';

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {

      this.tenantImageError =
        'Unsupported image format. Select JPG, PNG or WEBP.';

      input.value = '';
      return;
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {

      this.tenantImageError =
        'The photograph must not exceed 5 MB.';

      input.value = '';
      return;
    }

    this.clearSelectedTenantImage();

    this.selectedTenantImage = file;

    this.tenantImagePreviewUrl = URL.createObjectURL(file);
  }

  /**
   * Removes a newly selected replacement photograph.
   *
   * If editing an existing tenant, the original backend
   * photograph is restored and retained.
   */
  removeTenantImage(input?: HTMLInputElement): void {

    this.clearSelectedTenantImage();

    this.tenantImageError = '';

    this.tenantImagePreviewUrl = this.existingTenantImageUrl
      ? this.resolveImageUrl(this.existingTenantImageUrl)
      : null;

    if (input) {
      input.value = '';
    }
  }

  private clearSelectedTenantImage(): void {

    if (this.tenantImagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.tenantImagePreviewUrl);
    }

    this.selectedTenantImage = null;

    if (this.existingTenantImageUrl) {
      this.tenantImagePreviewUrl =
        this.resolveImageUrl(this.existingTenantImageUrl);
    } else {
      this.tenantImagePreviewUrl = null;
    }
  }

  private resolveImageUrl(
    imageUrl: string | null | undefined
  ): string {

    if (!imageUrl) {
      return '';
    }

    const cleanedUrl = imageUrl.trim();

    if (!cleanedUrl) {
      return '';
    }

    if (/^https?:\/\//i.test(cleanedUrl)) {
      return cleanedUrl;
    }

    try {

      const backendOrigin = new URL(environment.apiUrl).origin;

      return new URL(
        cleanedUrl.replace(/^\/+/, ''),
        backendOrigin + '/'
      ).toString();

    } catch (error) {

      console.error('Could not resolve tenant photograph URL:', error);

      return '';
    }
  }

  // ---------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------

  isInvalid(field: string): boolean {

    const control = this.f[field];

    return !!control &&
      control.invalid &&
      (control.touched || this.submitted);
  }

  
fieldError(field: string): string {
  const control = this.f[field];

  if (!control || !this.isInvalid(field)) {
    return '';
  }

  if (control.hasError('required')) {
    const labels: Record<string, string> = {
      fullName: 'Tenant full name is required.',
      identificationType: 'Select an identification type.',
      identificationNumber: 'Identification number is required.',
      phoneNumber: 'Tenant phone number is required.',
      emergencyContactName: 'Emergency contact full name is required.',
      emergencyContactPhone: 'Emergency contact phone number is required.'
    };

    return labels[field] || 'This field is required.';
  }

  if (control.hasError('minlength')) {
    if (field === 'fullName') {
      return 'Enter the tenant full name using at least two names.';
    }

    if (field === 'emergencyContactName') {
      return 'Enter the emergency contact full name using at least two names.';
    }

    return `Minimum length is ${control.getError('minlength').requiredLength} characters.`;
  }

  if (control.hasError('maxlength')) {
    return `Maximum length is ${control.getError('maxlength').requiredLength} characters.`;
  }

  if (control.hasError('email')) {
    return 'Enter a valid email address, for example name@example.com.';
  }

  if (control.hasError('pattern')) {
    switch (field) {
      case 'fullName':
        return 'Enter at least two names. Numbers and unsupported special characters are not allowed.';

      case 'emergencyContactName':
        return 'Enter the emergency contact full name using at least two names.';

      case 'identificationNumber':
        return this.f['identificationType'].value === 'NATIONAL_ID'
          ? 'Kenyan National ID must contain exactly 8 or 9 digits.'
          : 'Passport number must contain 5–40 letters, numbers or hyphens.';

      case 'phoneNumber':
        return 'Enter a valid Kenyan mobile number, e.g. 0712345678 or +254712345678.';

      case 'emergencyContactPhone':
        return 'Enter a valid Kenyan emergency contact number, e.g. 0712345678 or +254712345678.';

      default:
        return 'Please enter a valid value.';
    }
  }

  return 'Please check this value.';
}


 
submitTenant(): void {
  this.submitted = true;

  this.successMessage = '';
  this.errorMessage = '';

  if (this.isSubmitting || this.isLoadingTenant) {
    return;
  }

  if (this.isEditMode && this.editingTenantId === null) {
    this.errorMessage =
      'The tenant record could not be identified for updating.';
    return;
  }

  // Re-run identification validation before submission.
  this.applyIdentificationNumberValidators();

  // Validate every form control.
  this.tenantForm.updateValueAndValidity();

  if (this.tenantForm.invalid) {
    this.tenantForm.markAllAsTouched();

    this.errorMessage =
      'Please correct all highlighted validation errors before saving the tenant.';

    return;
  }

  const value = this.tenantForm.getRawValue();

  const identificationType =
    value.identificationType as IdentificationType;

  const fullName = this.normalizeFullName(value.fullName);

  const identificationNumber =
    this.normalizeIdentificationNumber(
      value.identificationNumber,
      identificationType
    );

  const phoneNumber =
    this.normalizeKenyanPhone(value.phoneNumber);

  const emergencyContactName =
    this.normalizeFullName(value.emergencyContactName);

  const emergencyContactPhone =
    this.normalizeKenyanPhone(value.emergencyContactPhone);

  // Final client-side checks on the normalized values.
  const namePattern = /^[\p{L}]+(?:[ '\-’][\p{L}]+)+$/u;

  const phonePattern = /^\+254[17][0-9]{8}$/;

  if (!namePattern.test(fullName)) {
    this.errorMessage = 'Enter the tenant full name using at least two valid names.';
    this.f['fullName'].markAsTouched();
    return;
  }

  if (!namePattern.test(emergencyContactName)) {
    this.errorMessage = 'Enter a valid emergency contact full name.';
    this.f['emergencyContactName'].markAsTouched();
    return;
  }

  if (!phonePattern.test(phoneNumber)) {
    this.errorMessage = 'Enter a valid Kenyan tenant phone number.';
    this.f['phoneNumber'].markAsTouched();
    return;
  }

  if (!phonePattern.test(emergencyContactPhone)) {
    this.errorMessage = 'Enter a valid Kenyan emergency contact phone number.';
    this.f['emergencyContactPhone'].markAsTouched();
    return;
  }

  if (
    identificationType === 'NATIONAL_ID' &&
    !/^[0-9]{8,9}$/.test(identificationNumber)
  ) {
    this.errorMessage = 'Kenyan National ID must contain exactly 8 or 9 digits.';
    this.f['identificationNumber'].markAsTouched();
    return;
  }

  if (
    identificationType === 'PASSPORT' &&
    !/^[A-Z0-9-]{5,40}$/.test(identificationNumber)
  ) {
    this.errorMessage = 'Enter a valid passport number.';
    this.f['identificationNumber'].markAsTouched();
    return;
  }

  const request: TenantResidentRequest = {
    fullName,

    identificationType,

    identificationNumber,

    phoneNumber,

    email: this.toNullableString(value.email)?.toLowerCase() ?? null,

    address: this.toNullableString(value.address),

    emergencyContactName,

    emergencyContactPhone,

    notes: this.toNullableString(value.notes)
  };

  this.isSubmitting = true;

  const wasEditing = this.isEditMode;

  const request$ = wasEditing
    ? this.tenantService.updateTenant(
        this.editingTenantId!,
        request,
        this.selectedTenantImage
      )
    : this.tenantService.createTenant(
        request,
        this.selectedTenantImage
      );

  request$
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isSubmitting = false;
      })
    )
    .subscribe({
      next: tenant => {
        this.registeredTenant = tenant;

        this.existingTenantImageUrl =
          tenant.imageUrl ??
          (
            this.selectedTenantImage
              ? null
              : this.existingTenantImageUrl
          );

        this.successMessage = wasEditing
          ? `${tenant.fullName} has been updated successfully. Tenant reference: ${tenant.id}.`
          : `${tenant.fullName} has been registered successfully. Tenant reference: ${tenant.id}.`;

        this.clearSelectedTenantImage();

        this.tenantImagePreviewUrl = this.existingTenantImageUrl
          ? this.resolveImageUrl(this.existingTenantImageUrl)
          : null;

        this.selectedTenantImage = null;

        this.submitted = false;

        this.tenantForm.markAsPristine();
        this.tenantForm.markAsUntouched();

        if (!wasEditing) {
          this.tenantForm.reset(this.emptyFormValue());

          this.applyIdentificationNumberValidators();

          this.existingTenantImageUrl = null;
          this.tenantImagePreviewUrl = null;

          this.registeredTenant = tenant;
        }
      },

      error: error => {
        this.errorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          error?.message ||
          (
            wasEditing
              ? 'Tenant update failed. Please check the information and try again.'
              : 'Tenant registration failed. Please check the information and try again.'
          );

        // Preserve the form values so the user can correct them.
      }
    });
}


  // ---------------------------------------------------------
  // RESET AND NAVIGATION
  // ---------------------------------------------------------

  resetForm(): void {

    if (this.isSubmitting || this.isLoadingTenant) {
      return;
    }

    if (this.isEditMode) {

      // Cancel editing and return to registration mode.
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { editId: null },
        queryParamsHandling: 'merge'
      });

      return;
    }

    this.tenantForm.reset(this.emptyFormValue());

    this.clearSelectedTenantImage();

    this.existingTenantImageUrl = null;
    this.tenantImagePreviewUrl = null;
    this.tenantImageError = '';

    this.submitted = false;

    this.successMessage = '';
    this.errorMessage = '';

    this.registeredTenant = null;

    this.tenantForm.markAsPristine();
    this.tenantForm.markAsUntouched();
  }

  goToDashboard(): void {
    this.router.navigateByUrl('/app/tenant-agent-dashboard');
  }

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

  private toNullableString(value: unknown): string | null {

    if (value === null || value === undefined) {
      return null;
    }

    const text = String(value).trim();

    return text.length ? text : null;
  }

  // ---------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------

  ngOnDestroy(): void {

    this.destroy$.next();
    this.destroy$.complete();

    if (this.tenantImagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.tenantImagePreviewUrl);
    }
  }


/**
 * Allows digits only.
 *
 * Used for:
 * - National ID
 * - Tenant phone number
 * - Emergency contact phone number
 *
 * Also filters pasted content.
 */
onDigitsOnly(event: Event, maximumLength: number): void {
  const input = event.target as HTMLInputElement;

  if (!input) {
    return;
  }

  const start = input.selectionStart;
  const originalValue = input.value;

  const cursorPosition = start ?? originalValue.length;

  const filteredBeforeCursor = originalValue
    .substring(0, cursorPosition)
    .replace(/[^0-9]/g, '')
    .substring(0, maximumLength);

  const filteredValue = originalValue
    .replace(/[^0-9]/g, '')
    .substring(0, maximumLength);

  if (originalValue !== filteredValue) {
    input.value = filteredValue;

    const newPosition = Math.min(
      filteredBeforeCursor.length,
      filteredValue.length
    );

    input.setSelectionRange(newPosition, newPosition);
  }

  const controlName = input.getAttribute('formControlName');

  if (controlName) {
    const control = this.tenantForm.get(controlName);

    if (control && control.value !== filteredValue) {
      control.setValue(filteredValue);
      control.markAsDirty();
    }
  }
}

/**
 * Passport numbers allow letters, numbers and hyphens.
 * Converts letters to uppercase and removes unsupported characters.
 */
onPassportInput(event: Event): void {
  const input = event.target as HTMLInputElement;

  if (!input) {
    return;
  }

  const filteredValue = input.value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .substring(0, 40);

  if (input.value !== filteredValue) {
    input.value = filteredValue;
  }

  const control = this.tenantForm.get('identificationNumber');

  if (control && control.value !== filteredValue) {
    control.setValue(filteredValue);
    control.markAsDirty();
  }
}


}
