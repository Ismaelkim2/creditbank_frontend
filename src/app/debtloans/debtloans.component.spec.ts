import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebtloansComponent } from './debtloans.component';

describe('DebtloansComponent', () => {
  let component: DebtloansComponent;
  let fixture: ComponentFixture<DebtloansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebtloansComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DebtloansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
