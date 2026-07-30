import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from '../services/auth-service.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
styleUrls: ['./sidebar.component.css'] 
})
export class SidebarComponent implements OnInit  {
role: string = '';
isCollapsed: boolean = false;


 constructor(private authService: AuthService,
    private router: Router
 ) {}

 ngOnInit(): void {
    this.role = this.authService.getRole();
  }

    toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  @Input() isMobileSidebarActive: boolean = false;

  toggleSidebarMobile() {
  this.isMobileSidebarActive = !this.isMobileSidebarActive;
}


goToAdminApprovals() {
  this.router.navigate(['/app/admin-approvals']);
}


closeSidebar() {
  this.isMobileSidebarActive = false; // only closes overlay on click
}

     /** ✅ Navigate to the statement page */
  viewStatement(): void {
    if (this.role === 'ADMIN') {
      // Admin goes to the statement query page (no userId specified)
      this.router.navigate(['/app/statement']);
    } else {
      // Applicant goes to their own statement
      const nationalId = this.authService.getNationalId();
      this.router.navigate(['/app/statement'], { queryParams: { userId: nationalId } });
    }
  }

   management(): void {
    if (this.role === 'ADMIN') {
      // Admin goes to the statement query page (no userId specified)
      this.router.navigate(['/app/management']);
    } else {
      // Applicant goes to their own statement
      const nationalId = this.authService.getNationalId();
      this.router.navigate(['/app/management'], { queryParams: { userId: nationalId } });
    }
  }


  logout(): void {
  localStorage.clear(); 
  sessionStorage.clear();
  this.router.navigate(['/app/login']);
}


}
