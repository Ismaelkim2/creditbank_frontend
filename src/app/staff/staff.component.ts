import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { jwtDecode } from 'jwt-decode';
import { debounceTime, Subject, Observable } from 'rxjs';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'PENDING' | 'DISABLED';
}

@Component({
  selector: 'app-staff',
  templateUrl: './staff.component.html',
  styleUrls: ['./staff.component.css']
})
export class StaffComponent implements OnInit {

  private baseUrl = 'http://localhost:8080/api/auth';

  pendingUsers: User[] = [];
  allUsers: User[] = [];

  approvalMessage = '';
  successMessage = '';
  errorMessage = '';

  isLoading = false;
  processingUserId: number | null = null;

  editUserForm!: FormGroup;
  selectedUserId: number | null = null;

  searchTerm = '';
  searchSubject: Subject<string> = new Subject<string>();

  constructor(
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    const token = sessionStorage.getItem('token');

    if (!token) {
      this.router.navigate(['/unauthorized']);
      return;
    }

    if (!this.isAdmin(token)) {
      this.router.navigate(['/unauthorized']);
      return;
    }

    this.initializeForm();
    this.initializeSearch();

    this.loadPendingUsers();
    this.loadAllUsers();
  }

  private isAdmin(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);

      const role =
        decoded.role ||
        decoded.roles?.[0] ||
        decoded.authorities?.[0];

      return role?.toString().toUpperCase().includes('ADMIN');
    } catch (error) {
      console.error('JWT decode error:', error);
      return false;
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private initializeForm(): void {
    this.editUserForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      status: ['', Validators.required]
    });
  }

  private initializeSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300)
    ).subscribe(term => {
      this.searchTerm = term.toLowerCase();
    });
  }

  loadPendingUsers(): void {
    this.isLoading = true;

    this.http.get<any>(`${this.baseUrl}/users/pending`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (res) => {
        this.pendingUsers = res?.pendingUsers ?? [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading pending users', err);
        this.approvalMessage = 'Failed to load pending users.';
        this.isLoading = false;
      }
    });
  }

  loadAllUsers(): void {
    this.http.get<User[]>(`${this.baseUrl}/users/all`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (users) => {
        this.allUsers = users ?? [];
      },
      error: (err) => {
        console.error('Error loading all users', err);
      }
    });
  }

  openEditModal(user: User, content: any): void {
    this.selectedUserId = user.id;

    this.editUserForm.patchValue({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });

    this.modalService.open(content, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });
  }

  closeModal(): void {
    this.modalService.dismissAll();
    this.selectedUserId = null;
    this.editUserForm.reset();
  }

  saveUser(modal: any): void {
    if (!this.selectedUserId || this.editUserForm.invalid) return;

    this.http.put(
      `${this.baseUrl}/edit/${this.selectedUserId}`,
      this.editUserForm.value,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: () => {
        this.successMessage = 'User updated successfully!';
        modal.close();
        this.loadAllUsers();
      },
      error: (err) => {
        console.error('Update failed', err);
        this.errorMessage = 'Failed to update user.';
      }
    });
  }

  approveUser(userId: number): void {
    this.processUserAction(userId, 'approve');
  }

  revertUser(userId: number): void {
    this.processUserAction(userId, 'revert');
  }

  deleteUser(userId: number): void {
    this.processUserAction(userId, 'delete');
  }

  private processUserAction(
    userId: number,
    action: 'approve' | 'revert' | 'delete'
  ): void {

    if (action === 'delete' &&
        !confirm('Are you sure you want to permanently delete this user?')) {
      return;
    }

    this.processingUserId = userId;

    let request$: Observable<any>;

    if (action === 'delete') {
      request$ = this.http.delete(
        `${this.baseUrl}/delete/${userId}`,
        {
          headers: this.getAuthHeaders(),
          responseType: 'text'
        }
      );
    } else {
      request$ = this.http.put(
        `${this.baseUrl}/${action}/${userId}`,
        {},
        { headers: this.getAuthHeaders() }
      );
    }

    request$.subscribe({
      next: (res: any) => {
        this.approvalMessage =
          action === 'delete'
            ? 'User deleted successfully.'
            : res?.message ?? 'Action completed successfully.';

        this.loadPendingUsers();
        this.loadAllUsers();
        this.processingUserId = null;
      },
      error: (err) => {
        console.error(`${action} failed`, err);
        this.approvalMessage = `Failed to ${action} user.`;
        this.processingUserId = null;
      }
    });
  }

  onSearch(value: string): void {
    this.searchSubject.next(value);
  }

  filteredUsers(users: User[]): User[] {
    return users.filter(u =>
      u.name.toLowerCase().includes(this.searchTerm) ||
      u.email.toLowerCase().includes(this.searchTerm) ||
      u.role.toLowerCase().includes(this.searchTerm)
    );
  }

  filteredPendingUsers(): User[] {
    return this.filteredUsers(this.pendingUsers);
  }

  filteredAllUsers(): User[] {
    return this.filteredUsers(this.allUsers);
  }
}