import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MpesaService {

  constructor(private http:HttpClient) { }

  getBalance(): Observable<any> {
  return this.http.get('http://localhost:8080/api/mpesa/balance', { responseType: 'text' });
}


stkPush(payload: { phoneNumber: string; amount: string }): Observable<any> {
  return this.http.post('http://localhost:8080/api/mpesa/stkpush', payload, { responseType: 'text' });
}

}
