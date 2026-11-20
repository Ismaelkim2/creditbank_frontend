import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantAgentDashboardComponent } from './tenant-agent-dashboard.component';

describe('TenantAgentDashboardComponent', () => {
  let component: TenantAgentDashboardComponent;
  let fixture: ComponentFixture<TenantAgentDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantAgentDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantAgentDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
