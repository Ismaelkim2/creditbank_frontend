import { Component } from '@angular/core';

@Component({
  selector: 'app-unauthorized',
  template: `
    <div class="container mt-5 text-center">
      <h2 class="text-danger">🚫 Unauthorized Access</h2>
      <p>You do not have permission to view this page.</p>
      <a routerLink="/" class="btn btn-primary mt-3">Return to Home</a>
    </div>
  `,
  styles: []
})
export class UnauthorizedComponent {}

