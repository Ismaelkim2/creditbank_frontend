import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepaymentFormComponent } from './repayment-form.component';

describe('RepaymentFormComponent', () => {
  let component: RepaymentFormComponent;
  let fixture: ComponentFixture<RepaymentFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RepaymentFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RepaymentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
