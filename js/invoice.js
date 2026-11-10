/**
 * Shai Invoice Generator 2.0 - Invoice Builder & Calculation Engine
 */

let currentBillingMode = 'fixed'; // 'fixed' or 'hourly'
let invoiceLineItems = [];

document.addEventListener('DOMContentLoaded', () => {
    initInvoiceModule();
});

function initInvoiceModule() {
    const invoiceSection = document.getElementById('section-invoice');
    if (!invoiceSection) return;

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + 14);
    const defaultDueDate = dueDateObj.toISOString().split('T')[0];

    const issueDateEl = document.getElementById('invIssueDate');
    const dueDateEl = document.getElementById('invDueDate');
    const invNumberEl = document.getElementById('invNumber');

    if (issueDateEl && !issueDateEl.value) issueDateEl.value = today;
    if (dueDateEl && !dueDateEl.value) dueDateEl.value = defaultDueDate;
    if (invNumberEl && !invNumberEl.value) invNumberEl.value = generateInvoiceNumber();

    // Populate Client Dropdown
    populateInvoiceClientDropdown();

    // Populate Currency Dropdown from Business Profile default
    const bizProfile = Storage.getBusinessProfile();
    const currencyEl = document.getElementById('invCurrency');
    if (currencyEl && bizProfile.defaultCurrency) {
        currencyEl.value = bizProfile.defaultCurrency;
    }

    // Billing Mode Toggle Listeners
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.getAttribute('data-mode');
            switchBillingMode(mode);
        });
    });

    // Add Line Item Button
    const addItemBtn = document.getElementById('add-line-item-btn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            addLineItem();
        });
    }

    // Save Invoice Record Button
    const saveRecordBtn = document.getElementById('save-invoice-btn');
    if (saveRecordBtn) {
        saveRecordBtn.onclick = function() {
            if (typeof saveCurrentInvoiceRecord === 'function') {
                saveCurrentInvoiceRecord('Saved');
            } else {
                alert('Record manager script not loaded yet.');
            }
        };
    }

    // Calculation triggers on discount/tax change
    ['invDiscount', 'invTaxRate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calculateInvoiceTotals);
        }
    });

    // Client dropdown change listener
    const clientSelect = document.getElementById('invClientSelect');
    if (clientSelect) {
        clientSelect.addEventListener('change', (e) => {
            onClientSelected(e.target.value);
        });
    }

    // Initialize with one default empty line item if empty
    if (invoiceLineItems.length === 0) {
        addLineItem();
    }
}

function generateInvoiceNumber() {
    const records = JSON.parse(localStorage.getItem(Storage.INVOICES_KEY) || '[]');
    const year = new Date().getFullYear();
    const count = records.length + 1;
    return `INV-${year}-${String(count).padStart(3, '0')}`;
}

function populateInvoiceClientDropdown() {
    const select = document.getElementById('invClientSelect');
    if (!select) return;

    const clients = JSON.parse(localStorage.getItem(Storage.CLIENTS_KEY) || '[]');
    let html = '<option value="">-- Select Saved Client --</option>';
    
    clients.forEach(c => {
        html += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
    });

    select.innerHTML = html;
}

function onClientSelected(clientId) {
    if (!clientId) return;
    const clients = JSON.parse(localStorage.getItem(Storage.CLIENTS_KEY) || '[]');
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    if (client.currency) {
        const currencyEl = document.getElementById('invCurrency');
        if (currencyEl) currencyEl.value = client.currency;
    }
}

function switchBillingMode(mode) {
    currentBillingMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.getAttribute('data-mode') === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderLineItems();
}

function addLineItem() {
    if (currentBillingMode === 'hourly') {
        invoiceLineItems.push({
            id: 'item_' + Date.now(),
            description: '',
            date: new Date().toISOString().split('T')[0],
            hours: 1,
            rate: 0
        });
    } else {
        invoiceLineItems.push({
            id: 'item_' + Date.now(),
            description: '',
            quantity: 1,
            price: 0
        });
    }
    renderLineItems();
}

function removeLineItem(index) {
    if (invoiceLineItems.length <= 1) {
        showToast('Invoice must have at least one line item.');
        return;
    }
    invoiceLineItems.splice(index, 1);
    renderLineItems();
}

