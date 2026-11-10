/**
 * Shai Invoice Generator 2.0 - Client Database Manager
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize client UI elements when switching to the client tab or loading
    initClientModule();
});

function initClientModule() {
    const addClientBtn = document.getElementById('add-client-btn');
    const clientModal = document.getElementById('client-modal');
    const clientForm = document.getElementById('client-form');
    const cancelClientBtn = document.getElementById('cancel-client-btn');
    const clientSearchInput = document.getElementById('client-search');

    if (!addClientBtn) return;

    // Open Modal for New Client
    addClientBtn.addEventListener('click', () => {
        openClientModal();
    });

    // Close Modal
    cancelClientBtn.addEventListener('click', () => {
        closeClientModal();
    });

    // Handle Client Form Submit (Create / Update)
    clientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveClientFromModal();
    });

    // Handle Search Filtering
    clientSearchInput.addEventListener('input', (e) => {
        renderClientList(e.target.value);
    });

    // Initial render of client list
    renderClientList();
}

function getClients() {
    const data = localStorage.getItem(Storage.CLIENTS_KEY);
    return data ? JSON.parse(data) : [];
}

function saveClients(clients) {
    localStorage.setItem(Storage.CLIENTS_KEY, JSON.stringify(clients));
}

function openClientModal(client = null) {
    const modal = document.getElementById('client-modal');
    const titleEl = document.getElementById('modal-title');
    const form = document.getElementById('client-form');

    form.reset();
    document.getElementById('clientId').value = '';

    if (client) {
        titleEl.textContent = 'Edit Client';
        document.getElementById('clientId').value = client.id;
        document.getElementById('clientName').value = client.name || '';
        document.getElementById('clientContactPerson').value = client.contactPerson || '';
        document.getElementById('clientEmail').value = client.email || '';
        document.getElementById('clientPhone').value = client.phone || '';
        document.getElementById('clientAddress').value = client.address || '';
        document.getElementById('clientTaxDetails').value = client.taxDetails || '';
        document.getElementById('clientCountry').value = client.country || '';
        document.getElementById('clientCurrency').value = client.currency || '';
        document.getElementById('clientNotes').value = client.notes || '';
    } else {
        titleEl.textContent = 'Add New Client';
    }

    modal.style.display = 'flex';
}

function closeClientModal() {
    const modal = document.getElementById('client-modal');
    modal.style.display = 'none';
}

function saveClientFromModal() {
    const id = document.getElementById('clientId').value;
    const clients = getClients();

    const clientData = {
        id: id ? id : 'client_' + Date.now(),
        name: document.getElementById('clientName').value.trim(),
        contactPerson: document.getElementById('clientContactPerson').value.trim(),
        email: document.getElementById('clientEmail').value.trim(),
        phone: document.getElementById('clientPhone').value.trim(),
        address: document.getElementById('clientAddress').value.trim(),
        taxDetails: document.getElementById('clientTaxDetails').value.trim(),
        country: document.getElementById('clientCountry').value.trim(),
        currency: document.getElementById('clientCurrency').value.trim(),
        notes: document.getElementById('clientNotes').value.trim(),
        updatedAt: new Date().toISOString()
    };

    if (id) {
        // Update existing
        const index = clients.findIndex(c => c.id === id);
        if (index !== -1) {
            clients[index] = clientData;
        }
        showToast('Client updated successfully!');
    } else {
        // Add new
        clients.push(clientData);
        showToast('Client added successfully!');
    }

    saveClients(clients);
    closeClientModal();
    renderClientList(document.getElementById('client-search').value);
}

function renderClientList(searchQuery = '') {
    const container = document.getElementById('client-list-container');
    if (!container) return;

    let clients = getClients();

    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        clients = clients.filter(c => 
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.contactPerson && c.contactPerson.toLowerCase().includes(query)) ||
            (c.email && c.email.toLowerCase().includes(query))
        );
    }

    if (clients.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No clients found. Tap "+ Add New Client" to create one.</p>
            </div>
        `;
        return;
    }

    let html = '';
    clients.forEach(client => {
        html += `
            <div class="client-card" data-id="${client.id}">
                <div class="client-info">
                    <h4>${escapeHtml(client.name)}</h4>
                    ${client.contactPerson ? `<p class="client-sub">Contact: ${escapeHtml(client.contactPerson)}</p>` : ''}
                    ${client.email ? `<p class="client-sub">Email: ${escapeHtml(client.email)}</p>` : ''}
                    ${client.phone ? `<p class="client-sub">Phone: ${escapeHtml(client.phone)}</p>` : ''}
                </div>
                <div class="client-actions">
                    <button class="btn-icon edit-client" onclick="editClient('${client.id}')" title="Edit">✏️</button>
                    <button class="btn-icon delete-client" onclick="deleteClient('${client.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function editClient(id) {
    const clients = getClients();
    const client = clients.find(c => c.id === id);
    if (client) {
        openClientModal(client);
    }
}

function deleteClient(id) {
    if (!confirm('Are you sure you want to delete this client?')) return;
    let clients = getClients();
    clients = clients.filter(c => c.id !== id);
    saveClients(clients);
    renderClientList(document.getElementById('client-search').value);
    showToast('Client deleted.');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&#039;');
}
