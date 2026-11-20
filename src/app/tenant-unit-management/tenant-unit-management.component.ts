
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  TenantUnitService,
  TenantUnitRequest,
  TenantUnitResponse,
  TenantUnitStatus,
  TenantUnitPropertyOption
} from '../services/tenant-unit.service';

import { environment } from '../../environments/environment';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tenant-unit-management',
  templateUrl: './tenant-unit-management.component.html',
  styleUrls: ['./tenant-unit-management.component.css']
})
export class TenantUnitManagementComponent implements OnInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();
  private readonly unitLoad$ = new Subject<void>();

  properties: TenantUnitPropertyOption[] = [];
  units: TenantUnitResponse[] = [];

  selectedPropertyId: number | null = null;
  editingUnitId: number | null = null;
  private pendingEditUnitId: number | null = null;

  unitForm!: FormGroup;

  loadingProperties = false;
  loadingUnits = false;
  savingUnit = false;
  changingStatusId: number | null = null;

  // Selected property photograph
  selectedPropertyImageError = false;

  // Optional unit photograph
  selectedUnitImage: File | null = null;
  unitImagePreviewUrl: string | null = null;
  unitImageError = '';

  // Existing unit photograph shown while editing
  currentUnitImageUrl: string | null = null;

  // Track failed unit image requests
  readonly failedUnitImages = new Set<number>();

  pageError = '';
  formError = '';
  successMessage = '';

  searchTerm = '';

  statusFilter: 'ALL' | TenantUnitStatus = 'ALL';

  readonly statuses: TenantUnitStatus[] = [
    'VACANT',
    'OCCUPIED',
    'MAINTENANCE',
    'INACTIVE'
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly unitService: TenantUnitService,
    private readonly route: ActivatedRoute
  ) {}

