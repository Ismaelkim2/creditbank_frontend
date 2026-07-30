import { TestBed } from '@angular/core/testing';

import { ThemeServiceService } from '../src/app/services/theme-service.service';

describe('ThemeServiceService', () => {
  let service: ThemeServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
