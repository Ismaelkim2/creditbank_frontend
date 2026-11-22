import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Account } from '../../models/User.model';
import { environment } from '../../environments/environment';
import { AuthService } from './auth-service.service';

@Injectable({
    providedIn: 'root'
})
export class AccountService {

    private accountsUrl = `${environment.apiUrl}/accounts`;
    private activityUrl = `${environment.apiUrl}/activity`;
    private passwordUrl = `${environment.apiUrl}/auth/change-password`;
    private statementsUrl = `${environment.apiUrl}/statements`;
    private loansUrl = `${environment.apiUrl}/loans`;
    private locationsUrl = `${environment.apiUrl}/locations`;

    constructor(
        private http: HttpClient,
         private authService: AuthService
           ) {}


   private getHeaders(): HttpHeaders {

  const token = this.authService.getToken();

  let headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  if (token) {
    headers = headers.set(
      'Authorization',
      `Bearer ${token}`
    );
  }

  return headers;
}
   

 
   private getMultipartHeaders(): HttpHeaders {

  const token = this.authService.getToken();

  let headers = new HttpHeaders();

  if (token) {
    headers = headers.set(
      'Authorization',
      `Bearer ${token}`
    );
  }

  return headers;
}


    getAccountDetailsByNationalId(
        nationalId: string
    ): Observable<any> {

        return this.http.get<any>(
            `${this.accountsUrl}/by-id/${encodeURIComponent(nationalId)}`,
            {
                headers: this.getHeaders()
            }
        );
    }



    getByNationalId(
        nationalId: string
    ): Observable<any> {

        return this.http.get<any>(
            `${this.accountsUrl}/by-id/${encodeURIComponent(nationalId)}`,
            {
                headers: this.getHeaders()
            }
        );
    }



    getCustomerProfile(
        accountNumber: string
    ): Observable<any> {

        return this.http.get<any>(
            `${this.accountsUrl}/profile/${encodeURIComponent(accountNumber)}`,
            {
                headers: this.getHeaders()
            }
        );
    }



    createAccount(
        formData: FormData
    ): Observable<any> {

        return this.http.post<any>(
            `${this.accountsUrl}/register`,
            formData,
            {
                headers: this.getMultipartHeaders()
            }
        );
    }



    getAllAccounts(): Observable<Account[]> {

        return this.http.get<Account[]>(
            `${this.accountsUrl}`,
            {
                headers: this.getHeaders()
            }
        );
    }



    getAccountsByStatus(
        status: string
    ): Observable<Account[]> {

        return this.http.get<Account[]>(
            `${this.accountsUrl}/status/${encodeURIComponent(
                status.toUpperCase()
            )}`,
            {
                headers: this.getHeaders()
            }
        );
    }


    closeAccount(
        accountNumber: string,
        reason: string
    ): Observable<any> {

        return this.http.put<any>(
            `${this.accountsUrl}/${encodeURIComponent(accountNumber)}/close`,
            {
                reason: reason
            },
            {
                headers: this.getHeaders()
            }
        );
    }


    getByPhoneNumber(
        phone: string
    ): Observable<any> {

        return this.http.get<any>(
            `${this.accountsUrl}/phone/${encodeURIComponent(phone)}`,
            {
                headers: this.getHeaders()
            }
        );
    }


    getByEmail(
        email: string
    ): Observable<any> {

        return this.http.get<any>(
            `${this.accountsUrl}/email/${encodeURIComponent(email)}`,
            {
                headers: this.getHeaders()
            }
        );
    }


    updateUserProfile(
        payload: any
    ): Observable<any> {

        return this.http.put<any>(
            `${this.accountsUrl}/updateProfile`,
            payload,
            {
                headers: this.getHeaders()
            }
        );
    }


    updateProfile(
        payload: any
    ): Observable<any> {

        return this.updateUserProfile(payload);
    }


    changePassword(
        payload: any
    ): Observable<any> {

        return this.http.put<any>(
            this.passwordUrl,
            payload,
            {
                headers: this.getHeaders()
            }
        );
    }


