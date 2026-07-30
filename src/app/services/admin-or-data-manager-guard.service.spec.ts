import { TestBed } from '@angular/core/testing';

import { AdminOrDataManagerGuardService } from './admin-or-data-manager-guard.service';

describe('AdminOrDataManagerGuardService', () => {
  let service: AdminOrDataManagerGuardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminOrDataManagerGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
