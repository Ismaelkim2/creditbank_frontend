import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantPortfolioActivityComponent } from './tenant-portfolio-activity.component';

describe('TenantPortfolioActivityComponent', () => {
  let component: TenantPortfolioActivityComponent;
  let fixture: ComponentFixture<TenantPortfolioActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantPortfolioActivityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantPortfolioActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