    getUserActivity(
        page: number,
        query: string
    ): Observable<any[]> {

        let params = new HttpParams()
            .set('page', page.toString());

        if (query && query.trim()) {

            params = params.set(
                'q',
                query.trim()
            );
        }

        return this.http.get<any[]>(
            `${this.activityUrl}/user`,
            {
                headers: this.getHeaders(),
                params: params
            }
        );
    }


    getCounties(): Observable<any[]> {

        return this.http.get<any[]>(
            `${this.locationsUrl}/counties`,
            {
                headers: this.getHeaders()
            }
        );
    }


    getTowns(
        countyCode: string
    ): Observable<any[]> {

        return this.http.get<any[]>(
            `${this.locationsUrl}/counties/${encodeURIComponent(countyCode)}/towns`,
            {
                headers: this.getHeaders()
            }
        );
    }


    saveStatement(
        nationalId: string,
        transactions: any[]
    ): Observable<any> {

        return this.http.post<any>(
            `${this.statementsUrl}/${encodeURIComponent(nationalId)}`,
            transactions,
            {
                headers: this.getHeaders()
            }
        );
    }


    getStatements(
        nationalId: string
    ): Observable<any[]> {

        return this.http.get<any[]>(
            `${this.statementsUrl}/${encodeURIComponent(nationalId)}`,
            {
                headers: this.getHeaders()
            }
        );
    }


    getLoanDetailsByNationalId(
        nationalId: string
    ): Observable<any[]> {

        return this.http.get<any[]>(
            `${this.loansUrl}/by-nationalId/${encodeURIComponent(nationalId)}`,
            {
                headers: this.getHeaders()
            }
        );
    }


    uploadAccountDocument(
        accountId: number,
        file: File,
        documentType: string,
        uploadedBy?: string
    ): Observable<any> {

        const formData = new FormData();

        formData.append(
            'file',
            file
        );

        formData.append(
            'documentType',
            documentType
        );

        if (uploadedBy) {

            formData.append(
                'uploadedBy',
                uploadedBy
            );
        }

        return this.http.post<any>(
            `${this.accountsUrl}/${accountId}/documents`,
            formData,
            {
                headers: this.getMultipartHeaders()
            }
        );
    }


    uploadOrganizationDocument(
        accountId: number,
        file: File,
        documentType: string
    ): Observable<any> {

        const formData = new FormData();

        formData.append(
            'file',
            file
        );

        formData.append(
            'documentType',
            documentType
        );

        return this.http.post<any>(
            `${this.accountsUrl}/${accountId}/organization-documents`,
            formData,
            {
                headers: this.getMultipartHeaders()
            }
        );
    }


    getOrganizationDocuments(
        accountId: number
    ): Observable<any> {

        return this.http.get<any>(
            `${this.accountsUrl}/${accountId}/organization-documents`,
            {
                headers: this.getHeaders()
            }
        );
    }



    getOrganizationDocumentViewUrl(
        accountId: number,
        documentId: number
    ): string {

        return `${this.accountsUrl}/${accountId}` +
            `/organization-documents/${documentId}/view`;
    }



    getOrganizationDocumentDownloadUrl(
        accountId: number,
        documentId: number
    ): string {

        return `${this.accountsUrl}/${accountId}` +
            `/organization-documents/${documentId}/download`;
    }


    viewOrganizationDocument(
        accountId: number,
        documentId: number
    ): Observable<Blob> {

        return this.http.get(
            this.getOrganizationDocumentViewUrl(
                accountId,
                documentId
            ),
            {
                headers: this.getHeaders(),
                responseType: 'blob'
            }
        );
    }


    saveOrganizationPeople(
        accountId: number,
        people: any[]
    ): Observable<any> {

        return this.http.post<any>(
            `${this.accountsUrl}/${accountId}/organization-people`,
            people,
            {
                headers: this.getHeaders()
            }
        );
    }


    
    
    
}