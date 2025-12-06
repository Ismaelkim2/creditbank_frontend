import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { LoanSetting, SettingsService } from '../services/settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
   styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  settingsForm: FormGroup;
  loanSettings: LoanSetting[] = [];

  isEditMode: boolean = false;
  selectedSettingId: number | null = null;

  successMessage = '';
  errorMessage = '';

  constructor(private fb: FormBuilder, private settingsService: SettingsService) {
    this.settingsForm = this.fb.group({
      durationInWeeks: [2],
      interestRate: [0],
      penaltyRate: [0],
      gracePeriodDays: [0],
      maxLoanAmount: [0],
      autoApproval: [false]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    
    this.settingsService.getLoanSettings().subscribe({
      next: data => {
        this.loanSettings = data;
      },
      error: err => {
        console.error('Failed to load settings', err);
        this.errorMessage = 'Failed to load settings.';
      }
    });
  }

  saveSettings(): void {
    const setting: LoanSetting = this.settingsForm.value;

    if (this.isEditMode && this.selectedSettingId !== null) {
      // Use update logic if backend supports it
      setting.id = this.selectedSettingId;
      this.settingsService.saveLoanSetting(setting).subscribe({
        next: () => {
          this.successMessage = 'Setting updated successfully.';
          this.resetForm();
          this.loadSettings();
        },
        error: () => {
          this.errorMessage = 'Failed to update setting.';
        }
      });
    } else {
      this.settingsService.saveLoanSetting(setting).subscribe({
        next: () => {
          this.successMessage = 'Setting saved successfully.';
          this.resetForm();
          this.loadSettings();
        },
        error: () => {
          this.errorMessage = 'Failed to save setting.';
        }
      });
    }
  }

  editSetting(setting: LoanSetting): void {
    this.isEditMode = true;
    this.selectedSettingId = setting.id ?? null;
    this.settingsForm.patchValue(setting);
  }

  deleteSetting(id: number | undefined): void {
  if (!id) return;

  if (confirm('Are you sure you want to delete this setting?')) {
    this.settingsService.deleteLoanSetting(id).subscribe({
      next: () => {
        this.successMessage = 'Setting deleted successfully.';
        this.loadSettings();
      },
      error: () => {
        this.errorMessage = 'Failed to delete setting.';
      }
    });
  }
}


  cancelEdit(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.isEditMode = false;
    this.selectedSettingId = null;
    this.settingsForm.reset({
      durationInWeeks: 2,
      interestRate: 0,
      penaltyRate: 0,
      gracePeriodDays: 0,
      maxLoanAmount: 0,
      autoApproval: false
    });
    this.successMessage = '';
    this.errorMessage = '';
  }

  getDurationLabel(weeks: number): string {
  switch (weeks) {
    case 4: return '1 Month';
    case 8: return '2 Months';
    case 12: return '3 Months';
    default: return `${weeks} Weeks`;
  }
}

}
