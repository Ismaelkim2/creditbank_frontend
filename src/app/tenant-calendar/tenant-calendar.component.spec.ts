import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantCalendarComponent } from './tenant-calendar.component';

describe('TenantCalendarComponent', () => {
  let component: TenantCalendarComponent;
  let fixture: ComponentFixture<TenantCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantCalendarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
