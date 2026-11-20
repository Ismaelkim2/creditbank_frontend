import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantPropertyRegistrationComponent } from './tenant-property-registration.component';

describe('TenantPropertyRegistrationComponent', () => {
  let component: TenantPropertyRegistrationComponent;
  let fixture: ComponentFixture<TenantPropertyRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantPropertyRegistrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantPropertyRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
