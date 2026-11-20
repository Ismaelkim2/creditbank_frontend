import { TestBed } from '@angular/core/testing';

import { TenantRemindersService } from '../src/app/services/tenant-reminders.service';

describe('TenantRemindersService', () => {
  let service: TenantRemindersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantRemindersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
