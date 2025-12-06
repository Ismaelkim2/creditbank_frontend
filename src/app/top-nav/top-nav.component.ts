import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AuthService } from '../services/auth-service.service';
import { AccountService } from '../services/account.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-top-nav',
  templateUrl: './top-nav.component.html',
  styleUrls: ['./top-nav.component.css']
})
export class TopNavComponent implements OnInit {
  @Output() sidebarToggle = new EventEmitter<void>();

  showSearch = false;
  showDropdown = false;

  username: string = '';
  imageUrl: string = 'assets/default-user.png'; // default local image

  private readonly baseUrl = 'http://localhost:8080/';

  constructor(
    private authService: AuthService,
    private accountService: AccountService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserDetails();
  }

  private loadUserDetails() {
    const user = this.authService.getUser();

    if (!user) {
      this.loadFromBackend();
      return;
    }

    this.username = user.name || '';

    // If session already has backend image URL
    if (user.imageUrl && user.imageUrl.startsWith("uploads")) {
      this.imageUrl = this.baseUrl + user.imageUrl;
      return;
    }

    // Otherwise use local default
    this.imageUrl = 'assets/default-user.png';

    // Fetch fresh data using national ID
    if (user.nationalId) {
      this.accountService.getAccountDetailsByNationalId(user.nationalId)
        .subscribe({
          next: (res: any) => {
            this.username = res.fullName || this.username;

            // Only prepend baseUrl if backend returned a real uploaded image
            if (res.imageUrl) {
              this.imageUrl = this.baseUrl + res.imageUrl;
              sessionStorage.setItem('imageUrl', res.imageUrl);
            } else {
              this.imageUrl = 'assets/default-user.png';
              sessionStorage.setItem('imageUrl', '');
            }

            sessionStorage.setItem('username', this.username);
          },
          error: () => {
            this.imageUrl = 'assets/default-user.png';
          }
        });
    }
  }

  private loadFromBackend() {
    this.authService.getLoggedInUser().subscribe({
      next: (res: any) => {
        this.username = res.fullName || '';

        if (res.imageUrl) {
          this.imageUrl = this.baseUrl + res.imageUrl;
          sessionStorage.setItem('imageUrl', res.imageUrl);
        } else {
          this.imageUrl = 'assets/default-user.png';
          sessionStorage.setItem('imageUrl', '');
        }

        sessionStorage.setItem('username', this.username);
      },
      error: () => {
        this.imageUrl = 'assets/default-user.png';
      }
    });
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  toggleSidebar() {
    this.sidebarToggle.emit();
  }

  signOut() {
    this.authService.logout();
    this.username = '';
    this.imageUrl = 'assets/default-user.png';
  }
}