function updateLineItemField(index, field, value) {
    if (invoiceLineItems[index]) {
        invoiceLineItems[index][field] = value;
        calculateInvoiceTotals();
    }
}

function renderLineItems() {
    const container = document.getElementById('line-items-container');
    if (!container) return;

    let html = '';
    invoiceLineItems.forEach((item, index) => {
        if (currentBillingMode === 'hourly') {
            const lineTotal = (parseFloat(item.hours) || 0) * (parseFloat(item.rate) || 0);
            html += `
                <div class="line-item-row" data-index="${index}">
                    <div class="item-header-row">
                        <span class="item-number">Task Entry #${index + 1}</span>
                        <button type="button" class="btn-remove-item" onclick="removeLineItem(${index})">✕ Remove</button>
                    </div>
                    <div class="form-group">
                        <label>Task Description (Supports paragraphs & bullet points)</label>
                        <textarea rows="3" placeholder="• Completed X&#10;• Investigated Y&#10;• Deployed Z" oninput="updateLineItemField(${index}, 'description', this.value)">${escapeHtml(item.description)}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group half">
                            <label>Date of Service</label>
                            <input type="date" value="${item.date || ''}" onchange="updateLineItemField(${index}, 'date', this.value)">
                        </div>
                        <div class="form-group half">
                            <label>Hours Worked</label>
                            <input type="number" step="0.5" min="0" value="${item.hours}" oninput="updateLineItemField(${index}, 'hours', this.value)">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group half">
                            <label>Hourly Rate</label>
                            <input type="number" step="0.01" min="0" value="${item.rate}" oninput="updateLineItemField(${index}, 'rate', this.value)">
                        </div>
                        <div class="form-group half">
                            <label>Line Total</label>
                            <div class="line-total-display"><span>${lineTotal.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            html += `
                <div class="line-item-row" data-index="${index}">
                    <div class="item-header-row">
                        <span class="item-number">Service Item #${index + 1}</span>
                        <button type="button" class="btn-remove-item" onclick="removeLineItem(${index})">✕ Remove</button>
                    </div>
                    <div class="form-group">
                        <label>Service or Product Description (Supports paragraphs & bullet points)</label>
                        <textarea rows="3" placeholder="• Detailed scope of work&#10;• Deliverables included" oninput="updateLineItemField(${index}, 'description', this.value)">${escapeHtml(item.description)}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group half">
                            <label>Quantity</label>
                            <input type="number" step="1" min="1" value="${item.quantity}" oninput="updateLineItemField(${index}, 'quantity', this.value)">
                        </div>
                        <div class="form-group half">
                            <label>Price per Unit</label>
                            <input type="number" step="0.01" min="0" value="${item.price}" oninput="updateLineItemField(${index}, 'price', this.value)">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Line Total</label>
                        <div class="line-total-display"><span>${lineTotal.toFixed(2)}</span></div>
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html;
    calculateInvoiceTotals();
}

function calculateInvoiceTotals() {
    let subtotal = 0;

    invoiceLineItems.forEach(item => {
        if (currentBillingMode === 'hourly') {
            subtotal += (parseFloat(item.hours) || 0) * (parseFloat(item.rate) || 0);
        } else {
            subtotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
        }
    });

    const discountInput = parseFloat(document.getElementById('invDiscount')?.value) || 0;
    const taxRateInput = parseFloat(document.getElementById('invTaxRate')?.value) || 0;

    const discountAmount = discountInput;
    const taxableBase = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxableBase * (taxRateInput / 100);
    const grandTotal = taxableBase + taxAmount;

    const currencySymbol = getCurrencySymbol(document.getElementById('invCurrency')?.value || 'ZAR');

    document.getElementById('summary-subtotal').textContent = `${currencySymbol} ${subtotal.toFixed(2)}`;
    document.getElementById('summary-discount').textContent = `- ${currencySymbol} ${discountAmount.toFixed(2)}`;
    document.getElementById('summary-tax').textContent = `${currencySymbol} ${taxAmount.toFixed(2)}`;
    document.getElementById('summary-total').textContent = `${currencySymbol} ${grandTotal.toFixed(2)}`;
}

function getCurrencySymbol(code) {
    switch(code) {
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'AUD': return 'A$';
        case 'ZAR': default: return 'R';
    }
}
