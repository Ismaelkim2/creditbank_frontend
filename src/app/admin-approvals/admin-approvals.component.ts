import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, debounceTime } from 'rxjs';
import { Router } from '@angular/router';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

@Component({
  selector: 'app-admin-approvals',
  templateUrl: './admin-approvals.component.html',
  styleUrls: ['./admin-approvals.component.css']
})
export class AdminApprovalsComponent implements OnInit {

  private baseUrl = 'http://localhost:8080/api/auth';

  pendingUsers: User[] = [];
  allUsers: User[] = [];
  staffUsers: User[] = [];
  customers: User[] = [];

  filteredPending: User[] = [];
  filteredStaff: User[] = [];
  filteredCustomers: User[] = [];

  approvalMessage = '';
  successMessage = '';
  errorMessage = '';

  isLoading = false;
  processingUserId: number | null = null;

  editUserForm!: FormGroup;
  selectedUserId: number | null = null;

  searchSubject = new Subject<string>();
  searchTerm = '';

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private modalService: NgbModal,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.initSearch();
    this.loadPendingUsers();
    this.loadAllUsers();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${sessionStorage.getItem('token')}`
    });
  }

  // FORM
  initForm(): void {
    this.editUserForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      status: ['', Validators.required]
    });
  }

  // SEARCH
  initSearch(): void {
    this.searchSubject.pipe(debounceTime(300))
      .subscribe(term => {
        this.searchTerm = term.toLowerCase();
        this.applyFilter();
      });
  }

 onSearch(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  this.searchSubject.next(value);
}
  // FILTER
  applyFilter(): void {
    const term = this.searchTerm;

    this.filteredPending = this.pendingUsers.filter(u =>
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );

    this.filteredStaff = this.staffUsers.filter(u =>
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );

    this.filteredCustomers = this.customers.filter(u =>
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  }

  // LOAD
  loadPendingUsers(): void {
    this.isLoading = true;

    this.http.get<any>(`${this.baseUrl}/users/pending`, {
      headers: this.getHeaders()
    }).subscribe(res => {
      this.pendingUsers = res?.pendingUsers || [];
      this.applyFilter();
      this.isLoading = false;
    });
  }

  loadAllUsers(): void {
    this.http.get<User[]>(`${this.baseUrl}/users/all`, {
      headers: this.getHeaders()
    }).subscribe(users => {

      this.allUsers = users || [];

      this.staffUsers = users.filter(u =>
        u.role === 'ADMIN' || u.role === 'STAFF'
      );

      this.customers = users.filter(u =>
        u.role === 'USER'
      );

      this.applyFilter();
    });
  }

  // ACTIONS
  approveUser(id: number) {
    this.process(id, 'approve');
  }

  deleteUser(id: number) {
    if (!confirm('Delete user?')) return;
    this.process(id, 'delete');
  }

  revertUser(id: number): void {

  const confirmRevert = confirm('Revert this user back to pending status?');

  if (!confirmRevert) return;

  this.processingUserId = id;

  this.http.put(
    `${this.baseUrl}/revert/${id}`,
    {}, // empty body
    { headers: this.getHeaders() }
  ).subscribe({
    next: (res: any) => {

      this.approvalMessage = res?.message || 'User reverted successfully';

      // refresh all data
      this.loadPendingUsers();
      this.loadAllUsers();

      this.processingUserId = null;
    },

    error: (err) => {
      console.error(err);
      this.approvalMessage = 'Failed to revert user';
      this.processingUserId = null;
    }
  });
}

  private process(id: number, action: string): void {

    this.processingUserId = id;

    let req;

    if (action === 'delete') {
      req = this.http.delete(`${this.baseUrl}/delete/${id}`, {
        headers: this.getHeaders()
      });
    } else {
      req = this.http.put(`${this.baseUrl}/${action}/${id}`, {}, {
        headers: this.getHeaders()
      });
    }

    req.subscribe({
      next: () => {
        this.approvalMessage = `User ${action} successful`;
        this.loadPendingUsers();
        this.loadAllUsers();
        this.processingUserId = null;
      },
      error: () => {
        this.approvalMessage = `Failed to ${action}`;
        this.processingUserId = null;
      }
    });
  }

  // EDIT
  openEditModal(user: User, content: any): void {
    this.selectedUserId = user.id;

    this.editUserForm.patchValue(user);

    this.modalService.open(content, {
      size: 'lg',
      centered: true
    });
  }

  saveUser(modal: any): void {

    if (!this.selectedUserId) return;

    this.http.put(
      `${this.baseUrl}/edit/${this.selectedUserId}`,
      this.editUserForm.value,
      { headers: this.getHeaders() }
    ).subscribe(() => {
      this.successMessage = 'Updated successfully';
      modal.close();
      this.loadAllUsers();
    });
  }


  openOnboardUser(): void {
  this.router.navigate(['/app/accountsopening'])
}

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