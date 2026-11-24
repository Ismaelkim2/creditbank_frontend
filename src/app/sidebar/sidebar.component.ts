import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from '../services/auth-service.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {

  role = '';

  @Input() isMobileSidebarActive = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.refreshRole();
  }

  isCollapsed = true;

expandSidebar(): void {
  if (window.innerWidth >= 992) {
    this.isCollapsed = false;
  }
}

collapseSidebar(): void {
  if (window.innerWidth >= 992) {
    this.isCollapsed = true;
  }
}



toggleMobileSidebar(): void {
  this.isMobileSidebarActive = !this.isMobileSidebarActive;

  if (this.isMobileSidebarActive) {
    this.isCollapsed = false;
  } else {
    this.isCollapsed = true;
  }
}

  /**
   * Read and normalize the authenticated user's role.
   * Supports ADMIN and ROLE_ADMIN formats.
   */
  private normalizeRole(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .replace(/^ROLE_/i, '')
      .toUpperCase();
  }

  private refreshRole(): void {
    this.role = this.normalizeRole(this.authService.getRole());
  }

  get isTenantAgent(): boolean {
    return this.role === 'TENANT_AGENT';
  }

  get isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  get isCreditUser(): boolean {
    return this.role === 'ADMIN' ||
           this.role === 'DATA_MANAGER';
  }

  get dashboardRoute(): string {
    return this.isTenantAgent
      ? '/app/tenant-agent-dashboard'
      : '/app/dashboard';
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  closeSidebar(): void {
    this.isMobileSidebarActive = false;
  }

  toggleSidebarMobile(): void {
    this.isMobileSidebarActive = !this.isMobileSidebarActive;
  }

  goToAdminApprovals(): void {
    if (this.isAdmin) {
      this.router.navigate(['/app/admin-approvals']);
    }
  }

  viewStatement(): void {
    if (this.isAdmin) {
      this.router.navigate(['/app/statement']);
      return;
    }

    const nationalId = this.authService.getNationalId();

    this.router.navigate(['/app/statement'], {
      queryParams: { userId: nationalId }
    });
  }

  management(): void {
    if (this.isAdmin) {
      this.router.navigate(['/app/management']);
    }
  }

  logout(): void {
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/app/login']);
  }
}
