import { Component, OnInit } from '@angular/core';
import { AccountService } from '../services/account.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface AccountDocument {
    id: number;

    documentType: string;

    originalName?: string;
    originalFileName?: string;

    storedName?: string;
    fileName?: string;

    filePath?: string;
    fileUrl?: string;
    downloadUrl?: string;

    fileSize?: number;

    uploadedAt?: string;

    contentType?: string;

    source?: 'ACCOUNT' | 'ORGANIZATION' | string;

    verified?: boolean;
}

@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css']
})
export class AccountsComponent implements OnInit {
  accounts: any[] = [];
  activeCount = 0;
dormantCount = 0;
closedAccount = 0;
documents: AccountDocument[] = [];
selectedPortfolio = 'ALL';
  filteredAccounts: any[] = [];
  searchTerm: string = '';
  loading = true;
  error = '';
  selectedAccount: any = null;
  loanDetails: any[] = [];
  showDetailsModal = false;

  showLoanSummary = false;

  selectedCategory = 'ALL';


  // ============================================================
// CUSTOMER CERTIFICATE
// ============================================================

showCertificate = false;

certificateAccount: any = null;

currentDate = new Date();



  constructor(
    private accountService: AccountService,
    private router: Router

 ) {}

  ngOnInit(): void {
    this.loadAccounts();
  }


filterByCategory(category: string): void {

    this.selectedCategory = category;

    if (category === 'ALL') {

        this.filteredAccounts = [...this.accounts];

        return;

    }

    this.filteredAccounts = this.accounts.filter(
        account => account.customerCategory === category
    );

}


loadAccounts(): void {

  this.loading = true;

  this.accountService.getAllAccounts().subscribe({
    next: (data) => {

      console.log(data);   // <-- Add this

      this.accounts = data;
      this.filteredAccounts = [...data];

      this.calculatePortfolio();

      this.loading = false;
    }
  });
}

filterAccounts(): void {

    const term = this.searchTerm.toLowerCase();

    this.filteredAccounts = this.accounts.filter(acc =>

        (acc.fullName || '').toLowerCase().includes(term) ||

        (acc.organizationName || '').toLowerCase().includes(term) ||

        (acc.accountNumber || '').toLowerCase().includes(term) ||

        (acc.nationalId || '').toLowerCase().includes(term) ||

        (acc.phoneNumber || '').toLowerCase().includes(term)

    );

}

calculatePortfolio(): void {

  this.activeCount = this.accounts.filter(
      a => a.accountStatus === 'ACTIVE'
  ).length;

  this.closedAccount = this.accounts.filter(
      a => a.accountStatus === 'CLOSED'
  ).length;

  this.dormantCount = this.accounts.filter(
      a => a.accountStatus === 'DORMANT'
  ).length;
}


filterByPortfolio(type: string): void {

    this.selectedPortfolio = type;

    if (type === 'ALL') {

        this.filteredAccounts = [...this.accounts];

        return;
    }

    this.filteredAccounts = this.accounts.filter(
        a => a.accountStatus === type
    );
}

viewDetails(account: any): void {

    if (!account || !account.accountNumber) {
        console.error('Invalid account:', account);
        return;
    }

    const accountNumber = account.accountNumber;

    console.log(
        'Opening customer profile for account:',
        accountNumber
    );

    this.router.navigate([
        '/app',
        'customer-info',
        accountNumber
    ]).then(success => {

        console.log(
            'Navigation result:',
            success
        );

    }).catch(error => {

        console.error(
            'Navigation failed:',
            error
        );

    });
}


getDocumentIcon(type: string): string {

    const documentType = (type || '').toUpperCase();

    if (
        documentType.includes('PHOTO') ||
        documentType.includes('IMAGE')
    ) {
        return 'bi bi-image-fill';
    }

    if (
        documentType.includes('PDF')
    ) {
        return 'bi bi-file-earmark-pdf-fill';
    }

    if (
        documentType.includes('ID') ||
        documentType.includes('PASSPORT')
    ) {
        return 'bi bi-person-vcard-fill';
    }

    if (
        documentType.includes('SIGNATURE')
    ) {
        return 'bi bi-pen-fill';
    }

    if (
        documentType.includes('KRA') ||
        documentType.includes('TAX')
    ) {
        return 'bi bi-receipt-cutoff';
    }

    if (
        documentType.includes('ADDRESS')
    ) {
        return 'bi bi-house-fill';
    }

    if (
        documentType.includes('CERTIFICATE') ||
        documentType.includes('INCORPORATION') ||
        documentType.includes('REGISTRATION')
    ) {
        return 'bi bi-award-fill';
    }

    if (
        documentType.includes('RESOLUTION') ||
        documentType.includes('BOARD')
    ) {
        return 'bi bi-file-earmark-check-fill';
    }

    if (
        documentType.includes('CONSTITUTION') ||
        documentType.includes('TRUST')
    ) {
        return 'bi bi-journal-text';
    }

    return 'bi bi-file-earmark-text-fill';
}

// ============================================================
// DETERMINE WHETHER DOCUMENT IS AN IMAGE
// ============================================================

isImageDocument(document: AccountDocument): boolean {

    if (!document) {
        return false;
    }

    const contentType =
        (document.contentType || '').toLowerCase();

    const fileName =
        (
            document.originalName ||
            document.originalFileName ||
            document.fileName ||
            document.storedName ||
            ''
        ).toLowerCase();

    return (
        contentType.startsWith('image/') ||
        /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName)
    );
}


