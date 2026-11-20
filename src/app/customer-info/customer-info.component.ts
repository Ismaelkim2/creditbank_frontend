import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../services/account.service';

@Component({
  selector: 'app-customer-info',
  templateUrl: './customer-info.component.html',
  styleUrls: ['./customer-info.component.css']
})
export class CustomerInfoComponent implements OnInit {

  // =========================================================
  // ACCOUNT / PROFILE
  // =========================================================

  accountNumber: string = '';

  selectedAccount: any = null;

  loading: boolean = false;

  // =========================================================
  // DOCUMENTS
  // =========================================================

  documents: any[] = [];

  // =========================================================
  // LOANS
  // =========================================================

  loanDetails: any[] = [];

  // =========================================================
  // BACKEND
  // =========================================================

  private readonly DOCUMENT_BASE_URL = 'http://localhost:8080/';

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService
  ) {}

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    this.accountNumber =
      this.route.snapshot.paramMap.get('accountNumber') || '';

    console.log(
      'Customer profile account number:',
      this.accountNumber
    );

    if (!this.accountNumber) {

      console.error(
        'No account number provided.'
      );

      return;
    }

    this.loadCustomerProfile();
  }

  // =========================================================
  // LOAD CUSTOMER PROFILE
  // =========================================================

  loadCustomerProfile(): void {

    this.loading = true;

    this.accountService
      .getCustomerProfile(this.accountNumber)
      .subscribe({

        // =====================================================
        // SUCCESS
        // =====================================================

        next: (profile: any) => {

          console.log(
            '========== CUSTOMER PROFILE =========='
          );

          console.log(
            'FULL PROFILE RESPONSE:',
            profile
          );

          console.log(
            'ACCOUNT NUMBER:',
            profile?.accountNumber
          );

          console.log(
            'PROFILE DOCUMENTS:',
            profile?.documents
          );

          console.log(
            'PROFILE DOCUMENT COUNT:',
            Array.isArray(profile?.documents)
              ? profile.documents.length
              : 0
          );

          console.log(
            'ORGANIZATION DOCUMENTS:',
            profile?.organizationDocuments
          );

          console.log(
            'CUSTOMER DOCUMENTS:',
            profile?.customerDocuments
          );

          console.log(
            'DOCUMENT LIST:',
            profile?.documentList
          );

          console.log(
            '======================================'
          );

          // ===================================================
          // CUSTOMER PROFILE
          // ===================================================

          this.selectedAccount = {
            ...profile
          };

          // ===================================================
          // LOANS
          // ===================================================

          this.loanDetails =
            Array.isArray(profile?.loans)
              ? profile.loans
              : [];

          // ===================================================
          // GET DOCUMENTS
          //
          // Backend may return documents under different
          // property names. We support all known possibilities.
          // ===================================================

          const returnedDocuments =
            this.extractDocuments(profile);

          console.log(
            'DOCUMENTS EXTRACTED:',
            returnedDocuments
          );

          // ===================================================
          // NORMALIZE DOCUMENTS
          // ===================================================

          this.documents =
            returnedDocuments.map(
              (customerDocument: any) =>
                this.normalizeDocument(customerDocument)
            );

          // ===================================================
          // ATTACH DOCUMENTS TO PROFILE
          //
          // THIS IS IMPORTANT BECAUSE THE TEMPLATE USES:
          //
          // selectedAccount?.documents
          // ===================================================

          this.selectedAccount.documents =
            this.documents;

          console.log(
            'FINAL DOCUMENTS USED BY UI:',
            this.selectedAccount.documents
          );

          console.log(
            'FINAL DOCUMENT COUNT:',
            this.selectedAccount.documents.length
          );

          // ===================================================
          // DOCUMENT DETAILS DEBUGGING
          // ===================================================

          this.selectedAccount.documents.forEach(
            (customerDocument: any, index: number) => {

              console.log(
                `DOCUMENT ${index + 1}:`,
                {
                  id: customerDocument.id,
                  type: customerDocument.documentType,
                  originalName:
                    customerDocument.originalName,
                  storedName:
                    customerDocument.storedName,
                  filePath:
                    customerDocument.filePath,
                  previewUrl:
                    this.getDocumentPreviewUrl(
                      customerDocument
                    ),
                  fileType:
                    this.getDocumentFileType(
                      customerDocument
                    ),
                  isImage:
                    this.isImageDocument(
                      customerDocument
                    )
                }
              );
            }
          );

          // ===================================================
          // FINISH
          // ===================================================

          this.loading = false;
        },

        // =====================================================
        // ERROR
        // =====================================================

        error: (error: any) => {

          console.error(
            'Failed to load customer profile:',
            error
          );

          console.error(
            'Backend response:',
            error?.error
          );

          this.selectedAccount = null;

          this.documents = [];

          this.loanDetails = [];

          this.loading = false;
        }

      });
  }

  // =========================================================
  // EXTRACT DOCUMENTS
  // =========================================================

  private extractDocuments(profile: any): any[] {

    if (!profile) {
      return [];
    }

    // -------------------------------------------------------
    // PRIMARY PROPERTY
    // -------------------------------------------------------

    if (Array.isArray(profile.documents)) {

      console.log(
        'Using profile.documents'
      );

      return profile.documents;
    }

    // -------------------------------------------------------
    // CUSTOMER DOCUMENTS
    // -------------------------------------------------------

    if (Array.isArray(profile.customerDocuments)) {

      console.log(
        'Using profile.customerDocuments'
      );

      return profile.customerDocuments;
    }

    // -------------------------------------------------------
    // ORGANIZATION DOCUMENTS
    // -------------------------------------------------------

    if (Array.isArray(profile.organizationDocuments)) {

      console.log(
        'Using profile.organizationDocuments'
      );

      return profile.organizationDocuments;
    }

    // -------------------------------------------------------
    // DOCUMENT LIST
    // -------------------------------------------------------

    if (Array.isArray(profile.documentList)) {

      console.log(
        'Using profile.documentList'
      );

      return profile.documentList;
    }

    // -------------------------------------------------------
    // FALLBACK
    // -------------------------------------------------------

    console.warn(
      'No document array found in customer profile.'
    );

    return [];
  }

  // =========================================================
  // NORMALIZE DOCUMENT
  // =========================================================

  private normalizeDocument(
    customerDocument: any
  ): any {

    if (!customerDocument) {

      return {
        documentType: 'SUPPORTING_DOCUMENT',
        originalName: 'Document',
        fileName: '',
        storedName: '',
        filePath: '',
        fileSize: 0,
        uploadedAt: null,
        verified: false
      };
    }

    const documentType =
      customerDocument.documentType ||
      customerDocument.type ||
      customerDocument.documentName ||
      customerDocument.name ||
      'SUPPORTING_DOCUMENT';

    const originalName =
      customerDocument.originalName ||
      customerDocument.originalFileName ||
      customerDocument.fileName ||
      customerDocument.storedName ||
      customerDocument.name ||
      'Document';

    const fileName =
      customerDocument.fileName ||
      customerDocument.originalFileName ||
      customerDocument.originalName ||
      customerDocument.storedName ||
      '';

    const storedName =
      customerDocument.storedName ||
      customerDocument.serverFileName ||
      customerDocument.fileName ||
      '';

    const filePath =
      customerDocument.filePath ||
      customerDocument.path ||
      customerDocument.fileUrl ||
      customerDocument.url ||
      '';

    const fileSize =
      Number(
        customerDocument.fileSize ??
        customerDocument.size ??
        0
      );

    const uploadedAt =
      customerDocument.uploadedAt ||
      customerDocument.createdAt ||
      customerDocument.uploadDate ||
      null;

    return {

      // Keep all original backend properties
      ...customerDocument,

      // Standardized properties
      documentType,
      originalName,
      fileName,
      storedName,
      filePath,
      fileSize,
      uploadedAt,

      // Preserve actual verification status
      verified:
        customerDocument.verified === true
    };
  }

  // =========================================================
  // BACK TO ACCOUNTS
  // =========================================================

  backToAccounts(): void {

    this.router.navigate([
      '/app/accounts'
    ]);
  }

  // =========================================================
  // ACCOUNT STATUS CLASS
  // =========================================================

  getAccountStatusClass(
    status: string
  ): string {

    switch (
      (status || '').toUpperCase()
    ) {

      case 'ACTIVE':
        return 'bg-success';

      case 'DORMANT':
        return 'bg-warning text-dark';

      case 'CLOSED':
        return 'bg-danger';

      case 'PENDING':
        return 'bg-info text-dark';

      case 'SUSPENDED':
        return 'bg-dark';

      default:
        return 'bg-secondary';
    }
  }

  // =========================================================
  // ACCOUNT STATUS ICON
  // =========================================================

  getAccountStatusIcon(
    status: string
  ): string {

    switch (
      (status || '').toUpperCase()
    ) {

      case 'ACTIVE':
        return 'bi-check-circle-fill';

      case 'DORMANT':
        return 'bi-pause-circle-fill';

      case 'CLOSED':
        return 'bi-lock-fill';

      case 'PENDING':
        return 'bi-clock-fill';

      case 'SUSPENDED':
        return 'bi-slash-circle-fill';

      default:
        return 'bi-question-circle-fill';
    }
  }

  // =========================================================
  // APPROVAL STATUS CLASS
  // =========================================================

  getApprovalStatusClass(
    status: string
  ): string {

    switch (
      (status || '').toUpperCase()
    ) {

      case 'APPROVED':
        return 'bg-success';

      case 'PENDING':
        return 'bg-warning text-dark';

      case 'REJECTED':
        return 'bg-danger';

      case 'CANCELLED':
        return 'bg-secondary';

      default:
        return 'bg-secondary';
    }
  }

  // =========================================================
  // DOCUMENT COUNTS
  // =========================================================

  getVerifiedDocumentsCount(): number {

    return this.documents.filter(
      (customerDocument: any) =>
        customerDocument?.verified === true
    ).length;
  }

  // =========================================================
  // PENDING DOCUMENTS
  // =========================================================

  getPendingDocumentsCount(): number {

    return this.documents.filter(
      (customerDocument: any) =>
        customerDocument?.verified !== true
    ).length;
  }

  // =========================================================
  // DOCUMENT COMPLIANCE
  // =========================================================

  getDocumentCompliancePercentage(): number {

    if (!this.documents.length) {
      return 0;
    }

    const verified =
      this.getVerifiedDocumentsCount();

    return Math.round(
      (verified / this.documents.length) * 100
    );
  }

  // =========================================================
  // FORMAT DOCUMENT TYPE
  // =========================================================

  formatDocumentType(
    type: string
  ): string {

    if (!type) {
      return 'N/A';
    }

    return type
      .toString()
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .toLowerCase()
      .replace(
        /\b\w/g,
        (character: string) =>
          character.toUpperCase()
      );
  }

  // =========================================================
  // FILE TYPE
  // =========================================================

  getDocumentFileType(
    customerDocument: any
  ): string {

    if (!customerDocument) {
      return 'FILE';
    }

    const fileName =
      customerDocument.originalName ||
      customerDocument.originalFileName ||
      customerDocument.fileName ||
      customerDocument.storedName ||
      customerDocument.filePath ||
      '';

    const cleanFileName =
      fileName
        .split('?')[0]
        .split('#')[0];

    const lastDot =
      cleanFileName.lastIndexOf('.');

    if (lastDot === -1) {

      // Try MIME type
      const mimeType =
        customerDocument.contentType ||
        customerDocument.mimeType ||
        '';

      if (mimeType) {

        const mime =
          mimeType.toLowerCase();

        if (mime.includes('pdf')) {
          return 'PDF';
        }

        if (mime.includes('jpeg')) {
          return 'JPG';
        }

        if (mime.includes('png')) {
          return 'PNG';
        }

        if (mime.includes('webp')) {
          return 'WEBP';
        }

        if (
          mime.includes('word') ||
          mime.includes('document')
        ) {
          return 'DOCX';
        }

        if (
          mime.includes('excel') ||
          mime.includes('spreadsheet')
        ) {
          return 'XLSX';
        }
      }

      return 'FILE';
    }

    return cleanFileName
      .substring(lastDot + 1)
      .toUpperCase();
  }

  // =========================================================
  // FILE SIZE
  // =========================================================

  formatFileSize(
    size: number
  ): string {

    const numericSize =
      Number(size);

    if (
      !numericSize ||
      numericSize <= 0
    ) {
      return 'Unknown size';
    }

    if (numericSize < 1024) {

      return `${numericSize} B`;
    }

    if (
      numericSize <
      1024 * 1024
    ) {

      return `${(
        numericSize / 1024
      ).toFixed(1)} KB`;
    }

    if (
      numericSize <
      1024 * 1024 * 1024
    ) {

      return `${(
        numericSize /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    }

    return `${(
      numericSize /
      (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;
  }

  // =========================================================
  // IMAGE DOCUMENT
  // =========================================================

  isImageDocument(
    customerDocument: any
  ): boolean {

    if (!customerDocument) {
      return false;
    }

    // -------------------------------------------------------
    // MIME TYPE FIRST
    // -------------------------------------------------------

    const contentType =
      (
        customerDocument.contentType ||
        customerDocument.mimeType ||
        ''
      ).toString().toLowerCase();

    if (
      contentType.startsWith('image/')
    ) {

      return true;
    }

    // -------------------------------------------------------
    // FILE EXTENSION
    // -------------------------------------------------------

    const fileName =
      customerDocument.originalName ||
      customerDocument.originalFileName ||
      customerDocument.fileName ||
      customerDocument.storedName ||
      customerDocument.filePath ||
      '';

    const extension =
      fileName
        .split('?')[0]
        .split('#')[0]
        .split('.')
        .pop()
        ?.toLowerCase();

    return [
      'jpg',
      'jpeg',
      'png',
      'webp',
      'gif',
      'bmp'
    ].includes(
      extension || ''
    );
  }

  // =========================================================
  // DOCUMENT PREVIEW URL
  // =========================================================

  getDocumentPreviewUrl(
    customerDocument: any
  ): string {

    if (!customerDocument) {
      return '';
    }

    // -------------------------------------------------------
    // POSSIBLE BACKEND URL FIELDS
    // -------------------------------------------------------

    let filePath =
      customerDocument.filePath ||
      customerDocument.path ||
      customerDocument.fileUrl ||
      customerDocument.url ||
      customerDocument.documentUrl ||
      '';

    if (!filePath) {

      // -----------------------------------------------------
      // FALLBACK TO STORED FILE NAME
      // -----------------------------------------------------

      const storedName =
        customerDocument.storedName ||
        customerDocument.serverFileName ||
        '';

      if (storedName) {

        filePath =
          `uploads/documents/${storedName}`;
      }
    }

    if (!filePath) {

      console.warn(
        'No document path available:',
        customerDocument
      );

      return '';
    }

    filePath =
      filePath
        .toString()
        .trim();

    // -------------------------------------------------------
    // ALREADY COMPLETE URL
    // -------------------------------------------------------

    if (
      filePath.startsWith('http://') ||
      filePath.startsWith('https://') ||
      filePath.startsWith('blob:')
    ) {

      return filePath;
    }

    // -------------------------------------------------------
    // REMOVE LEADING SLASHES
    // -------------------------------------------------------

    filePath =
      filePath.replace(
        /^\/+/,
        ''
      );

    // -------------------------------------------------------
    // AVOID DOUBLE "uploads"
    // -------------------------------------------------------

    return (
      this.DOCUMENT_BASE_URL +
      filePath
    );
  }

  // =========================================================
  // DOCUMENT PREVIEW CLASS
  // =========================================================

  getDocumentPreviewClass(
    customerDocument: any
  ): string {

    if (
      this.isImageDocument(
        customerDocument
      )
    ) {

      return 'image-document';
    }

    const fileType =
      this.getDocumentFileType(
        customerDocument
      );

    switch (fileType) {

      case 'PDF':
        return 'pdf-document';

      case 'DOC':
      case 'DOCX':
        return 'word-document';

      case 'XLS':
      case 'XLSX':
        return 'excel-document';

      case 'JPG':
      case 'JPEG':
      case 'PNG':
      case 'WEBP':
        return 'image-document';

      default:
        return 'generic-document';
    }
  }

  // =========================================================
  // DOCUMENT ICON
  // =========================================================

  getDocumentIcon(
    documentType: string
  ): string {

    const value =
      (documentType || '')
        .toString()
        .toUpperCase();

    // -------------------------------------------------------
    // SPECIFIC DOCUMENT TYPES
    // -------------------------------------------------------

    switch (value) {

      case 'KRA_PIN':
        return 'bi bi-file-earmark-text-fill';

      case 'NATIONAL_ID':
      case 'ID':
      case 'IDENTIFICATION':
        return 'bi bi-person-vcard-fill';

      case 'PASSPORT':
        return 'bi bi-passport-fill';

      case 'SIGNATURE':
        return 'bi bi-pen-fill';

      case 'GROUP_CERTIFICATE':
      case 'CERTIFICATE':
        return 'bi bi-award-fill';

      case 'CONSTITUTION':
      case 'CONSTITUTION_DOCUMENT':
        return 'bi bi-file-earmark-richtext-fill';

      case 'MEETING_RESOLUTION':
        return 'bi bi-file-earmark-check-fill';

      case 'CERTIFICATE_OF_INCORPORATION':
        return 'bi bi-building-fill';

      case 'CR12':
      case 'CR12_DOCUMENT':
        return 'bi bi-file-earmark-person-fill';

      case 'BOARD_RESOLUTION':
      case 'BOARD_RESOLUTION_DOCUMENT':
        return 'bi bi-file-earmark-check-fill';

      case 'REGISTRATION_CERTIFICATE':
        return 'bi bi-file-earmark-medical-fill';

      case 'TRUST_DEED':
        return 'bi bi-file-earmark-text-fill';

      case 'INSTITUTION_RESOLUTION':
        return 'bi bi-file-earmark-check-fill';

      case 'PASSPORT_PHOTO':
      case 'PROFILE_PHOTO':
        return 'bi bi-person-bounding-box';

      case 'PROOF_OF_ADDRESS':
        return 'bi bi-house-check-fill';

      case 'INCOME_PROOF':
        return 'bi bi-cash-stack';
    }

    // -------------------------------------------------------
    // FILE TYPE FALLBACK
    // -------------------------------------------------------

    if (
      value.includes('PDF')
    ) {

      return 'bi bi-file-earmark-pdf-fill';
    }

    if (
      value.includes('WORD') ||
      value.includes('DOC')
    ) {

      return 'bi bi-file-earmark-word-fill';
    }

    if (
      value.includes('EXCEL') ||
      value.includes('XLS')
    ) {

      return 'bi bi-file-earmark-excel-fill';
    }

    if (
      value.includes('IMAGE') ||
      value.includes('PHOTO') ||
      value.includes('PNG') ||
      value.includes('JPG') ||
      value.includes('JPEG')
    ) {

      return 'bi bi-file-earmark-image-fill';
    }

    return 'bi bi-file-earmark-fill';
  }

  // =========================================================
  // VIEW DOCUMENT
  // =========================================================

  viewDocument(
    customerDocument: any
  ): void {

    const url =
      this.getDocumentPreviewUrl(
        customerDocument
      );

    console.log(
      'Opening customer document:',
      {
        document:
          customerDocument,
        url
      }
    );

    if (!url) {

      console.error(
        'Cannot view document. No URL found:',
        customerDocument
      );

      return;
    }

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  }

  // =========================================================
  // DOWNLOAD DOCUMENT
  // =========================================================

  downloadDocument(
    customerDocument: any
  ): void {

    const url =
      this.getDocumentPreviewUrl(
        customerDocument
      );

    console.log(
      'Downloading customer document:',
      {
        document:
          customerDocument,
        url
      }
    );

    if (!url) {

      console.error(
        'Cannot download document. No URL found:',
        customerDocument
      );

      return;
    }

    // IMPORTANT:
    // Do not name the parameter "document" because it
    // shadows the browser's global document object.

    const link =
      window.document.createElement('a');

    link.href = url;

    link.target = '_blank';

    link.rel =
      'noopener noreferrer';

    link.download =
      customerDocument.originalName ||
      customerDocument.originalFileName ||
      customerDocument.fileName ||
      customerDocument.storedName ||
      'customer-document';

    window.document.body.appendChild(
      link
    );

    link.click();

    window.document.body.removeChild(
      link
    );
  }

  // =========================================================
  // CUSTOMER IMAGE ERROR
  // =========================================================

  onImageError(
    event: any
  ): void {

    if (event?.target) {

      event.target.style.display =
        'none';
    }
  }

  // =========================================================
  // DOCUMENT IMAGE ERROR
  // =========================================================

  onDocumentImageError(
    event: any
  ): void {

    if (event?.target) {

      console.warn(
        'Document image failed to load:',
        event.target?.src
      );

      event.target.style.display =
        'none';

      // -----------------------------------------------------
      // Show fallback if available
      // -----------------------------------------------------

      const parent =
        event.target.parentElement;

      if (parent) {

        const fallback =
          parent.querySelector(
            '.document-image-fallback'
          );

        if (fallback) {

          fallback.style.display =
            'flex';
        }
      }
    }
  }

  // =========================================================
  // CLOSE DETAILS MODAL
  //
  // Included because your HTML calls:
  // closeDetailsModal()
  // =========================================================

  closeDetailsModal(): void {

    // If this component is being used as a page,
    // go back to accounts.

    this.backToAccounts();
  }

}

