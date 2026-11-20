import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantLeaseManagementComponent } from './tenant-lease-management.component';

describe('TenantLeaseManagementComponent', () => {
  let component: TenantLeaseManagementComponent;
  let fixture: ComponentFixture<TenantLeaseManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantLeaseManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantLeaseManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