// ============================================================
// IMAGE PREVIEW URL
// ============================================================

getDocumentPreviewUrl(
    document: AccountDocument
): string {

    return this.getDocumentUrl(document);
}


// ============================================================
// IMAGE LOAD ERROR
// ============================================================

onDocumentImageError(
    event: Event
): void {

    const image =
        event.target as HTMLImageElement;

    if (!image) {
        return;
    }

    console.warn(
        'Unable to load document preview:',
        image.src
    );

    image.style.display = 'none';

    const fallback =
        image.parentElement?.querySelector(
            '.document-image-fallback'
        ) as HTMLElement;

    if (fallback) {
        fallback.style.display = 'flex';
    }
}


formatFileSize(size: number): string {

    if (!size || size <= 0) {
        return 'Unknown size';
    }

    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}


// ============================================================
// DOCUMENT HELPERS
// ============================================================

/**
 * Returns the currently displayed documents.
 *
 * We use this.documents as the single source of truth because
 * both account documents and organization documents are loaded
 * into this array.
 */
private getCurrentDocuments(): AccountDocument[] {

    if (Array.isArray(this.documents)) {
        return this.documents;
    }

    return [];
}


// ============================================================
// VERIFIED DOCUMENTS
// ============================================================

getVerifiedDocumentsCount(): number {

    return this.getCurrentDocuments()
        .filter(document => document.verified === true)
        .length;
}


// ============================================================
// PENDING DOCUMENTS
// ============================================================

getPendingDocumentsCount(): number {

    return this.getCurrentDocuments()
        .filter(document => document.verified !== true)
        .length;
}


// ============================================================
// DOCUMENT COMPLIANCE
// ============================================================

getDocumentCompliancePercentage(): number {

    const documents = this.getCurrentDocuments();

    if (documents.length === 0) {
        return 0;
    }

    const verified =
        documents.filter(
            document => document.verified === true
        ).length;

    return Math.round(
        (verified / documents.length) * 100
    );
}


// ============================================================
// DOCUMENT FILE TYPE
// ============================================================

getDocumentFileType(document: AccountDocument): string {

    if (!document) {
        return 'Document';
    }

    const contentType =
        (document.contentType || '').toLowerCase();

    const fileName =
        (
            document.originalName ||
            document.originalFileName ||
            document.storedName ||
            document.fileName ||
            ''
        ).toLowerCase();


    // PDF
    if (
        contentType.includes('pdf') ||
        fileName.endsWith('.pdf')
    ) {
        return 'PDF';
    }


    // Images
    if (
        contentType.startsWith('image/') ||
        /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName)
    ) {
        return 'IMAGE';
    }


    // Word
    if (
        contentType.includes('word') ||
        contentType.includes('document') ||
        /\.(doc|docx)$/i.test(fileName)
    ) {
        return 'WORD';
    }


    // Excel
    if (
        contentType.includes('excel') ||
        contentType.includes('spreadsheet') ||
        /\.(xls|xlsx)$/i.test(fileName)
    ) {
        return 'EXCEL';
    }


    // Text
    if (
        contentType.includes('text') ||
        fileName.endsWith('.txt')
    ) {
        return 'TEXT';
    }


    return 'DOCUMENT';
}


