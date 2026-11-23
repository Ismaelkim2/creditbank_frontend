
import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, debounceTime, takeUntil, Observable } from 'rxjs';
import { Router } from '@angular/router';

import { environment } from '../../environments/environment.prod';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

type UserAction = 'delete' | 'suspend' | 'reactivate';

@Component({
  selector: 'app-admin-approvals',
  templateUrl: './admin-approvals.component.html',
  styleUrls: ['./admin-approvals.component.css']
})
export class AdminApprovalsComponent implements OnInit, OnDestroy {

  private readonly baseUrl = `${environment.apiUrl}/auth`;
  private readonly destroy$ = new Subject<void>();

  // USER DATA
  pendingUsers: User[] = [];
  allUsers: User[] = [];
  staffUsers: User[] = [];
  customers: User[] = [];

  // FILTERED DATA
  filteredPending: User[] = [];
  filteredStaff: User[] = [];
  filteredCustomers: User[] = [];

  // MESSAGES
  approvalMessage = '';
  successMessage = '';
  errorMessage = '';

  // LOADING
  isLoading = false;
  isSavingUser = false;
  processingUserId: number | null = null;

  // EDIT FORM
  editUserForm!: FormGroup;
  selectedUserId: number | null = null;

  // SEARCH
  searchSubject = new Subject<string>();
  searchTerm = '';

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private modalService: NgbModal,
    private router: Router
  ) {}

  // ==========================================
  // INITIALIZATION
  // ==========================================

  ngOnInit(): void {
    this.initForm();
    this.initSearch();

    this.loadPendingUsers();
    this.loadAllUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==========================================
  // HTTP HEADERS
  // ==========================================

  private getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');

    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  get suspendedUsersCount(): number {
    return this.allUsers.filter(
      user => user.status === 'SUSPENDED'
    ).length;
  }

  // ==========================================
  // FORM
  // ==========================================

  private initForm(): void {
    this.editUserForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(2)
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      role: ['', Validators.required],
      status: ['', Validators.required]
    });
  }

  // ==========================================
  // SEARCH
  // ==========================================

  private initSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(term => {
        this.searchTerm = term.trim().toLowerCase();
        this.applyFilter();
      });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value || '');
  }

  // ==========================================
  // FILTERING
  // ==========================================

  private matchesSearch(user: User, term: string): boolean {
    if (!term) {
      return true;
    }

    return (
      (user.name || '').toLowerCase().includes(term) ||
      (user.email || '').toLowerCase().includes(term) ||
      (user.role || '').toLowerCase().includes(term) ||
      (user.status || '').toLowerCase().includes(term)
    );
  }

  applyFilter(): void {
    const term = this.searchTerm;

    this.filteredPending = this.pendingUsers.filter(user =>
      this.matchesSearch(user, term)
    );

    this.filteredStaff = this.staffUsers.filter(user =>
      this.matchesSearch(user, term)
    );

    // Pending customers appear in Pending Approvals only.
    this.filteredCustomers = this.customers.filter(user =>
      user.status !== 'PENDING' &&
      this.matchesSearch(user, term)
    );
  }

  // ==========================================
  // LOAD PENDING USERS
  // ==========================================

  loadPendingUsers(): void {
    this.isLoading = true;

    this.http.get<any>(
      `${this.baseUrl}/users/pending`,
      { headers: this.getHeaders() }
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({

      next: response => {
        const users = Array.isArray(response)
          ? response
          : response?.pendingUsers || [];

        this.pendingUsers = users;
        this.applyFilter();
        this.isLoading = false;
      },

      error: error => {
        console.error('Failed to load pending users:', error);

        this.pendingUsers = [];
        this.applyFilter();
        this.isLoading = false;

        this.approvalMessage =
          error?.error?.message ||
          'Unable to load pending users.';
      }

    });
  }

  // ==========================================
  // LOAD ALL USERS
  // ==========================================

  loadAllUsers(): void {
    this.http.get<any>(
      `${this.baseUrl}/users/all`,
      { headers: this.getHeaders() }
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({

      next: response => {
        const users: User[] = Array.isArray(response)
          ? response
          : response?.users || response?.data || [];

        this.allUsers = users;

        this.staffUsers = users.filter(user =>
          ['ADMIN', 'DATA_MANAGER', 'TENANT_AGENT'].includes(user.role)
        );

        this.customers = users.filter(user =>
          user.role === 'APPLICANT'
        );

        this.applyFilter();
      },

      error: error => {
        console.error('Failed to load users:', error);

        this.allUsers = [];
        this.staffUsers = [];
        this.customers = [];

        this.applyFilter();

        this.approvalMessage =
          error?.error?.message ||
          'Unable to load user accounts.';
      }

    });
  }

  // ==========================================
  // STATUS BADGES
  // ==========================================

  getStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'bg-success';

      case 'PENDING':
        return 'bg-warning text-dark';

      case 'SUSPENDED':
        return 'bg-danger';

      case 'REJECTED':
        return 'bg-secondary';

      default:
        return 'bg-light text-dark';
    }
  }

  // ==========================================
  // APPROVE USER
  // ==========================================

  approveUser(user: User): void {
    if (this.processingUserId !== null) {
      return;
    }

    const confirmed = confirm(
      `Approve the account belonging to ${user.name}?`
    );

    if (!confirmed) {
      return;
    }

    this.processingUserId = user.id;
    this.approvalMessage = '';

    this.http.put<any>(
      `${this.baseUrl}/approve/${user.id}`,
      {},
      { headers: this.getHeaders() }
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({

      next: response => {
        this.approvalMessage =
          response?.message || 'User approved successfully.';

        this.refreshUsers();
      },

      error: error => {
        console.error('Approval failed:', error);

        this.approvalMessage =
          error?.error?.message || 'Failed to approve user.';

        this.processingUserId = null;
      }

    });
  }

  // ==========================================
  // SUSPEND USER
  // ==========================================

  suspendUser(user: User): void {
    const confirmed = confirm(
      `Suspend ${user.name}?\n\n` +
      'The user will no longer be able to log in.'
    );

    if (!confirmed) {
      return;
    }

    this.executeUserAction(
      user,
      'suspend',
      'User account suspended successfully.'
    );
  }

  // ==========================================
  // REACTIVATE USER
  // ==========================================

  reactivateUser(user: User): void {
    const confirmed = confirm(
      `Reactivate ${user.name}?\n\n` +
      'Confirm that the outstanding subscription payment has been received.'
    );

    if (!confirmed) {
      return;
    }

    this.executeUserAction(
      user,
      'reactivate',
      'User account reactivated successfully.'
    );
  }

  // ==========================================
  // DELETE USER
  // ==========================================

  deleteUser(user: User): void {
    const confirmed = confirm(
      `PERMANENT DELETION\n\n` +
      `Are you sure you want to permanently delete ${user.name}?\n\n` +
      'This action cannot be undone. Accounts linked to financial records may not be deleted.'
    );

    if (!confirmed) {
      return;
    }

    this.executeUserAction(
      user,
      'delete',
      'User permanently deleted successfully.'
    );
  }

  // ==========================================
  // COMMON USER ACTION
  // ==========================================

  private executeUserAction(
    user: User,
    action: UserAction,
    successText: string
  ): void {

    if (this.processingUserId !== null) {
      return;
    }

    this.processingUserId = user.id;
    this.approvalMessage = '';

    let request: Observable<any>;

    if (action === 'delete') {
      request = this.http.delete<any>(
        `${this.baseUrl}/delete/${user.id}`,
        { headers: this.getHeaders() }
      );
    } else {
      request = this.http.put<any>(
        `${this.baseUrl}/${action}/${user.id}`,
        {},
        { headers: this.getHeaders() }
      );
    }

    request
      .pipe(takeUntil(this.destroy$))
      .subscribe({

        next: response => {
          this.approvalMessage =
            response?.message || successText;

          this.refreshUsers();
        },

        error: error => {
          console.error(`Failed to ${action} user:`, error);

          this.approvalMessage =
            error?.error?.message ||
            `Failed to ${action} user. Please try again.`;

          this.processingUserId = null;
        }

      });
  }

  // ==========================================
  // REFRESH USERS
  // ==========================================

  private refreshUsers(): void {
    this.processingUserId = null;

    this.loadPendingUsers();
    this.loadAllUsers();
  }

  // ==========================================
  // EDIT USER
  // ==========================================

  openEditModal(user: User, content: any): void {
    this.selectedUserId = user.id;

    this.successMessage = '';
    this.errorMessage = '';

    this.editUserForm.reset();

    this.editUserForm.patchValue({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });

    this.modalService.open(content, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false
    });
  }

  // ==========================================
  // SAVE USER
  // ==========================================

  saveUser(modal: any): void {
    if (!this.selectedUserId) {
      this.errorMessage = 'No user selected.';
      return;
    }

    if (this.editUserForm.invalid) {
      this.editUserForm.markAllAsTouched();
      return;
    }

    if (this.isSavingUser) {
      return;
    }

    this.isSavingUser = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.put<any>(
      `${this.baseUrl}/edit/${this.selectedUserId}`,
      this.editUserForm.getRawValue(),
      { headers: this.getHeaders() }
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({

      next: response => {
        this.successMessage =
          response?.message || 'User updated successfully.';

        this.isSavingUser = false;
        this.approvalMessage = this.successMessage;

        modal.close();

        this.selectedUserId = null;

        this.loadAllUsers();
        this.loadPendingUsers();
      },

      error: error => {
        console.error('User update failed:', error);

        this.errorMessage =
          error?.error?.message ||
          'Unable to update user. Please try again.';

        this.isSavingUser = false;
      }

    });
  }

  // ==========================================
  // CUSTOMER ONBOARDING
  // ==========================================

  openOnboardUser(): void {
    this.router.navigate(['/app/accountsopening']);
  }

  // ==========================================
  // STAFF ONBOARDING
  // ==========================================

  openOnboardStaff(): void {
    this.router.navigate(
      ['/app/assign-staff'],
      {
        queryParams: {
          mode: 'onboard'
        }
      }
    );
  }

}
