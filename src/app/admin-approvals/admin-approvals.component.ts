import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { Observable, Subject, debounceTime } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'PENDING' | 'DISABLED';
}

@Component({
  selector: 'app-admin-approvals',
  templateUrl: './admin-approvals.component.html',
  styleUrls: ['./admin-approvals.component.css']
})
export class AdminApprovalsComponent implements OnInit {
  pendingUsers: User[] = [];
  allUsers: User[] = [];
  approvalMessage = '';
  isLoading = false;
  processingUserId: number | null = null;

  editUserForm!: FormGroup;
  selectedUserId: number | null = null;
  successMessage = '';
  errorMessage = '';

  searchTerm = '';
  searchSubject: Subject<string> = new Subject<string>();

  constructor(private http: HttpClient,
     private router: Router,
     private fb: FormBuilder,
    private modalService: NgbModal) {}

 ngOnInit(): void {
  const token = sessionStorage.getItem('token');

  if (!token) {
    console.warn('🚫 No token found in localStorage');
    this.router.navigate(['/unauthorized']);
    return;
  }

  try {
    const decoded: any = jwtDecode(token);
    console.log('🪶 Decoded JWT:', decoded);

    // Handle various possible formats
    const role = decoded.role || decoded.roles?.[0] || decoded.authorities?.[0];
    console.log('🎭 Extracted role:', role);

    if (!role) {
      console.warn('⚠️ No role found in token');
      this.router.navigate(['/unauthorized']);
      return;
    }

    if (!role.toUpperCase().includes('ADMIN')) {
      console.warn('🚷 User is not admin — redirecting.');
      this.router.navigate(['/unauthorized']);
      return;
    }

    console.log('✅ Admin user verified — loading dashboard...');

  } catch (err) {
    console.error('❌ Error decoding token:', err);
    this.router.navigate(['/unauthorized']);
    return;
  }

  // Load data only if admin is confirmed
  this.loadPendingUsers();
  this.loadAllUsers();

  this.searchSubject.pipe(debounceTime(300))
    .subscribe(term => this.searchTerm = term.toLowerCase());

     this.editUserForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      status: ['', Validators.required]
    });
}

openEditModal(user: User, content: any) {
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



  closeModal() {
    this.modalService.dismissAll();
    this.selectedUserId = null;
    this.editUserForm.reset();
  }

saveUser(modal: any) {
  if (!this.selectedUserId || this.editUserForm.invalid) return;

  const payload = this.editUserForm.value;

  this.http.put(`/api/auth/edit/${this.selectedUserId}`, payload, {
    headers: this.getAuthHeaders()
  }).subscribe({
    next: () => {
      this.successMessage = 'User updated successfully!';
      modal.close();
      this.loadAllUsers();
    },
    error: () => {
      this.errorMessage = 'Failed to update user.';
    }
  });
}



  private getAuthHeaders(): HttpHeaders {
  const token = sessionStorage.getItem('token') || '';
  return new HttpHeaders({
    'Authorization': `Bearer ${token}`
  });
}

 loadPendingUsers(): void {
  this.isLoading = true;

  this.http.get<any>('/api/auth/users/pending', { headers: this.getAuthHeaders() })
    .subscribe({
      next: (res) => {
        this.pendingUsers = res.pendingUsers;  
        this.isLoading = false;
      },
      error: () => {
        this.approvalMessage = '🚫 Failed to load pending users.';
        this.isLoading = false;
      }
    });
}


 loadAllUsers(): void {
  this.http.get<User[]>('/api/auth/users/all', {
    headers: this.getAuthHeaders()
  }).subscribe({
    next: users => this.allUsers = users ?? [],
    error: () => console.error('Error loading all users')
  });
}


  approveUser(userId: number): void { this.processUserAction(userId, 'approve'); }
  revertUser(userId: number): void { this.processUserAction(userId, 'revert'); }
  deleteUser(userId: number): void { this.processUserAction(userId, 'delete'); }




private processUserAction(userId: number, action: 'approve' | 'revert' | 'delete') {
  if (action === 'delete' && !confirm('Are you sure you want to permanently delete this user?')) return;

  this.processingUserId = userId;
  let request$: Observable<any>;

  if (action === 'delete') {
    request$ = this.http.delete(`/api/auth/delete/${userId}`, {
      headers: this.getAuthHeaders(),
      responseType: 'text'
    });
  } else {
    request$ = this.http.put(`/api/auth/${action}/${userId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  request$.subscribe({
    next: (res) => {
      this.approvalMessage = action === 'delete'
        ? '🗑️ User deleted successfully!'
        : `✅ ${res.message}`;

      this.loadPendingUsers();
      this.loadAllUsers();
      this.processingUserId = null;
    },
    error: () => {
      this.approvalMessage = `❌ Failed to ${action} user.`;
      this.processingUserId = null;
    }
  });
}


  onSearch(value: string) { this.searchSubject.next(value); }

  filteredUsers(users: User[]): User[] {
    return users.filter(u =>
      u.name.toLowerCase().includes(this.searchTerm) ||
      u.email.toLowerCase().includes(this.searchTerm) ||
      u.role.toLowerCase().includes(this.searchTerm)
    );
  }

  filteredPendingUsers(): User[] { return this.filteredUsers(this.pendingUsers); }
  filteredAllUsers(): User[] { return this.filteredUsers(this.allUsers); }
}
