import { TestBed } from '@angular/core/testing';

import { TenantUnitService } from '../src/app/services/tenant-unit.service';

describe('TenantUnitService', () => {
  let service: TenantUnitService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantUnitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
