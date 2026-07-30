import { Component, OnInit } from '@angular/core';
import { AuthService } from './../services/auth-service.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {

  isMobileSidebarActive = false;

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    // console.log('LAYOUT ROLE:', this.role);
  }

  // SINGLE SOURCE OF TRUTH
  get role(): string | null {
    return this.authService.getRole();
  }

  toggleSidebarMobile(): void {
    this.isMobileSidebarActive = !this.isMobileSidebarActive;
  }
}