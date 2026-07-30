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

  searchText = '';

  staffForm!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private loanService: LoanService,
    private router: Router,
    private fb: FormBuilder,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {

    // Staff onboarding form
    this.staffForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      department: ['Loans']
    });

    // Get loan ID from query params
   this.route.queryParams.subscribe(params => {

  const mode = params['mode'];

  if (mode === 'onboard') {

    this.isOnboardingOnly = true;

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

  loadData(): void {

    this.isLoading = true;

    this.loanService.getLoanById(this.loanId).subscribe({
      next: (loan) => {
        this.loan = loan;
      },
      error: () => {
        this.router.navigate(['/app/dashboard']);
      }
    });

    this.loanService.getAllStaff().subscribe({
      next: (staff) => {
        this.staffList = staff || [];
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
      alert('Please select a staff member');
      return;
    }

    this.isAssigning = true;

    this.loanService
      .assignStaffToLoan(this.loanId, this.selectedStaffId)
      .subscribe({
        next: () => {

          this.isAssigning = false;

          alert('Staff assigned successfully');

          this.router.navigate(['/app/customer-details'], {
            queryParams: { loanId: this.loanId }
          });
        },
        error: () => {
          this.isAssigning = false;
          alert('Failed to assign staff');
        }
      });
  }

  openStaffModal(content: any): void {

    this.staffForm.reset({
      department: 'Loans'
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

    this.loanService.createStaff(this.staffForm.value)
      .subscribe({

        next: () => {

          modal.close();

          alert('Staff created successfully');

          // Reload staff list
          this.loanService.getAllStaff()
            .subscribe(data => {
              this.staffList = data || [];
            });
        },

        error: () => {
          alert('Failed to create staff');
        }
      });
  }

  loadStaffOnly(): void {

  this.isLoading = true;

  this.loanService.getAllStaff().subscribe({
    next: (staff) => {

      this.staffList = staff || [];
      this.isLoading = false;

    },
    error: () => {

      this.staffList = [];
      this.isLoading = false;

    }
  });

}

  filteredStaff(): any[] {

    const text = this.searchText.toLowerCase().trim();

    return this.staffList.filter(staff =>
      (staff.name || '').toLowerCase().includes(text) ||
      (staff.email || '').toLowerCase().includes(text) ||
      (staff.phone || '').toLowerCase().includes(text)
    );
  }
}