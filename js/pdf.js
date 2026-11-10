/**
 * Shai Invoice Generator 2.0 - PDF Generation & Preview Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    initPdfModule();
});

function initPdfModule() {
    const previewBtn = document.getElementById('preview-invoice-btn');
    const closePreviewBtn = document.getElementById('close-preview-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');

    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            generateInvoicePreview();
        });
    }

    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', () => {
            closePreviewModal();
        });
    }

    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            downloadInvoicePDF();
        });
    }
}

function generateInvoicePreview() {
    const invNumber = document.getElementById('invNumber')?.value.trim();
    if (!invNumber) {
        alert('Please enter an Invoice Number before previewing.');
        return;
    }

    const biz = Storage.getBusinessProfile();
    const clients = JSON.parse(localStorage.getItem(Storage.CLIENTS_KEY) || '[]');
    const selectedClientId = document.getElementById('invClientSelect')?.value;
    const client = clients.find(c => c.id === selectedClientId) || {};

    const currencyCode = document.getElementById('invCurrency')?.value || biz.defaultCurrency || 'ZAR';
    const currencySymbol = getCurrencySymbol(currencyCode);

    const issueDate = document.getElementById('invIssueDate')?.value || '';
    const dueDate = document.getElementById('invDueDate')?.value || '';
    const invTitle = document.getElementById('invTitle')?.value || '';
    const discount = parseFloat(document.getElementById('invDiscount')?.value) || 0;
    const taxRate = parseFloat(document.getElementById('invTaxRate')?.value) || 0;
    const paymentTerms = document.getElementById('invPaymentTerms')?.value || '';
    const notes = document.getElementById('invNotes')?.value || '';

    let subtotal = 0;
    let lineItemsHtml = '';

    invoiceLineItems.forEach((item) => {
        let qtyOrHours = 0;
        let rateOrPrice = 0;
        let total = 0;
        const formattedDesc = escapeHtml(item.description || 'Description').replace(/\n/g, '<br>');

        if (currentBillingMode === 'hourly') {
            qtyOrHours = parseFloat(item.hours) || 0;
            rateOrPrice = parseFloat(item.rate) || 0;
            total = qtyOrHours * rateOrPrice;
            subtotal += total;

            lineItemsHtml += `
                <tr>
                    <td class="pdf-desc-cell">
                        <div class="pdf-task-text">${formattedDesc}</div>
                        ${item.date ? `<small class="text-muted">Date: ${item.date}</small>` : ''}
                    </td>
                    <td class="text-center align-top">${qtyOrHours} hrs</td>
                    <td class="text-right align-top">${currencySymbol} ${rateOrPrice.toFixed(2)}</td>
                    <td class="text-right align-top font-weight-bold">${currencySymbol} ${total.toFixed(2)}</td>
                </tr>
            `;
        } else {
            qtyOrHours = parseFloat(item.quantity) || 0;
            rateOrPrice = parseFloat(item.price) || 0;
            total = qtyOrHours * rateOrPrice;
            subtotal += total;

            lineItemsHtml += `
                <tr>
                    <td class="pdf-desc-cell">
                        <div class="pdf-task-text">${formattedDesc}</div>
                    </td>
                    <td class="text-center align-top">${qtyOrHours}</td>
                    <td class="text-right align-top">${currencySymbol} ${rateOrPrice.toFixed(2)}</td>
                    <td class="text-right align-top font-weight-bold">${currencySymbol} ${total.toFixed(2)}</td>
                </tr>
            `;
        }
    });

    const taxableBase = Math.max(0, subtotal - discount);
    const taxAmount = taxableBase * (taxRate / 100);
    const grandTotal = taxableBase + taxAmount;

    const templateContainer = document.getElementById('pdf-template-content');
    
    templateContainer.innerHTML = `
        <div class="invoice-paper a4-format" id="invoice-render-area">
            <!-- Blue Top Streak -->
            <div class="pdf-top-streak"></div>

            <!-- Header -->
            <div class="pdf-header">
                <div class="pdf-biz-info">
                    ${biz.logoData ? `<img src="${biz.logoData}" class="pdf-logo" alt="Logo">` : ''}
                    <h2>${escapeHtml(biz.businessName || 'Business Name')}</h2>
                    ${biz.contactName ? `<p>${escapeHtml(biz.contactName)}</p>` : ''}
                    ${biz.email ? `<p>Email: ${escapeHtml(biz.email)}</p>` : ''}
                    ${biz.phone ? `<p>Phone: ${escapeHtml(biz.phone)}</p>` : ''}
                    ${biz.website ? `<p>Web: ${escapeHtml(biz.website)}</p>` : ''}
                    ${biz.address ? `<p class="pdf-address-text">${escapeHtml(biz.address)}</p>` : ''}
                    ${biz.regNumber ? `<p>Reg No: ${escapeHtml(biz.regNumber)}</p>` : ''}
                    ${biz.vatNumber ? `<p>VAT No: ${escapeHtml(biz.vatNumber)}</p>` : ''}
                </div>
                <div class="pdf-inv-meta">
                    <h1 class="pdf-title">INVOICE</h1>
                    <p class="invoice-num-tag"><strong>Invoice #:</strong> ${escapeHtml(invNumber)}</p>
                    <p><strong>Issue Date:</strong> ${issueDate}</p>
                    <p><strong>Due Date:</strong> ${dueDate}</p>
                </div>
            </div>

            ${invTitle ? `
                <div class="pdf-subject-bar">
                    <strong>Subject:</strong> ${escapeHtml(invTitle)}
                </div>
            ` : ''}

            <!-- Client Info -->
            <div class="pdf-client-section">
                <div class="billed-to-box">
                    <h3>Billed To:</h3>
                    <p><strong>${escapeHtml(client.name || 'Client Name / Business')}</strong></p>
                    ${client.contactPerson ? `<p>Attn: ${escapeHtml(client.contactPerson)}</p>` : ''}
                    ${client.email ? `<p>Email: ${escapeHtml(client.email)}</p>` : ''}
                    ${client.phone ? `<p>Phone: ${escapeHtml(client.phone)}</p>` : ''}
                    ${client.address ? `<p>${escapeHtml(client.address)}</p>` : ''}
                    ${client.taxDetails ? `<p>Tax/Reg: ${escapeHtml(client.taxDetails)}</p>` : ''}
                </div>
            </div>

            <!-- Table -->
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th style="width: 55%;">Description / Task Details</th>
                        <th class="text-center" style="width: 15%;">${currentBillingMode === 'hourly' ? 'Hours' : 'Qty'}</th>
                        <th class="text-right" style="width: 15%;">Rate / Price</th>
                        <th class="text-right" style="width: 15%;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${lineItemsHtml}
                </tbody>
            </table>

            <!-- Totals -->
            <div class="pdf-totals-section">
                <div class="pdf-totals-table">
                    <div class="pdf-total-row"><span>Subtotal:</span> <span>${currencySymbol} ${subtotal.toFixed(2)}</span></div>
                    ${discount > 0 ? `<div class="pdf-total-row"><span>Discount:</span> <span>- ${currencySymbol}${discount.toFixed(2)}</span></div>` : ''}
                    ${taxRate > 0 ? `<div class="pdf-total-row"><span>Tax / VAT (${taxRate}%):</span> <span>${currencySymbol}${taxAmount.toFixed(2)}</span></div>` : ''}
                    <div class="pdf-total-row grand-total"><span>Amount Due:</span> <span>${currencySymbol} ${grandTotal.toFixed(2)}</span></div>
                </div>
            </div>

            <!-- Banking & Instructions Footer -->
            <div class="pdf-footer-group">
                <div class="pdf-bank-details">
                    <h4>Payment Instructions & Banking</h4>
                    ${biz.bankName ? `<p><strong>Bank:</strong> ${escapeHtml(biz.bankName)}</p>` : ''}
                    ${biz.accountHolder ? `<p><strong>Account Holder:</strong> ${escapeHtml(biz.accountHolder)}</p>` : ''}
                    ${biz.accountNumber ? `<p><strong>Account Number:</strong> ${escapeHtml(biz.accountNumber)}</p>` : ''}
                    ${biz.branchCode ? `<p><strong>Branch Code:</strong> ${escapeHtml(biz.branchCode)}</p>` : ''}
                    ${biz.paymentInfo ? `<p class="mt-1">${escapeHtml(biz.paymentInfo)}</p>` : ''}
                    ${paymentTerms ? `<p class="mt-1"><strong>Terms:</strong> ${escapeHtml(paymentTerms)}</p>` : ''}
                    ${notes ? `<p class="mt-1"><strong>Note:</strong> ${escapeHtml(notes)}</p>` : ''}
                </div>

                ${biz.qrData ? `
                    <div class="pdf-qr-corner-wrapper">
                        <div class="blue-corner-triangle"></div>
                        <div class="pdf-qr-box">
                            <img src="${biz.qrData}" alt="QR Code" class="pdf-qr">
                            <p class="qr-caption">Thank you for your business! Visit our website for more services.</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    openPreviewModal();
}

function openPreviewModal() {
    const modal = document.getElementById('preview-modal');
    if (modal) modal.style.display = 'flex';
}

function closePreviewModal() {
    const modal = document.getElementById('preview-modal');
    if (modal) modal.style.display = 'none';
}

function downloadInvoicePDF() {
    const element = document.getElementById('invoice-render-area');
    const invNumber = document.getElementById('invNumber')?.value || 'invoice';

    const opt = {
        margin:       0.2,
        filename:     `${invNumber}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    showToast('Generating A4 PDF...');
    html2pdf().set(opt).from(element).save().then(() => {
        showToast('A4 PDF downloaded successfully!');
    });
}
