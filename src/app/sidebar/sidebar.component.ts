import { Component, OnInit } from '@angular/core';
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
isMobileSidebarActive = false;


 constructor(private authService: AuthService,
    private router: Router
 ) {}

 ngOnInit(): void {
    this.role = this.authService.getRole();
  }

    toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleSidebarMobile() {
  this.isMobileSidebarActive = !this.isMobileSidebarActive;
}


     /** ✅ Navigate to the statement page */
  viewStatement(): void {
    if (this.role === 'ADMIN') {
      // Admin goes to the statement query page (no userId specified)
      this.router.navigate(['/statement']);
    } else {
      // Applicant goes to their own statement
      const nationalId = this.authService.getNationalId();
      this.router.navigate(['/statement'], { queryParams: { userId: nationalId } });
    }
  }


}
