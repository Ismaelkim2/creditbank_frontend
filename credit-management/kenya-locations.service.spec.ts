import { TestBed } from '@angular/core/testing';

import { KenyaLocationsService } from '../src/app/services/services/kenya-locations.service';

describe('KenyaLocationsService', () => {
  let service: KenyaLocationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KenyaLocationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