// ============================================================
// DOCUMENT PREVIEW CLASS
// ============================================================

getDocumentPreviewClass(
    document: AccountDocument
): string {

    const type =
        this.getDocumentFileType(document);

    switch (type) {

        case 'PDF':
            return 'document-preview-pdf';

        case 'IMAGE':
            return 'document-preview-image';

        case 'WORD':
            return 'document-preview-word';

        case 'EXCEL':
            return 'document-preview-excel';

        case 'TEXT':
            return 'document-preview-text';

        default:
            return 'document-preview-default';
    }
}



getDocumentUrl(document: AccountDocument): string {

  if (!document) {
    return '';
  }

  const backendOrigin = new URL(environment.apiUrl).origin;

  const resolveUrl = (value?: string): string => {
    if (!value?.trim()) {
      return '';
    }

    const cleanedUrl = value.trim();

    try {
      if (/^https?:\/\//i.test(cleanedUrl)) {
        const parsedUrl = new URL(cleanedUrl);

        if (
          parsedUrl.hostname === 'localhost' ||
          parsedUrl.hostname === '127.0.0.1'
        ) {
          return `${backendOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        }

        return cleanedUrl;
      }

      return new URL(
        cleanedUrl.replace(/^\/+/, ''),
        `${backendOrigin}/`
      ).toString();

    } catch (error) {
      console.error('Unable to resolve account document URL:', error);
      return '';
    }
  };

  // Preserve existing URL priority.
  return (
    resolveUrl(document.fileUrl) ||
    resolveUrl(document.downloadUrl) ||
    resolveUrl(document.filePath)
  );
}


// ============================================================
// VIEW DOCUMENT
// ============================================================

viewDocument(document: AccountDocument): void {

    const url =
        this.getDocumentUrl(document);

    if (!url) {

        alert(
            'This document does not have a valid viewing URL.'
        );

        return;
    }


    window.open(
        url,
        '_blank',
        'noopener,noreferrer'
    );
}


// ============================================================
// DOWNLOAD DOCUMENT
// ============================================================

downloadDocument(
    document: AccountDocument
): void {

    const url =
        this.getDocumentUrl(document);

    if (!url) {

        alert(
            'This document cannot be downloaded because its file URL is unavailable.'
        );

        return;
    }


    const fileName =
        document.originalName ||
        document.originalFileName ||
        document.storedName ||
        document.fileName ||
        'document';


    const link =
        window.document.createElement('a');

    link.href = url;

    link.target = '_blank';

    link.download = fileName;

    link.rel = 'noopener noreferrer';

    window.document.body.appendChild(link);

    link.click();

    window.document.body.removeChild(link);
}


closeDetailsModal(): void {

    this.showDetailsModal = false;

    this.selectedAccount = null;

    this.loanDetails = [];

    this.showLoanSummary = false;
}

getAccountStatusClass(status: string): string {

    switch ((status || '').toUpperCase()) {

        case 'ACTIVE':
            return 'bg-success';

        case 'DORMANT':
            return 'bg-warning text-dark';

        case 'CLOSED':
            return 'bg-danger';

        default:
            return 'bg-secondary';
    }
}

getAccountStatusIcon(status: string): string {

    switch ((status || '').toUpperCase()) {

        case 'ACTIVE':
            return 'bi-check-circle-fill';

        case 'DORMANT':
            return 'bi-moon-stars-fill';

        case 'CLOSED':
            return 'bi-lock-fill';

        default:
            return 'bi-question-circle-fill';
    }
}

getApprovalStatusClass(status: string): string {

    switch ((status || '').toUpperCase()) {

        case 'APPROVED':
            return 'bg-success';

        case 'PENDING':
            return 'bg-warning text-dark';

        case 'REJECTED':
            return 'bg-danger';

        default:
            return 'bg-secondary';
    }
}

getComplianceClass(status: string): string {

    switch ((status || '').toUpperCase()) {

        case 'APPROVED':
        case 'VERIFIED':
        case 'COMPLETED':
            return 'bg-success';

        case 'PENDING':
        case 'IN_PROGRESS':
            return 'bg-warning text-dark';

        case 'REJECTED':
        case 'FAILED':
            return 'bg-danger';

        default:
            return 'bg-secondary';
    }
}

getRiskClass(risk: string): string {

    switch ((risk || '').toUpperCase()) {

        case 'LOW':
            return 'bg-success';

        case 'MEDIUM':
            return 'bg-warning text-dark';

        case 'HIGH':
        case 'CRITICAL':
            return 'bg-danger';

        default:
            return 'bg-secondary';
    }
}

formatDocumentType(type: string): string {

    if (!type) {
        return 'Document';
    }

    return type
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
}


getAccountImage(account: any): string | null {

  if (!account) {
    return null;
  }

  if (account.imageUrl && account.imageUrl.trim() !== '') {
    return account.imageUrl;
  }

  if (
    account.organizationImageUrl &&
    account.organizationImageUrl.trim() !== ''
  ) {
    return account.organizationImageUrl;
  }

  return null;
}

closeAccount(acc: any): void {

    const reason = prompt(
        `Enter reason for closing ${acc.fullName}'s account:`
    );

    if (reason === null) {
        return;
    }

    this.accountService.closeAccount(acc.accountNumber, reason)
        .subscribe({

            next: () => {

                alert("Account closed successfully.");

                this.loadAccounts();

            },

            error: () => {

                alert("Unable to close account.");

            }

        });

}

  goToAccountRegistration() {
  this.router.navigate(['/app/accountsopening']);
}

clearSearch() {
  this.searchTerm = '';
  this.filterAccounts();
}

onImageError(event: Event): void {

  const img = event.target as HTMLImageElement;

  console.error('IMAGE FAILED TO LOAD:', img.src);

  img.style.display = 'none';

}

getStatusClass(status: string): string {
  if (!status) return '';

  switch (status.toLowerCase()) {
    case 'approved':
      return 'badge-approved';

    case 'pending':
      return 'badge-pending';

    case 'rejected':
      return 'badge-rejected';

    case 'partial':
      return 'badge-partial';

    case 'repaid':
    case 'paid':
      return 'badge-repaid';

    default:
      return 'badge-secondary';
  }
}



// ============================================================
// CUSTOMER CERTIFICATE
// PREPARE + PRINT
// ============================================================

printCustomerCertificate(account: any): void {

    if (!account) {
        console.warn('No account supplied for certificate.');
        return;
    }

    // Store selected customer
    this.certificateAccount = account;

    // Refresh certificate date
    this.currentDate = new Date();

    // Show certificate in Angular first
    this.showCertificate = true;

    /*
     * IMPORTANT:
     * Angular needs a moment to render #customerCertificate
     * before we try to print it.
     */
    setTimeout(() => {

        this.printCertificate();

    }, 300);
}


// ============================================================
// CLOSE CERTIFICATE PREVIEW
// ============================================================

closeCertificate(): void {

    this.showCertificate = false;
    this.certificateAccount = null;

}


// ============================================================
// CERTIFICATE CUSTOMER NAME
// ============================================================

getCertificateCustomerName(account: any): string {

    if (!account) {
        return 'N/A';
    }

    // INDIVIDUAL
    if (
        account.customerCategory === 'INDIVIDUAL'
    ) {

        return (
            account.fullName ||
            account.displayName ||
            'Individual Customer'
        );

    }

    // ORGANIZATION
    return (
        account.organizationName ||
        account.fullName ||
        account.displayName ||
        'Registered Organization'
    );

}


// ============================================================
// CERTIFICATE STATUS
// ============================================================

getCertificateStatusClass(status: string): string {

    switch ((status || '').toUpperCase()) {

        case 'ACTIVE':
            return 'certificate-status-active';

        case 'DORMANT':
            return 'certificate-status-dormant';

        case 'CLOSED':
            return 'certificate-status-closed';

        default:
            return 'certificate-status-default';

    }

}


// ============================================================
// PRINT CUSTOMER CERTIFICATE
// ============================================================

printCertificate(): void {

    const certificate =
        window.document.getElementById('customerCertificate');

    if (!certificate) {

        console.error(
            'Customer certificate element was not found.'
        );

        alert(
            'Customer certificate could not be prepared for printing.'
        );

        return;
    }

    const printWindow =
        window.open(
            '',
            '_blank',
            'width=1200,height=900'
        );

    if (!printWindow) {

        alert(
            'Unable to open the print window. Please allow pop-ups for this application.'
        );

        return;
    }

    printWindow.document.open();

    printWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >

            <title>
                Customer Account Certificate
            </title>

            <style>

                ${this.getCertificatePrintStyles()}

            </style>

        </head>

        <body>

            ${certificate.outerHTML}

        </body>

        </html>

    `);

    printWindow.document.close();

    /*
     * Wait for the new window to finish rendering
     * before opening the print dialog.
     */
    printWindow.onload = () => {

        setTimeout(() => {

            printWindow.focus();

            printWindow.print();

        }, 500);

    };

    /*
     * Safety fallback for browsers where onload
     * fires before Angular content is completely ready.
     */
    setTimeout(() => {

        if (!printWindow.closed) {

            printWindow.focus();

        }

    }, 1000);

}


// ============================================================
// PROFESSIONAL CERTIFICATE PRINT STYLES
// ============================================================

private getCertificatePrintStyles(): string {

    return `

        * {
            box-sizing: border-box;
        }


        html,
        body {

            margin: 0;
            padding: 0;

            background: #ffffff;

            font-family:
                "Segoe UI",
                Arial,
                Helvetica,
                sans-serif;

            color: #172033;

        }


        body {

            padding: 25px;

        }


        .certificate-wrapper {

            width: 100%;
            max-width: 1100px;

            margin: 0 auto;

            background: #ffffff;

        }


        .customer-certificate {

            position: relative;

            width: 100%;

            min-height: 760px;

            padding: 55px 65px;

            border: 1px solid #d8dee9;

            background:
                linear-gradient(
                    135deg,
                    #ffffff 0%,
                    #f8fafc 100%
                );

            overflow: hidden;

        }


        /* =========================================
           DECORATIVE TOP LINE
        ========================================= */

        .customer-certificate::before {

            content: "";

            position: absolute;

            top: 0;
            left: 0;
            right: 0;

            height: 10px;

            background:
                linear-gradient(
                    90deg,
                    #0f3d91,
                    #2563eb,
                    #0f766e
                );

        }


        .customer-certificate::after {

            content: "";

            position: absolute;

            width: 320px;
            height: 320px;

            right: -170px;
            top: -170px;

            border-radius: 50%;

            border: 35px solid rgba(37, 99, 235, 0.05);

        }


        /* =========================================
           HEADER
        ========================================= */

        .certificate-header {

            display: flex;

            justify-content: space-between;

            align-items: center;

            padding-bottom: 28px;

            border-bottom: 2px solid #e5eaf1;

        }


        .certificate-brand {

            display: flex;

            align-items: center;

            gap: 16px;

        }


        .certificate-logo {

            width: 65px;
            height: 65px;

            display: flex;

            align-items: center;
            justify-content: center;

            border-radius: 14px;

            background:
                linear-gradient(
                    135deg,
                    #0f3d91,
                    #2563eb
                );

            color: #ffffff;

            font-size: 30px;

            font-weight: 700;

        }


        .certificate-bank-name {

            font-size: 24px;

            font-weight: 800;

            letter-spacing: .4px;

            color: #0f3d91;

        }


        .certificate-bank-subtitle {

            margin-top: 4px;

            font-size: 11px;

            color: #64748b;

            letter-spacing: 1.5px;

            text-transform: uppercase;

        }


        .certificate-reference {

            text-align: right;

        }


        .certificate-reference-label {

            font-size: 9px;

            color: #64748b;

            text-transform: uppercase;

            letter-spacing: 1px;

        }


        .certificate-reference-value {

            margin-top: 5px;

            font-size: 14px;

            font-weight: 700;

            color: #172033;

        }


        /* =========================================
           TITLE
        ========================================= */

        .certificate-title-section {

            text-align: center;

            margin: 45px 0 35px;

        }


        .certificate-title {

            margin: 0;

            font-size: 30px;

            font-weight: 800;

            letter-spacing: 2px;

            color: #0f3d91;

            text-transform: uppercase;

        }


        .certificate-subtitle {

            margin-top: 10px;

            font-size: 13px;

            color: #64748b;

        }


        /* =========================================
           CUSTOMER IDENTIFICATION
        ========================================= */

        .certificate-customer {

            padding: 25px 30px;

            border-radius: 14px;

            background: #f8fafc;

            border: 1px solid #e2e8f0;

            text-align: center;

            margin-bottom: 30px;

        }


        .certificate-customer-label {

            font-size: 10px;

            color: #64748b;

            text-transform: uppercase;

            letter-spacing: 1.5px;

        }


        .certificate-customer-name {

            margin-top: 8px;

            font-size: 25px;

            font-weight: 800;

            color: #172033;

        }


        .certificate-category {

            display: inline-block;

            margin-top: 10px;

            padding: 7px 16px;

            border-radius: 999px;

            background: #e8f0ff;

            color: #1d4ed8;

            font-size: 11px;

            font-weight: 700;

            letter-spacing: .8px;

            text-transform: uppercase;

        }


        /* =========================================
           INFORMATION GRID
        ========================================= */

        .certificate-information {

            display: grid;

            grid-template-columns:
                repeat(2, 1fr);

            gap: 18px;

            margin-top: 25px;

        }


        .certificate-information-item {

            padding: 18px 20px;

            border: 1px solid #e2e8f0;

            border-radius: 10px;

            background: #ffffff;

        }


        .certificate-information-label {

            display: block;

            margin-bottom: 6px;

            font-size: 9px;

            font-weight: 700;

            color: #64748b;

            text-transform: uppercase;

            letter-spacing: 1px;

        }


        .certificate-information-value {

            font-size: 15px;

            font-weight: 700;

            color: #172033;

        }


        /* =========================================
           STATUS
        ========================================= */

        .certificate-status {

            display: inline-block;

            padding: 7px 14px;

            border-radius: 999px;

            font-size: 11px;

            font-weight: 800;

            text-transform: uppercase;

        }


        .certificate-status-active {

            background: #dcfce7;

            color: #166534;

        }


        .certificate-status-dormant {

            background: #fef3c7;

            color: #92400e;

        }


        .certificate-status-closed {

            background: #fee2e2;

            color: #991b1b;

        }


        .certificate-status-default {

            background: #e2e8f0;

            color: #475569;

        }


        /* =========================================
           DECLARATION
        ========================================= */

        .certificate-declaration {

            margin-top: 32px;

            padding: 20px 22px;

            border-left: 4px solid #2563eb;

            background: #f8fafc;

            font-size: 12px;

            line-height: 1.7;

            color: #475569;

        }


        /* =========================================
           FOOTER
        ========================================= */

        .certificate-footer {

            display: flex;

            justify-content: space-between;

            align-items: flex-end;

            margin-top: 50px;

            padding-top: 25px;

            border-top: 1px solid #e2e8f0;

        }


        .certificate-signature {

            width: 220px;

            text-align: center;

        }


        .signature-line {

            border-top: 1px solid #172033;

            margin-bottom: 7px;

        }


        .signature-label {

            font-size: 10px;

            color: #64748b;

            text-transform: uppercase;

            letter-spacing: 1px;

        }


        .certificate-issued {

            text-align: right;

            font-size: 10px;

            color: #64748b;

            line-height: 1.6;

        }


        /* =========================================
           PRINT
        ========================================= */

        @media print {

            @page {

                size: A4 portrait;

                margin: 10mm;

            }


            body {

                padding: 0;

                background: #ffffff;

            }


            .customer-certificate {

                border: none;

                min-height: auto;

                box-shadow: none;

                page-break-inside: avoid;

            }


            .no-print {

                display: none !important;

            }

        }

    `;

}
}
