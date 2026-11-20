import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantRentManagementComponent } from './tenant-rent-management.component';

describe('TenantRentManagementComponent', () => {
  let component: TenantRentManagementComponent;
  let fixture: ComponentFixture<TenantRentManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantRentManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantRentManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
