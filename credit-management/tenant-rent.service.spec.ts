import { TestBed } from '@angular/core/testing';

import { TenantRentService } from '../src/app/services/tenant-rent.service';

describe('TenantRentService', () => {
  let service: TenantRentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantRentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
