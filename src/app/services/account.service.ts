import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Account } from '../../models/User.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AccountService {

    // ============================================================
    // API BASE URLS
    // ============================================================

    private accountsUrl = `${environment.apiUrl}/accounts`;
    private activityUrl = `${environment.apiUrl}/activity`;
    private passwordUrl = `${environment.apiUrl}/auth/change-password`;
    private statementsUrl = `${environment.apiUrl}/statements`;
    private loansUrl = `${environment.apiUrl}/loans`;
    private locationsUrl = `${environment.apiUrl}/locations`;

    constructor(
        private http: HttpClient
    ) {}

    // ============================================================
    // AUTHORIZATION HEADER
    // ============================================================

    private getHeaders(): HttpHeaders {

        const token = sessionStorage.getItem('token');

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

    /**
     * Headers for multipart/form-data.
     *
     * IMPORTANT:
     * Do NOT manually set Content-Type here.
     * Browser must create the multipart boundary.
     */
    private getMultipartHeaders(): HttpHeaders {

        const token = sessionStorage.getItem('token');

        let headers = new HttpHeaders();

        if (token) {
            headers = headers.set(
                'Authorization',
                `Bearer ${token}`
            );
        }

        return headers;
    }


    // ============================================================
    // ACCOUNT DETAILS
    // ============================================================

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


    // ============================================================
    // ACCOUNT BY NATIONAL ID
    // ============================================================

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


    // ============================================================
    // CUSTOMER PROFILE
    // ============================================================

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


    // ============================================================
    // CREATE ACCOUNT
    // ============================================================

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


    // ============================================================
    // GET ALL ACCOUNTS
    // ============================================================

    getAllAccounts(): Observable<Account[]> {

        return this.http.get<Account[]>(
            `${this.accountsUrl}`,
            {
                headers: this.getHeaders()
            }
        );
    }


    // ============================================================
    // GET ACCOUNTS BY STATUS
    // ============================================================

    /**
     * CORRECT BACKEND URL:
     *
     * /api/accounts/status/ACTIVE
     * /api/accounts/status/DORMANT
     * /api/accounts/status/CLOSED
     */

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


    // ============================================================
    // CLOSE ACCOUNT
    // ============================================================

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


    // ============================================================
    // ACCOUNT BY PHONE
    // ============================================================

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


    // ============================================================
    // ACCOUNT BY EMAIL
    // ============================================================

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


    // ============================================================
    // UPDATE PROFILE
    // ============================================================

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


    // ============================================================
    // CHANGE PASSWORD
    // ============================================================

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


    // ============================================================
    // USER ACTIVITY
    // ============================================================

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


    // ============================================================
    // COUNTIES
    // ============================================================

    getCounties(): Observable<any[]> {

        return this.http.get<any[]>(
            `${this.locationsUrl}/counties`,
            {
                headers: this.getHeaders()
            }
        );
    }


    // ============================================================
    // TOWNS
    // ============================================================

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


    // ============================================================
    // STATEMENTS
    // ============================================================

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


    // ============================================================
    // LOANS
    // ============================================================

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


    // ============================================================
    // INDIVIDUAL ACCOUNT DOCUMENT
    // ============================================================

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


    // ============================================================
    // ORGANIZATION DOCUMENT UPLOAD
    // ============================================================

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


    // ============================================================
    // GET ORGANIZATION DOCUMENTS
    // ============================================================

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


    // ============================================================
    // VIEW ORGANIZATION DOCUMENT
    // ============================================================

    getOrganizationDocumentViewUrl(
        accountId: number,
        documentId: number
    ): string {

        return `${this.accountsUrl}/${accountId}` +
            `/organization-documents/${documentId}/view`;
    }


    // ============================================================
    // DOWNLOAD ORGANIZATION DOCUMENT
    // ============================================================

    getOrganizationDocumentDownloadUrl(
        accountId: number,
        documentId: number
    ): string {

        return `${this.accountsUrl}/${accountId}` +
            `/organization-documents/${documentId}/download`;
    }


    // ============================================================
    // GET ORGANIZATION DOCUMENT AS BLOB
    // ============================================================

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


    // ============================================================
    // SAVE ORGANIZATION PEOPLE
    // ============================================================

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