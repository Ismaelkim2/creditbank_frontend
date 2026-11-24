
import { Component, Input, OnInit, HostListener } from '@angular/core';
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

  isCollapsed = true;

  private readonly desktopBreakpoint = 992;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.refreshRole();
    this.updateSidebarMode();
  }

  /**
   * Keep desktop and mobile sidebar states independent.
   */
  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateSidebarMode();
  }

  private updateSidebarMode(): void {
    if (window.innerWidth < this.desktopBreakpoint) {
      this.isCollapsed = false;
    } else {
      this.isMobileSidebarActive = false;
      this.isCollapsed = true;
    }
  }

  /**
   * Desktop hover behaviour.
   */
  expandSidebar(): void {
    if (window.innerWidth >= this.desktopBreakpoint) {
      this.isCollapsed = false;
    }
  }

  collapseSidebar(): void {
    if (window.innerWidth >= this.desktopBreakpoint) {
      this.isCollapsed = true;
    }
  }

  /**
   * Mobile drawer behaviour.
   */
  toggleMobileSidebar(): void {
    if (window.innerWidth < this.desktopBreakpoint) {
      this.isMobileSidebarActive = !this.isMobileSidebarActive;
    }
  }

  closeSidebar(): void {
    if (window.innerWidth < this.desktopBreakpoint) {
      this.isMobileSidebarActive = false;
    }
  }

  /**
   * Normalize authenticated role.
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

  /**
   * Retained for the existing collapse button.
   * Desktop hover remains the primary interaction.
   */
  toggleSidebar(): void {
    if (window.innerWidth >= this.desktopBreakpoint) {
      this.isCollapsed = !this.isCollapsed;
    }
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
