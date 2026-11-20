import { TestBed } from '@angular/core/testing';

import { TenantDashboardService } from './tenant-dashboard.service';

describe('TenantDashboardService', () => {
  let service: TenantDashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantDashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
