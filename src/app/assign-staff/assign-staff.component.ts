
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoanService } from '../services/loan.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-assign-staff',
  templateUrl: './assign-staff.component.html',
  styleUrls: ['./assign-staff.component.css']
})
export class AssignStaffComponent implements OnInit {

  loanId!: number;
  loan: any;

  isOnboardingOnly = false;

  staffList: any[] = [];
  selectedStaffId: number | null = null;

  isLoading = false;
  isAssigning = false;
  isSavingStaff = false;

  searchText = '';

  staffForm!: FormGroup;

  invitationResult: any = null;
  isRegenerating = false;

  readonly staffRoles = [
    { value: 'ADMIN', label: 'Administrator' },
    { value: 'DATA_MANAGER', label: 'Data Manager' },
    { value: 'TENANT_AGENT', label: 'Tenant Agent' }
  ];

  constructor(
    private route: ActivatedRoute,
    private loanService: LoanService,
    private router: Router,
    private fb: FormBuilder,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {

    this.staffForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      nationalId: ['', Validators.required],
      phone: ['', Validators.required],
      department: ['Loans', Validators.required],
      role: ['DATA_MANAGER', Validators.required],
      sendEmail: [false]
    });

    this.route.queryParams.subscribe(params => {

      this.isOnboardingOnly = params['mode'] === 'onboard';

      if (this.isOnboardingOnly) {
        this.loadStaffOnly();
        return;
      }

      this.loanId = Number(params['loanId']);

      if (!this.loanId) {
        this.router.navigate(['/app/dashboard']);
        return;
      }

      this.loadData();
    });
  }

  // ==========================================
  // LOAN ASSIGNMENT
  // ==========================================

  loadData(): void {

    this.isLoading = true;

    this.loanService.getLoanById(this.loanId).subscribe({
      next: loan => {
        this.loan = loan;
      },
      error: () => {
        this.router.navigate(['/app/dashboard']);
      }
    });

    // Keep using the original loan staff endpoint.
    this.loanService.getAllStaff().subscribe({
      next: staff => {
        this.staffList = (staff || []).map((item: any) => ({
          ...item,
          id: item.id ?? item.staffId
        }));

        this.isLoading = false;
      },
      error: () => {
        this.staffList = [];
        this.isLoading = false;
      }
    });
  }

  assign(): void {

    if (!this.selectedStaffId) {
      alert('Please select a staff member.');
      return;
    }

    this.isAssigning = true;

    this.loanService
      .assignStaffToLoan(this.loanId, this.selectedStaffId)
      .subscribe({

        next: () => {
          this.isAssigning = false;

          alert('Staff assigned successfully.');

          this.router.navigate(['/app/customer-details'], {
            queryParams: { loanId: this.loanId }
          });
        },

        error: () => {
          this.isAssigning = false;
          alert('Failed to assign staff.');
        }
      });
  }

  // ==========================================
  // STAFF ONBOARDING
  // ==========================================

  openStaffModal(content: any): void {

    this.invitationResult = null;

    this.staffForm.reset({
      name: '',
      email: '',
      nationalId: '',
      phone: '',
      department: 'Loans',
      role: 'DATA_MANAGER',
      sendEmail: false
    });

    this.modalService.open(content, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });
  }

  saveStaff(modal: any): void {

    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      return;
    }

    this.isSavingStaff = true;

    const payload = {
      name: this.staffForm.value.name.trim(),
      email: this.staffForm.value.email.trim(),
      nationalId: this.staffForm.value.nationalId.trim(),
      phone: this.staffForm.value.phone.trim(),
      department: this.staffForm.value.department.trim(),
      role: this.staffForm.value.role,
      sendEmail: this.staffForm.value.sendEmail === true
    };

    this.loanService.createStaffInvitation(payload).subscribe({

      next: response => {

        this.isSavingStaff = false;

        this.invitationResult = response;
        console.log('Staff invitation response:', response);
console.log('Generated invitation URL:', this.getInvitationUrl());

        modal.close();

        this.loadStaffOnly();

        // Invitation link remains available in the component
        // so the administrator can copy or share it.
        if (!this.getInvitationUrl()) {
          alert(
            'Staff account created, but the invitation URL was not returned by the server.'
          );
        }
      },

      error: error => {

        this.isSavingStaff = false;

        const message =
          error?.error?.message ||
          error?.error?.error ||
          'Failed to create staff invitation.';

        alert(message);
      }
    });
  }

  // ==========================================
  // STAFF DIRECTORY
  // ==========================================

  loadStaffOnly(): void {

    this.isLoading = true;

    this.loanService.getStaffDirectory().subscribe({

      next: staff => {

        this.staffList = (staff || []).map((item: any) => ({
          ...item,
          id: item.staffId ?? item.id
        }));

        this.isLoading = false;
      },

      error: error => {

        this.staffList = [];
        this.isLoading = false;

        console.error('Unable to load staff directory:', error);

        alert('Unable to load the staff directory.');
      }
    });
  }

  filteredStaff(): any[] {

    const text = this.searchText.toLowerCase().trim();

    return this.staffList.filter(staff =>
      (staff.name || '').toLowerCase().includes(text) ||
      (staff.email || '').toLowerCase().includes(text) ||
      (staff.phone || '').toLowerCase().includes(text) ||
      (staff.role || '').toLowerCase().includes(text) ||
      (staff.department || '').toLowerCase().includes(text)
    );
  }

