import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';
import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  Subject,
  finalize,
  takeUntil
} from 'rxjs';

import {
  PropertyType,
  TenantPropertyRequest,
  TenantPropertyResponse,
  TenantPropertyService
} from './../services/tenant-property.service';

@Component({
  selector: 'app-tenant-property-registration',
  templateUrl: './tenant-property-registration.component.html',
  styleUrls: ['./tenant-property-registration.component.css']
})
export class TenantPropertyRegistrationComponent
  implements OnInit, OnDestroy {

  propertyForm!: FormGroup;

  submitting = false;
  loadingProperty = false;

  successMessage = '';
  errorMessage = '';

  selectedImage: File | null = null;
  imagePreview: string | null = null;
  imageError = '';

  isEditMode = false;
  editingPropertyId: number | null = null;

  // Original record is retained for reset and image preservation.
  private originalProperty: TenantPropertyResponse | null = null;

  // Existing backend image URL, if the property already has a photo.
  private currentImageUrl: string | null = null;

  private readonly destroy$ = new Subject<void>();

  readonly propertyTypes: {
    value: PropertyType;
    label: string;
  }[] = [
    { value: 'RESIDENTIAL', label: 'Residential' },
    { value: 'COMMERCIAL', label: 'Commercial' },
    { value: 'MIXED_USE', label: 'Mixed Use' },
    { value: 'INDUSTRIAL', label: 'Industrial' },
    { value: 'LAND', label: 'Land' },
    { value: 'OTHER', label: 'Other' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly tenantPropertyService: TenantPropertyService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeForm();

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const editIdValue = params.get('editId');

        if (editIdValue) {
          const editId = Number(editIdValue);

          if (!Number.isInteger(editId) || editId <= 0) {
            this.errorMessage = 'Invalid property ID.';
            return;
          }

          if (
            this.editingPropertyId !== editId ||
            !this.isEditMode
          ) {
            this.loadPropertyForEdit(editId);
          }
        } else {
          this.setRegistrationMode();
        }
      });
  }

  private initializeForm(): void {
    this.propertyForm = this.fb.group({
      propertyCode: [
        '',
        [
          Validators.required,
          Validators.maxLength(40),
          Validators.pattern(/^[A-Za-z0-9_-]+$/)
        ]
      ],

      name: [
        '',
        [
          Validators.required,
          Validators.maxLength(160),
          Validators.pattern(/.*\S.*/)
        ]
      ],

      propertyType: ['', Validators.required],

      county: ['', Validators.maxLength(100)],
      town: ['', Validators.maxLength(100)],
      address: ['', Validators.maxLength(255)],
      description: ['', Validators.maxLength(5000)]
    });
  }

  get f(): { [key: string]: AbstractControl } {
    return this.propertyForm.controls;
  }

  isInvalid(field: string): boolean {
    const control = this.f[field];

    return !!control &&
      control.invalid &&
      (control.touched || control.dirty);
  }

  /**
   * Switches the page into normal registration mode.
   */
  private setRegistrationMode(): void {
    this.isEditMode = false;
    this.editingPropertyId = null;
    this.originalProperty = null;
    this.currentImageUrl = null;

    this.loadingProperty = false;

    this.clearImagePreview();

    if (this.propertyForm) {
      this.propertyForm.reset({
        propertyCode: '',
        name: '',
        propertyType: '',
        county: '',
        town: '',
        address: '',
        description: ''
      });
    }

    this.selectedImage = null;
    this.imageError = '';
  }

  /**
   * Loads an existing property and prepares the form for editing.
   */
  private loadPropertyForEdit(id: number): void {
    this.isEditMode = true;
    this.editingPropertyId = id;

    this.loadingProperty = true;
    this.submitting = false;

    this.successMessage = '';
    this.errorMessage = '';
    this.imageError = '';

    this.selectedImage = null;
    this.clearImagePreview();

    this.tenantPropertyService.getProperty(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingProperty = false;
        })
      )
      .subscribe({
        next: (property: TenantPropertyResponse) => {
          this.originalProperty = property;

          this.populateForm(property);

          this.currentImageUrl =
            this.tenantPropertyService.getPropertyImageUrl(
              property.imageUrl
            );

          // Display the existing photograph.
          this.imagePreview = this.currentImageUrl;

          this.successMessage = '';
          this.errorMessage = '';
        },

        error: (error: HttpErrorResponse) => {
          console.error('Property loading failed:', error);

          this.errorMessage = error.status === 404
            ? 'The property you are trying to edit could not be found.'
            : this.getErrorMessage(error);
        }
      });
  }

  /**
   * Populates the registration form with existing property details.
   */
  private populateForm(
    property: TenantPropertyResponse
  ): void {
    this.propertyForm.patchValue({
      propertyCode: property.propertyCode || '',
      name: property.name || '',
      propertyType: property.propertyType || '',
      county: property.county || '',
      town: property.town || '',
      address: property.address || '',
      description: property.description || ''
    });

    this.propertyForm.markAsPristine();
    this.propertyForm.markAsUntouched();
  }

  submitProperty(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.submitting || this.loadingProperty) {
      return;
    }

    if (this.propertyForm.invalid) {
      this.propertyForm.markAllAsTouched();

      this.errorMessage =
        'Please correct the highlighted fields before submitting.';

      return;
    }

    if (this.isEditMode && !this.editingPropertyId) {
      this.errorMessage =
        'The property ID is missing. Unable to update this property.';

      return;
    }

    const raw = this.propertyForm.getRawValue();

    const request: TenantPropertyRequest = {
      propertyCode: String(raw.propertyCode || '').trim(),
      name: String(raw.name || '').trim(),
      propertyType: raw.propertyType as PropertyType,
      county: String(raw.county || '').trim(),
      town: String(raw.town || '').trim(),
      address: String(raw.address || '').trim(),
      description: String(raw.description || '').trim()
    };

    this.submitting = true;

    if (!this.isEditMode) {
      this.registerProperty(request);
      return;
    }

    this.updateExistingProperty(request);
  }

  /**
   * Creates a new property.
   */
  private registerProperty(
    request: TenantPropertyRequest
  ): void {
    const formData = this.buildMultipartFormData(request);

    this.tenantPropertyService.createProperty(formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.submitting = false;
        })
      )
      .subscribe({
        next: (response: TenantPropertyResponse) => {
          this.successMessage =
            `Property "${response.name || request.name}" registered successfully.`;

          this.resetForm();
        },

        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.getErrorMessage(error);
        }
      });
  }

