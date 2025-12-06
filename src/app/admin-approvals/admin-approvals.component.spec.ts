import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAprovalsComponent } from './admin-approvals.component';

describe('AdminAprovalsComponent', () => {
  let component: AdminAprovalsComponent;
  let fixture: ComponentFixture<AdminAprovalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminAprovalsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminAprovalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
