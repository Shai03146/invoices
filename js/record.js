/**
 * Shai Invoice Generator 2.0 - Records, History, & Backup Manager
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize records module after a brief delay to ensure DOM is fully ready
    setTimeout(() => {
        initRecordsModule();
    }, 150);
});

function initRecordsModule() {
    renderInvoiceHistory();

    const exportBtn = document.getElementById('export-data-btn');
    const importInput = document.getElementById('import-data-input');
    const historySearch = document.getElementById('history-search');
    const saveRecordBtn = document.getElementById('save-invoice-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportAppData);
    }

    if (importInput) {
        importInput.addEventListener('change', importAppData);
    }

    if (historySearch) {
        historySearch.addEventListener('input', (e) => {
            renderInvoiceHistory(e.target.value);
        });
    }

    if (saveRecordBtn) {
        saveRecordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveCurrentInvoiceRecord('Saved');
        });
    }
}

function getSavedInvoices() {
    try {
        const data = localStorage.getItem(Storage.INVOICES_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading invoices from storage:', e);
        return [];
    }
}

function saveInvoicesToStorage(records) {
    try {
        localStorage.setItem(Storage.INVOICES_KEY, JSON.stringify(records));
    } catch (e) {
        console.error('Error saving invoices to storage:', e);
        alert('Failed to save to local storage.');
    }
}

function saveCurrentInvoiceRecord(status = 'Saved') {
    const invNumberEl = document.getElementById('invNumber');
    const invNumber = invNumberEl ? invNumberEl.value.trim() : '';

    if (!invNumber) {
        alert('Please enter an Invoice Number before saving.');
        return;
    }

    const records = getSavedInvoices();
    const existingIndex = records.findIndex(r => r.invNumber === invNumber);

    const clientSelect = document.getElementById('invClientSelect');
    const clients = JSON.parse(localStorage.getItem(Storage.CLIENTS_KEY) || '[]');
    const selectedClient = clients.find(c => c.id === (clientSelect ? clientSelect.value : '')) || {};

    const mode = typeof currentBillingMode !== 'undefined' ? currentBillingMode : 'fixed';
    const items = typeof invoiceLineItems !== 'undefined' ? invoiceLineItems : [];

    const recordData = {
        id: existingIndex !== -1 ? records[existingIndex].id : 'inv_' + Date.now(),
        invNumber: invNumber,
        currency: document.getElementById('invCurrency')?.value || 'ZAR',
        issueDate: document.getElementById('invIssueDate')?.value || '',
        dueDate: document.getElementById('invDueDate')?.value || '',
        title: document.getElementById('invTitle')?.value || '',
        clientId: clientSelect ? clientSelect.value : '',
        clientName: selectedClient.name || 'Unsaved Client',
        billingMode: mode,
        lineItems: JSON.parse(JSON.stringify(items)),
        discount: parseFloat(document.getElementById('invDiscount')?.value) || 0,
        taxRate: parseFloat(document.getElementById('invTaxRate')?.value) || 0,
        paymentTerms: document.getElementById('invPaymentTerms')?.value || '',
        notes: document.getElementById('invNotes')?.value || '',
        status: status,
        updatedAt: new Date().toISOString()
    };

    if (existingIndex !== -1) {
        records[existingIndex] = recordData;
    } else {
        records.push(recordData);
    }

    saveInvoicesToStorage(records);
    renderInvoiceHistory();
    showToast(`Invoice ${invNumber} saved successfully!`);
}

function renderInvoiceHistory(query = '') {
    const container = document.getElementById('history-list-container');
    if (!container) return;

    let records = getSavedInvoices();

    if (query && query.trim() !== '') {
        const q = query.toLowerCase();
        records = records.filter(r => 
            (r.invNumber && r.invNumber.toLowerCase().includes(q)) ||
            (r.clientName && r.clientName.toLowerCase().includes(q)) ||
            (r.title && r.title.toLowerCase().includes(q))
        );
    }

    // Sort newest first
    records.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (records.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No saved invoice history yet.</p>
            </div>
        `;
        return;
    }

    let html = '';
    records.forEach(r => {
        let subtotal = 0;
        (r.lineItems || []).forEach(item => {
            if (r.billingMode === 'hourly') {
                subtotal += (parseFloat(item.hours) || 0) * (parseFloat(item.rate) || 0);
            } else {
                subtotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            }
        });
        const taxable = Math.max(0, subtotal - (r.discount || 0));
        const total = taxable + (taxable * ((r.taxRate || 0) / 100));
        const symbol = getCurrencySymbol(r.currency || 'ZAR');

        html += `
            <div class="history-card" style="margin-bottom: 0.5rem;">
                <div class="history-main" style="flex: 1;">
                    <div class="history-header">
                        <strong>${escapeHtml(r.invNumber)}</strong>
                        <span class="status-badge ${r.status ? r.status.toLowerCase() : 'saved'}">${escapeHtml(r.status || 'Saved')}</span>
                    </div>
                    <p class="history-client">${escapeHtml(r.clientName)}</p>
                    <p class="history-sub">${r.issueDate ? `Issued: ${r.issueDate}` : ''} | Total: <strong>${symbol} ${total.toFixed(2)}</strong></p>
                </div>
                <div class="history-actions">
                    <button type="button" class="btn-icon" onclick="loadInvoiceToBuilder('${r.id}')" title="Load/Edit">✏️</button>
                    <button type="button" class="btn-icon" onclick="deleteInvoiceRecord('${r.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function loadInvoiceToBuilder(id) {
    const records = getSavedInvoices();
    const r = records.find(item => item.id === id);
    if (!r) return;

    if (document.getElementById('invNumber')) document.getElementById('invNumber').value = r.invNumber || '';
    if (document.getElementById('invCurrency')) document.getElementById('invCurrency').value = r.currency || 'ZAR';
    if (document.getElementById('invIssueDate')) document.getElementById('invIssueDate').value = r.issueDate || '';
    if (document.getElementById('invDueDate')) document.getElementById('invDueDate').value = r.dueDate || '';
    if (document.getElementById('invTitle')) document.getElementById('invTitle').value = r.title || '';
    if (document.getElementById('invClientSelect')) document.getElementById('invClientSelect').value = r.clientId || '';
    if (document.getElementById('invDiscount')) document.getElementById('invDiscount').value = r.discount || 0;
    if (document.getElementById('invTaxRate')) document.getElementById('invTaxRate').value = r.taxRate || 0;
    if (document.getElementById('invPaymentTerms')) document.getElementById('invPaymentTerms').value = r.paymentTerms || '';
    if (document.getElementById('invNotes')) document.getElementById('invNotes').value = r.notes || '';

    currentBillingMode = r.billingMode || 'fixed';
    invoiceLineItems = JSON.parse(JSON.stringify(r.lineItems || []));

    if (typeof switchBillingMode === 'function') {
        switchBillingMode(currentBillingMode);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Loaded ${r.invNumber} into builder.`);
}

function deleteInvoiceRecord(id) {
    if (!confirm('Are you sure you want to delete this invoice record?')) return;
    let records = getSavedInvoices();
    records = records.filter(r => r.id !== id);
    saveInvoicesToStorage(records);
    renderInvoiceHistory(document.getElementById('history-search')?.value || '');
    showToast('Invoice record deleted.');
}

function exportAppData() {
    const backupData = {
        app: 'Shai Invoice Generator 2.0',
        exportedAt: new Date().toISOString(),
        businessProfile: Storage.getBusinessProfile(),
        clients: JSON.parse(localStorage.getItem(Storage.CLIENTS_KEY) || '[]'),
        invoices: getSavedInvoices()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `shai_invoice_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('App data backup exported!');
}

function importAppData(e) /**
 * Shai Invoice Generator 2.0 - Records, History, & Backup Manager
 */

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initRecordsModule();
    }, 150);
});

