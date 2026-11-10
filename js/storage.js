/**
 * Shai Invoice Generator 2.0 - Local Storage Management
 */
const Storage = {
    BUSINESS_KEY: 'shai_invoice_business_profile',
    CLIENTS_KEY: 'shai_invoice_clients',
    INVOICES_KEY: 'shai_invoice_records',

    // Business Profile Methods
    getBusinessProfile() {
        const data = localStorage.getItem(this.BUSINESS_KEY);
        return data ? JSON.parse(data) : {};
    },

    saveBusinessProfile(profileData) {
        localStorage.setItem(this.BUSINESS_KEY, JSON.stringify(profileData));
    }
};
