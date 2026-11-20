import { TestBed } from '@angular/core/testing';

import { TenantLeaseService } from '../src/app/services/tenant-lease.service';

describe('TenantLeaseService', () => {
  let service: TenantLeaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantLeaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