function initRecordsModule() {
    renderInvoiceHistory();

    const exportBtn = document.getElementById('export-data-btn');
    const importInput = document.getElementById('import-data-input');
    const historySearch = document.getElementById('history-search');
    const saveRecordBtn = document.getElementById('save-invoice-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportAppData);
    }

    if (importInput) {
        importInput.addEventListener('change', importAppData);
    }

    if (historySearch) {
        historySearch.addEventListener('input', (e) => {
            renderInvoiceHistory(e.target.value);
        });
    }

    if (saveRecordBtn) {
        saveRecordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveCurrentInvoiceRecord('Saved');
        });
    }
}

function getSavedInvoices() {
    try {
        const data = localStorage.getItem(Storage.INVOICES_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading invoices from storage:', e);
        return [];
    }
}

function saveInvoicesToStorage(records) {
    try {
        localStorage.setItem(Storage.INVOICES_KEY, JSON.stringify(records));
    } catch (e) {
        console.error('Error saving invoices to storage:', e);
        alert('Failed to save to local storage.');
    }
}

function saveCurrentInvoiceRecord(status = 'Saved') {
    const invNumberEl = document.getElementById('invNumber');
    const invNumber = invNumberEl ? invNumberEl.value.trim() : '';

    if (!invNumber) {
        alert('Please enter an Invoice Number before saving.');
        return;
    }

    const records = getSavedInvoices();
    const existingIndex = records.findIndex(r => r.invNumber === invNumber);

    const clientSelect = document.getElementById('invClientSelect');
    const clients = JSON.parse(localStorage.getItem(Storage.CLIENTS_KEY) || '[]');
    const selectedClient = clients.find(c => c.id === (clientSelect ? clientSelect.value : '')) || {};

    const mode = typeof currentBillingMode !== 'undefined' ? currentBillingMode : 'fixed';
    const items = typeof invoiceLineItems !== 'undefined' ? invoiceLineItems : [];

    const recordData = {
        id: existingIndex !== -1 ? records[existingIndex].id : 'inv_' + Date.now(),
        invNumber: invNumber,
        currency: document.getElementById('invCurrency')?.value || 'ZAR',
        issueDate: document.getElementById('invIssueDate')?.value || '',
        dueDate: document.getElementById('invDueDate')?.value || '',
        title: document.getElementById('invTitle')?.value || '',
        clientId: clientSelect ? clientSelect.value : '',
        clientName: selectedClient.name || 'Unsaved Client',
        billingMode: mode,
        lineItems: JSON.parse(JSON.stringify(items)),
        discount: parseFloat(document.getElementById('invDiscount')?.value) || 0,
        taxRate: parseFloat(document.getElementById('invTaxRate')?.value) || 0,
        paymentTerms: document.getElementById('invPaymentTerms')?.value || '',
        notes: document.getElementById('invNotes')?.value || '',
        status: status,
        updatedAt: new Date().toISOString()
    };

    if (existingIndex !== -1) {
        records[existingIndex] = recordData;
    } else {
        records.push(recordData);
    }

    saveInvoicesToStorage(records);
    renderInvoiceHistory();

    // Visual button feedback flash
    const saveBtn = document.getElementById('save-invoice-btn');
    if (saveBtn) {
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved ✓';
        saveBtn.classList.add('btn-success-flash');
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.classList.remove('btn-success-flash');
        }, 1500);
    }

    showToast(`Invoice ${invNumber} saved successfully!`);
}