getInvitationUrl(): string {
  if (!this.invitationResult) {
    return '';
  }

  const rawUrl =
    this.invitationResult.invitationUrl ||
    this.invitationResult.invitationLink ||
    this.invitationResult.registrationUrl ||
    this.invitationResult.link ||
    '';

  if (!rawUrl || typeof rawUrl !== 'string') {
    return '';
  }

  try {
    const parsedUrl = new URL(rawUrl);

    // An invitation must contain a token.
    const token = parsedUrl.searchParams.get('token');

    if (!token || !token.trim()) {
      console.error('Invalid invitation URL: missing token.', rawUrl);
      return '';
    }

    if (parsedUrl.pathname !== '/staff-invitation') {
      console.error('Unexpected invitation path:', parsedUrl.pathname);
      return '';
    }

    return parsedUrl.toString();

  } catch (error) {
    console.error('Invalid invitation URL returned by backend:', rawUrl);
    return '';
  }
}

async copyInvitationLink(): Promise<void> {
  const url = this.getInvitationUrl();

  if (!url) {
    alert('Invalid invitation link. Please generate a new invitation.');
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      this.copyInvitationFallback(url);
      return;
    }

    alert('Invitation link copied successfully. Share the complete link with the staff member.');

  } catch (error) {
    console.error('Clipboard error:', error);
    this.copyInvitationFallback(url);
  }
}

  private copyInvitationFallback(url: string): void {

    const textArea = document.createElement('textarea');

    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);

    textArea.select();

    try {
      document.execCommand('copy');
      alert('Invitation link copied.');
    } catch {
      alert('Unable to copy automatically. Please copy the link manually.');
    }

    document.body.removeChild(textArea);
  }

  regenerateInvitation(staff: any, sendEmail: boolean = false): void {

    if (!staff.userId) {
      alert('This staff member does not have a linked login account.');
      return;
    }

    if (staff.registrationCompleted) {
      alert('This staff member has already completed registration.');
      return;
    }

    if (!confirm('Generate a new invitation? The previous invitation will become invalid.')) {
      return;
    }

    this.isRegenerating = true;

    this.loanService.regenerateStaffInvitation(
      staff.userId,
      sendEmail
    ).subscribe({

      next: response => {

        this.isRegenerating = false;

        this.invitationResult = response;

        if (this.getInvitationUrl()) {
          alert('New invitation generated successfully. Copy and share the link.');
        } else {
          alert('Invitation generated, but no invitation URL was returned.');
        }

        this.loadStaffOnly();
      },

      error: error => {

        this.isRegenerating = false;

        alert(
          error?.error?.message ||
          'Unable to regenerate staff invitation.'
        );
      }
    });
  }

  // ==========================================
  // INVITATION DISPLAY HELPERS
  // ==========================================

  getRegistrationStatus(staff: any): string {

    return staff.registrationCompleted
      ? 'COMPLETED'
      : 'NOT COMPLETED';
  }

  getApprovalStatus(staff: any): string {

    return staff.status || 'PENDING';
  }

  getCompletedRegistrationCount(): number {
  return this.staffList.filter(
    staff => staff.registrationCompleted === true
  ).length;
}

getPendingApprovalCount(): number {
  return this.staffList.filter(
    staff => staff.status === 'PENDING'
  ).length;
}

getPendingInvitationCount(): number {
  return this.staffList.filter(
    staff => staff.invitationPending === true
  ).length;
}

}