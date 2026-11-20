import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantRemindersComponent } from './tenant-reminders.component';

describe('TenantRemindersComponent', () => {
  let component: TenantRemindersComponent;
  let fixture: ComponentFixture<TenantRemindersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantRemindersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantRemindersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