function renderInvoiceHistory(query = '') {
    const container = document.getElementById('history-list-container');
    if (!container) return;

    let records = getSavedInvoices();

    if (query && query.trim() !== '') {
        const q = query.toLowerCase();
        records = records.filter(r => 
            (r.invNumber && r.invNumber.toLowerCase().includes(q)) ||
            (r.clientName && r.clientName.toLowerCase().includes(q)) ||
            (r.title && r.title.toLowerCase().includes(q))
        );
    }

    records.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (records.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No saved invoice history yet.</p>
            </div>
        `;
        return;
    }

    let html = '';
    records.forEach(r => {
        let subtotal = 0;
        (r.lineItems || []).forEach(item => {
            if (r.billingMode === 'hourly') {
                subtotal += (parseFloat(item.hours) || 0) * (parseFloat(item.rate) || 0);
            } else {
                subtotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            }
        });
        const taxable = Math.max(0, subtotal - (r.discount || 0));
        const total = taxable + (taxable * ((r.taxRate || 0) / 100));
        const symbol = getCurrencySymbol(r.currency || 'ZAR');

        html += `
            <div class="history-card" style="margin-bottom: 0.5rem;">
                <div class="history-main" style="flex: 1;">
                    <div class="history-header">
                        <strong>${escapeHtml(r.invNumber)}</strong>
                        <span class="status-badge ${r.status ? r.status.toLowerCase() : 'saved'}">${escapeHtml(r.status || 'Saved')}</span>
                    </div>
                    <p class="history-client">${escapeHtml(r.clientName)}</p>
                    <p class="history-sub">${r.issueDate ? `Issued: ${r.issueDate}` : ''} | Total: <strong>${symbol} ${total.toFixed(2)}</strong></p>
                </div>
                <div class="history-actions">
                    <button type="button" class="btn-icon" onclick="loadInvoiceToBuilder('${r.id}')" title="Load/Edit">✏️</button>
                    <button type="button" class="btn-icon" onclick="deleteInvoiceRecord('${r.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function loadInvoiceToBuilder(id) {
    const records = getSavedInvoices();
    const r = records.find(item => item.id === id);
    if (!r) return;

    if (document.getElementById('invNumber')) document.getElementById('invNumber').value = r.invNumber || '';
    if (document.getElementById('invCurrency')) document.getElementById('invCurrency').value = r.currency || 'ZAR';
    if (document.getElementById('invIssueDate')) document.getElementById('invIssueDate').value = r.issueDate || '';
    if (document.getElementById('invDueDate')) document.getElementById('invDueDate').value = r.dueDate || '';
    if (document.getElementById('invTitle')) document.getElementById('invTitle').value = r.title || '';
    if (document.getElementById('invClientSelect')) document.getElementById('invClientSelect').value = r.clientId || '';
    if (document.getElementById('invDiscount')) document.getElementById('invDiscount').value = r.discount || 0;
    if (document.getElementById('invTaxRate')) document.getElementById('invTaxRate').value = r.taxRate || 0;
    if (document.getElementById('invPaymentTerms')) document.getElementById('invPaymentTerms').value = r.paymentTerms || '';
    if (document.getElementById('invNotes')) document.getElementById('invNotes').value = r.notes || '';

    currentBillingMode = r.billingMode || 'fixed';
    invoiceLineItems = JSON.parse(JSON.stringify(r.lineItems || []));

    if (typeof switchBillingMode === 'function') {
        switchBillingMode(currentBillingMode);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Loaded ${r.invNumber} into builder.`);
}

function deleteInvoiceRecord(id) {
    if (!confirm('Are you sure you want to delete this invoice record?')) return;
    let records = getSavedInvoices();
    records = records.filter(r => r.id !== id);
    saveInvoicesToStorage(records);
    renderInvoiceHistory(document.getElementById('history-search')?.value || '');
    showToast('Invoice record deleted.');
}

function exportAppData() {
    const backupData = {
        app: 'Shai Invoice Generator 2.0',
        exportedAt: new Date().toISOString(),
        businessProfile: Storage.getBusinessProfile(),
        clients: JSON.parse(localStorage.getItem(Storage.CLIENTS_KEY) || '[]'),
        invoices: getSavedInvoices()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `shai_invoice_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('App data backup exported!');
}

function importAppData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (!data.businessProfile && !data.clients && !data.invoices) {
                alert('Invalid backup file structure.');
                return;
            }

            if (confirm('Importing will merge/overwrite existing data on this device. Continue?')) {
                if (data.businessProfile) Storage.saveBusinessProfile(data.businessProfile);
                if (data.clients) localStorage.setItem(Storage.CLIENTS_KEY, JSON.stringify(data.clients));
                if (data.invoices) localStorage.setItem(Storage.INVOICES_KEY, JSON.stringify(data.invoices));

                alert('Data successfully imported!');
                window.location.reload();
            }
        } catch (err) {
            alert('Error parsing JSON backup file.');
        }
    };
    reader.readAsText(file);
}

