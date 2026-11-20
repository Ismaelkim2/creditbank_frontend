import { TestBed } from '@angular/core/testing';

import { TenantResidentRequestService } from '../src/app/services/tenant-resident-request.service';

describe('TenantResidentRequestService', () => {
  let service: TenantResidentRequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantResidentRequestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
