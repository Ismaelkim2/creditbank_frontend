import { TestBed } from '@angular/core/testing';

import { TenantDirectoryService } from '../src/app/services/tenant-directory.service';

describe('TenantDirectoryService', () => {
  let service: TenantDirectoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantDirectoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