ngOnInit(): void {
  this.buildForm();

  const editId = Number(this.route.snapshot.queryParamMap.get('editId'));
  const propertyId = Number(this.route.snapshot.queryParamMap.get('propertyId'));

  this.pendingEditUnitId =
    Number.isInteger(editId) && editId > 0 ? editId : null;

  this.selectedPropertyId =
    Number.isInteger(propertyId) && propertyId > 0 ? propertyId : null;

  this.loadProperties();
}
  // ---------------------------------------------------------
  // FORM INITIALIZATION
  // ---------------------------------------------------------

  private buildForm(): void {

    this.unitForm = this.fb.group({

      unitNumber: [
        '',
        [
          Validators.required,
          Validators.maxLength(40),
          Validators.pattern(/.*\S.*/)
        ]
      ],

      floor: [
        '',
        [Validators.maxLength(100)]
      ],

      unitType: [
        '',
        [Validators.maxLength(100)]
      ],

      monthlyRent: [
        null,
        [
          Validators.required,
          Validators.min(0.01)
        ]
      ],

      depositAmount: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      description: [
        '',
        [Validators.maxLength(5000)]
      ]

    });
  }

  resetForm(): void {

    this.editingUnitId = null;

    this.formError = '';
    this.successMessage = '';

    this.removeUnitImage();

    this.currentUnitImageUrl = null;

    if (this.unitForm) {

      this.unitForm.reset({
        unitNumber: '',
        floor: '',
        unitType: '',
        monthlyRent: null,
        depositAmount: 0,
        description: ''
      });

      this.unitForm.markAsPristine();
      this.unitForm.markAsUntouched();
    }
  }

  // ---------------------------------------------------------
  // PROPERTY LOADING
  // ---------------------------------------------------------

  loadProperties(): void {

    this.loadingProperties = true;
    this.pageError = '';

    this.unitService.getProperties()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingProperties = false)
      )
      .subscribe({

        next: properties => {

          this.properties = Array.isArray(properties)
            ? properties
            : [];

          if (!this.properties.length) {

            this.selectedPropertyId = null;
            this.selectedPropertyImageError = false;
            this.units = [];

            this.unitLoad$.next();

            this.resetForm();

            return;
          }

         const requestedProperty = this.properties.find(
  property =>
    Number(property.id) === Number(this.selectedPropertyId)
);

const propertyToSelect = requestedProperty
  ? requestedProperty.id
  : this.properties[0].id;

this.selectProperty(propertyToSelect);
        },

        error: error => {

          this.properties = [];
          this.selectedPropertyId = null;
          this.selectedPropertyImageError = false;
          this.units = [];

          this.pageError = this.errorMessage(
            error,
            'Could not load your registered properties.'
          );
        }

      });
  }

  selectProperty(value: number | string): void {

    const propertyId = Number(value);

    if (!Number.isFinite(propertyId) || propertyId <= 0) {

      this.selectedPropertyId = null;
      this.selectedPropertyImageError = false;
      this.units = [];

      this.unitLoad$.next();

      this.resetForm();

      return;
    }

    const propertyExists = this.properties.some(
      property => Number(property.id) === propertyId
    );

    if (!propertyExists) {

      this.pageError = 'The selected property could not be found.';

      return;
    }

    const propertyChanged =
      this.selectedPropertyId !== propertyId;

    if (propertyChanged) {

      this.resetForm();

      this.selectedPropertyImageError = false;
      this.failedUnitImages.clear();

      this.units = [];
    }

    this.selectedPropertyId = propertyId;

    this.successMessage = '';
    this.formError = '';
    this.pageError = '';

    this.loadUnits();
  }

  get selectedProperty(): TenantUnitPropertyOption | undefined {

    return this.properties.find(
      property => Number(property.id) === Number(this.selectedPropertyId)
    );
  }

  // ---------------------------------------------------------
  // IMAGE URL RESOLUTION
  // ---------------------------------------------------------

  /**
   * Resolves backend image paths.
   *
   * Supports:
   * /uploads/units/image.jpg
   * uploads/units/image.jpg
   * https://backend.example.com/uploads/units/image.jpg
   */

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

    // Absolute URL
    if (/^https?:\/\//i.test(cleanedUrl)) {
      return cleanedUrl;
    }

    try {

      const apiUrl = environment.apiUrl;

      if (!apiUrl) {
        console.error('environment.apiUrl is not configured.');
        return '';
      }

      const backendOrigin = new URL(apiUrl).origin;

      return new URL(
        cleanedUrl.replace(/^\/+/, ''),
        backendOrigin + '/'
      ).toString();

    } catch (error) {

      console.error('Could not resolve image URL:', {
        imageUrl: cleanedUrl,
        error
      });

      return '';
    }
  }

  getSelectedPropertyImageUrl(
    imageUrl: string | null | undefined
  ): string {

    return this.resolveImageUrl(imageUrl);
  }

  onSelectedPropertyImageError(): void {

    this.selectedPropertyImageError = true;

    console.error(
      'Selected property photograph could not be loaded.',
      this.selectedProperty?.imageUrl
    );
  }

  getUnitImageUrl(
    imageUrl: string | null | undefined
  ): string {

    return this.resolveImageUrl(imageUrl);
  }

  hasUnitImageError(unitId: number): boolean {

    return this.failedUnitImages.has(unitId);
  }

  onUnitTableImageError(
    event: Event,
    unitId: number
  ): void {

    this.failedUnitImages.add(unitId);

    const img = event.target as HTMLImageElement;

    console.error('Unit photograph failed to load:', {
      unitId,
      imageUrl: this.units.find(unit => unit.id === unitId)?.imageUrl,
      resolvedUrl: img?.src
    });
  }

  onMobileUnitImageError(
    event: Event,
    unitId: number
  ): void {

    this.failedUnitImages.add(unitId);

    const img = event.target as HTMLImageElement;

    console.error('Mobile unit photograph failed to load:', {
      unitId,
      imageUrl: this.units.find(unit => unit.id === unitId)?.imageUrl,
      resolvedUrl: img?.src
    });
  }

  // ---------------------------------------------------------
  // UNIT LOADING
  // ---------------------------------------------------------

  loadUnits(): void {

    if (!this.selectedPropertyId) {

      this.units = [];
      this.loadingUnits = false;

      return;
    }

    const propertyId = this.selectedPropertyId;

    this.loadingUnits = true;
    this.pageError = '';

    // Cancel previous property request.
    this.unitLoad$.next();

    this.unitService.getUnits(propertyId)
      .pipe(
        takeUntil(this.destroy$),
        takeUntil(this.unitLoad$),
        finalize(() => {

          if (this.selectedPropertyId === propertyId) {
            this.loadingUnits = false;
          }

        })
      )
      .subscribe({

        next: units => {

          if (this.selectedPropertyId !== propertyId) {
            return;
          }

          // Correct location for assigning returned units.
          this.units = Array.isArray(units)
            ? units
            : [];

            // Automatically open the unit passed from the Tenant Directory.
if (this.pendingEditUnitId !== null) {

  const unitToEdit = this.units.find(
    unit => Number(unit.id) === Number(this.pendingEditUnitId)
  );

  if (unitToEdit) {

    this.pendingEditUnitId = null;

    this.startEdit(unitToEdit);

    setTimeout(() => {
      document.getElementById('unit-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);

  } else {

    this.pageError =
      'The requested unit could not be found under the selected property.';

    this.pendingEditUnitId = null;
  }
}

          // Clear old broken-image tracking for refreshed data.
          this.failedUnitImages.clear();

          // IMAGE DIAGNOSTICS
          console.table(
            this.units.map(unit => ({
              id: unit.id,
              unitNumber: unit.unitNumber,
              imageUrl: unit.imageUrl ?? null,
              resolvedImageUrl: this.getUnitImageUrl(unit.imageUrl)
            }))
          );

          // Warn about missing image URLs.
          this.units.forEach(unit => {

            if (!unit.imageUrl) {

              console.warn(
                `Unit ${unit.unitNumber} has no imageUrl in the API response.`
              );
            }

          });
        },

        error: error => {

          if (this.selectedPropertyId !== propertyId) {
            return;
          }

          this.units = [];

          this.pageError = this.errorMessage(
            error,
            'Could not load units for the selected property.'
          );
        }

      });
  }

  // ---------------------------------------------------------
  // UNIT FILTERING AND STATISTICS
  // ---------------------------------------------------------

  get filteredUnits(): TenantUnitResponse[] {

    const term = this.searchTerm.trim().toLowerCase();

    return this.units.filter(unit => {

      const matchesSearch = !term || [

        unit.unitNumber,
        unit.floor,
        unit.unitType,
        unit.description,
        unit.status

      ].some(value =>
        String(value ?? '').toLowerCase().includes(term)
      );

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        unit.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  get vacantCount(): number {

    return this.units.filter(
      unit => unit.status === 'VACANT'
    ).length;
  }

  get occupiedCount(): number {

    return this.units.filter(
      unit => unit.status === 'OCCUPIED'
    ).length;
  }

  get maintenanceCount(): number {

    return this.units.filter(
      unit => unit.status === 'MAINTENANCE'
    ).length;
  }

  get totalMonthlyRent(): number {

    return this.units
      .filter(unit => unit.status === 'OCCUPIED')
      .reduce(
        (total, unit) =>
          total + Number(unit.monthlyRent || 0),
        0
      );
  }

  // ---------------------------------------------------------
  // OPTIONAL UNIT PHOTOGRAPH UPLOAD
  // ---------------------------------------------------------

  onUnitImageSelected(event: Event): void {

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.unitImageError = '';

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {

      this.unitImageError =
        'Unsupported image format. Select JPG, PNG or WEBP.';

      input.value = '';

      return;
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {

      this.unitImageError =
        'The photograph must not exceed 5 MB.';

      input.value = '';

      return;
    }

    this.clearUnitImagePreview();

    this.selectedUnitImage = file;

    this.unitImagePreviewUrl = URL.createObjectURL(file);

    // New image replaces existing image after successful save.
    this.currentUnitImageUrl = null;
  }

 removeUnitImage(): void {
  this.clearUnitImagePreview();

  this.selectedUnitImage = null;
  this.unitImageError = '';

  const input = document.getElementById(
    'unitImage'
  ) as HTMLInputElement | null;

  if (input) {
    input.value = '';
  }
}
  private clearUnitImagePreview(): void {

    if (this.unitImagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.unitImagePreviewUrl);
    }

    this.unitImagePreviewUrl = null;
  }

  // ---------------------------------------------------------
  // CREATE UNIT
  // ---------------------------------------------------------

  startCreate(): void {

    this.editingUnitId = null;

    this.formError = '';
    this.successMessage = '';
    this.unitImageError = '';

    this.removeUnitImage();

    this.currentUnitImageUrl = null;

    this.unitForm.reset({

      unitNumber: '',
      floor: '',
      unitType: '',
      monthlyRent: null,
      depositAmount: 0,
      description: ''

    });

    this.unitForm.markAsPristine();
    this.unitForm.markAsUntouched();
  }

  // ---------------------------------------------------------
  // EDIT UNIT
  // ---------------------------------------------------------
startEdit(unit: TenantUnitResponse): void {

  if (!unit) {
    return;
  }

  this.editingUnitId = unit.id;

  this.formError = '';
  this.successMessage = '';
  this.unitImageError = '';

  // Clear any previously selected replacement photograph.
  this.removeUnitImage();

  // Preserve the existing photograph.
  this.currentUnitImageUrl = unit.imageUrl ?? null;

  // Populate all editable fields.
  this.unitForm.patchValue({

    unitNumber: unit.unitNumber ?? '',

    floor: unit.floor ?? '',

    unitType: unit.unitType ?? '',

    monthlyRent: Number(unit.monthlyRent ?? 0),

    depositAmount: Number(unit.depositAmount ?? 0),

    description: unit.description ?? ''

  });

  this.unitForm.markAsPristine();
  this.unitForm.markAsUntouched();

  setTimeout(() => {
    document.getElementById('unit-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, 100);
}

  cancelEdit(): void {
    this.startCreate();
  }

  // ---------------------------------------------------------
  // SAVE UNIT
  // ---------------------------------------------------------

  submitUnit(): void {

    this.formError = '';
    this.successMessage = '';

    if (!this.selectedPropertyId) {

      this.formError =
        'Select a property before saving a unit.';

      return;
    }

    if (this.unitForm.invalid) {

      this.unitForm.markAllAsTouched();

      this.formError =
        'Please correct the highlighted fields before saving.';

      return;
    }

    if (this.savingUnit) {
      return;
    }

    const raw = this.unitForm.getRawValue();

    const request: TenantUnitRequest = {

      unitNumber: String(raw.unitNumber).trim(),

      floor: this.optionalText(raw.floor),

      unitType: this.optionalText(raw.unitType),

      monthlyRent: Number(raw.monthlyRent),

      depositAmount: Number(raw.depositAmount),

      description: this.optionalText(raw.description)

    };

    if (

      !Number.isFinite(request.monthlyRent) ||
      request.monthlyRent <= 0 ||

      !Number.isFinite(request.depositAmount) ||
      request.depositAmount < 0

    ) {

      this.formError =
        'Enter a valid monthly rent and deposit amount.';

      return;
    }

    this.savingUnit = true;

    const propertyId = this.selectedPropertyId;
    const wasEditing = this.editingUnitId !== null;

    const request$ = wasEditing

      ? this.unitService.updateUnit(
          propertyId,
          this.editingUnitId!,
          request,
          this.selectedUnitImage
        )

      : this.unitService.createUnit(
          propertyId,
          request,
          this.selectedUnitImage
        );

    request$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.savingUnit = false)
      )
      .subscribe({

        next: () => {

          this.successMessage = wasEditing
            ? 'Unit details updated successfully.'
            : 'Unit registered successfully.';

          this.startCreate();

          // Reload units to obtain the saved image URL.
          this.loadUnits();
        },

        error: error => {

          this.formError = this.errorMessage(
            error,
            'Unable to save the unit. Please try again.'
          );
        }

      });
  }

  // ---------------------------------------------------------
  // CHANGE UNIT STATUS
  // ---------------------------------------------------------

  changeStatus(
    unit: TenantUnitResponse,
    statusValue: string
  ): void {

    if (
      !this.selectedPropertyId ||
      this.changingStatusId !== null
    ) {
      return;
    }

    if (
      !this.statuses.includes(
        statusValue as TenantUnitStatus
      )
    ) {
      return;
    }

    const status = statusValue as TenantUnitStatus;

    if (status === unit.status) {
      return;
    }

    if (
      status === 'OCCUPIED' &&
      unit.status === 'VACANT'
    ) {

      this.formError =
        'Assign a tenant through lease management before marking a unit occupied.';

      return;
    }

    if (
      status === 'VACANT' &&
      unit.status === 'OCCUPIED'
    ) {

      this.formError =
        'Do not mark an occupied unit vacant until its tenancy has ended.';

      return;
    }

    const confirmed = window.confirm(
      `Change unit ${unit.unitNumber} from ${this.formatStatus(unit.status)} to ${this.formatStatus(status)}?`
    );

    if (!confirmed) {
      return;
    }

    this.formError = '';
    this.successMessage = '';

    this.changingStatusId = unit.id;

    const propertyId = this.selectedPropertyId;

    this.unitService.updateUnitStatus(
      propertyId,
      unit.id,
      status
    )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.changingStatusId = null)
      )
      .subscribe({

        next: () => {

          this.successMessage =
            `Unit ${unit.unitNumber} status updated successfully.`;

          this.loadUnits();
        },

        error: error => {

          this.formError = this.errorMessage(
            error,
            'Unable to update unit status.'
          );
        }

      });
  }

  // ---------------------------------------------------------
  // SEARCH AND FILTERS
  // ---------------------------------------------------------

  resetFilters(): void {

    this.searchTerm = '';
    this.statusFilter = 'ALL';
  }

  // ---------------------------------------------------------
  // FORM VALIDATION
  // ---------------------------------------------------------

  isInvalid(controlName: string): boolean {

    const control = this.unitForm.get(controlName);

    return !!control &&
      control.invalid &&
      (control.touched || control.dirty);
  }

  // ---------------------------------------------------------
  // STATUS FORMATTING
  // ---------------------------------------------------------

  formatStatus(
    status: TenantUnitStatus | string
  ): string {

    return String(status)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  statusClass(status: TenantUnitStatus): string {

    switch (status) {

      case 'VACANT':
        return 'status-vacant';

      case 'OCCUPIED':
        return 'status-occupied';

      case 'MAINTENANCE':
        return 'status-maintenance';

      case 'INACTIVE':
        return 'status-inactive';

      default:
        return '';
    }
  }

  trackByUnit(
    _index: number,
    unit: TenantUnitResponse
  ): number {

    return unit.id;
  }

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

  private optionalText(value: unknown): string | null {

    const text = String(value ?? '').trim();

    return text ? text : null;
  }

  private errorMessage(
    error: any,
    fallback: string
  ): string {

    // Angular HttpErrorResponse usually contains the useful
    // backend message inside error.error.message or error.error.
    const backendMessage =
      error?.error?.message ||
      (typeof error?.error === 'string' ? error.error : null) ||
      error?.message;

    return typeof backendMessage === 'string' &&
      backendMessage.trim()
        ? backendMessage
        : fallback;
  }

  // ---------------------------------------------------------
  // COMPONENT CLEANUP
  // ---------------------------------------------------------

  ngOnDestroy(): void {

    this.destroy$.next();
    this.destroy$.complete();

    this.unitLoad$.next();
    this.unitLoad$.complete();

    this.clearUnitImagePreview();
  }

}
