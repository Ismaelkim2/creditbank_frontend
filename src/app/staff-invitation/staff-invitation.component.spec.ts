import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffInvitationComponent } from './staff-invitation.component';

describe('StaffInvitationComponent', () => {
  let component: StaffInvitationComponent;
  let fixture: ComponentFixture<StaffInvitationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffInvitationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffInvitationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
