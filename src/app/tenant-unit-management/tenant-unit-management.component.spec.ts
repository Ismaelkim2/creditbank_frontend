import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantUnitManagementComponent } from './tenant-unit-management.component';

describe('TenantUnitManagementComponent', () => {
  let component: TenantUnitManagementComponent;
  let fixture: ComponentFixture<TenantUnitManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantUnitManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantUnitManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