private updateExistingProperty(
  request: TenantPropertyRequest
): void {

  const propertyId = this.editingPropertyId;

  if (!propertyId) {
    this.submitting = false;
    this.errorMessage = 'Invalid property ID.';
    return;
  }

  const formData = this.buildMultipartFormData(request);

  this.tenantPropertyService.updateProperty(
    propertyId,
    formData
  )
  .pipe(
    takeUntil(this.destroy$),
    finalize(() => {
      this.submitting = false;
    })
  )
  .subscribe({

    next: (response: TenantPropertyResponse) => {

      this.originalProperty = response;

      this.populateForm(response);

      if (response.imageUrl) {
        this.currentImageUrl =
          this.tenantPropertyService.getPropertyImageUrl(
            response.imageUrl
          );
      }

      this.clearImagePreview();

      this.selectedImage = null;
      this.imagePreview = this.currentImageUrl;

      this.successMessage =
        `Property "${response.name || request.name}" updated successfully.`;

      this.errorMessage = '';
      this.imageError = '';
    },

    error: (error: HttpErrorResponse) => {

      console.error('Property update failed:', error);

      this.errorMessage = this.getErrorMessage(error);
    }

  });
}

  /**
   * Builds multipart data for property creation or image replacement.
   */
  private buildMultipartFormData(
    request: TenantPropertyRequest
  ): FormData {
    const formData = new FormData();

    formData.append('propertyCode', request.propertyCode);
    formData.append('name', request.name);
    formData.append('propertyType', request.propertyType);

    formData.append('county', request.county);
    formData.append('town', request.town);
    formData.append('address', request.address);
    formData.append('description', request.description);

    if (this.selectedImage) {
      formData.append(
        'image',
        this.selectedImage,
        this.selectedImage.name
      );
    }

    return formData;
  }

  private getErrorMessage(
    error: HttpErrorResponse
  ): string {
    if (error.status === 0) {
      return 'Cannot reach the server. Check your connection and backend status.';
    }

    if (error.status === 401) {
      return 'Your session may have expired. Please sign in again.';
    }

    if (error.status === 403) {
      return 'You are not authorized to perform this property operation.';
    }

    if (error.status === 400) {
      return error.error?.message ||
        'The submitted property details are invalid. Please review them.';
    }

    if (error.status === 404) {
      return 'The selected property could not be found.';
    }

    if (error.status === 409) {
      return error.error?.message ||
        'A property with this code may already exist.';
    }

    return error.error?.message ||
      'The property operation failed. Please try again.';
  }

  /**
   * Reset restores the loaded property in edit mode.
   * In registration mode, it clears the form.
   */
  resetForm(): void {
    if (this.submitting || this.loadingProperty) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';
    this.imageError = '';

    this.selectedImage = null;
    this.clearImagePreview();

    if (this.isEditMode && this.originalProperty) {
      this.populateForm(this.originalProperty);

      this.currentImageUrl =
        this.tenantPropertyService.getPropertyImageUrl(
          this.originalProperty.imageUrl
        );

      this.imagePreview = this.currentImageUrl;
      return;
    }

    this.propertyForm.reset({
      propertyCode: '',
      name: '',
      propertyType: '',
      county: '',
      town: '',
      address: '',
      description: ''
    });

    this.currentImageUrl = null;
  }

  goToProperties(): void {
    this.router.navigateByUrl('/app/tenant/properties');
  }


 onImageSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  this.imageError = '';

  if (!file) {
    return;
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  const maxSize = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    this.imageError = 'Only JPG, JPEG, PNG and WEBP images are allowed.';
    input.value = '';
    return;
  }

  if (file.size > maxSize) {
    this.imageError = 'The image must not exceed 5 MB.';
    input.value = '';
    return;
  }

  // Release the previous temporary preview.
  if (this.imagePreview?.startsWith('blob:')) {
    URL.revokeObjectURL(this.imagePreview);
  }

  this.selectedImage = file;
  this.imagePreview = URL.createObjectURL(file);
}


 removeImage(fileInput?: HTMLInputElement): void {
  // Release the previous temporary preview URL.
  if (this.imagePreview?.startsWith('blob:')) {
    URL.revokeObjectURL(this.imagePreview);
  }

  // Clear the selected replacement image.
  this.selectedImage = null;

  // Hide the current image preview so the upload area appears.
  this.imagePreview = null;

  // Clear validation errors.
  this.imageError = '';

  // Reset the actual browser file input.
  // This also allows selecting the same image again.
  if (fileInput) {
    fileInput.value = '';
  }
}

  private clearImagePreview(): void {
    if (this.imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreview);
    }

    this.imagePreview = null;
  }

  ngOnDestroy(): void {
    this.clearImagePreview();

    this.destroy$.next();
    this.destroy$.complete();
  }
}