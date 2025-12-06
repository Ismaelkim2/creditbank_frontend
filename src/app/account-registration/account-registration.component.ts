import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountService } from '../services/account.service';

@Component({
  selector: 'app-account-registration',
  templateUrl: './account-registration.component.html',
  styleUrls: ['./account-registration.component.css']
})
export class AccountRegistrationComponent {
  accountForm: FormGroup;
  selectedImage: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;

  existingAccount: any = null;
  isDuplicate: boolean = false;

  constructor(private fb: FormBuilder, private accountService: AccountService) {
    this.accountForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.pattern(/^[A-Za-z]+(\s+[A-Za-z]+)+$/)]],
      nationalId: ['', [Validators.required, Validators.pattern(/^\d{6,8}$/)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(?:2547\d{8}|07\d{8})$/)]],
      email: ['', [Validators.required, Validators.email]],
      image: [null, Validators.required] // ✅ mandatory image
    });
  }
onFileChange(event: any) {
  if (event.target.files && event.target.files.length > 0) {
    const file: File = event.target.files[0];
    this.selectedImage = file;

    // Update FormControl explicitly
    this.accountForm.get('image')?.setValue(file);
    this.accountForm.get('image')?.markAsDirty();
    this.accountForm.get('image')?.updateValueAndValidity();

    const reader = new FileReader();
    reader.onload = () => this.previewUrl = reader.result;
    reader.readAsDataURL(file);
  }
}



  onSubmit() {
    if (!this.selectedImage) {
      alert('❌ Profile picture is required.');
      return;
    }

    if (this.accountForm.valid) {
      const formData = new FormData();
      Object.keys(this.accountForm.value).forEach(key => {
        if (key !== 'image') formData.append(key, this.accountForm.value[key]);
      });
      if (this.selectedImage) formData.append('image', this.selectedImage);

      this.accountService.createAccount(formData).subscribe({
        next: (res) => {
          alert('✅ Account created successfully!');
          this.resetForm();
        },
        error: (err) => {
          if (err.status === 409 && err.error?.existingAccount) {
            this.existingAccount = err.error.existingAccount;
            this.isDuplicate = true;
          } else {
            alert(err.error?.message || '❌ Failed to create account');
          }
        }
      });
    } else {
      this.accountForm.markAllAsTouched();
    }
  }

  resetForm() {
    this.accountForm.reset();
    this.selectedImage = null;
    this.previewUrl = null;
    this.existingAccount = null;
    this.isDuplicate = false;
  }
}
