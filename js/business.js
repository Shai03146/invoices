/**
 * Shai Invoice Generator 2.0 - Business Profile Manager
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('business-form');
    if (!form) return;

    // Load saved profile data into form inputs
    loadBusinessProfile();

    // Setup image upload handlers for Logo and QR Code
    setupImageUpload('business-logo-input', 'business-logo-preview', 'logoData');
    setupImageUpload('business-qr-input', 'business-qr-preview', 'qrData');

    // Handle form submission and persistence
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveBusinessProfileFromForm();
    });
});

function loadBusinessProfile() {
    const profile = Storage.getBusinessProfile();
    
    // Populate text/number/select fields
    for (const key in profile) {
        const input = document.getElementById(key);
        if (input && input.type !== 'file') {
            input.value = profile[key] || '';
        }
    }

    // Restore image previews if available in storage
    if (profile.logoData) {
        showPreview('business-logo-preview', profile.logoData);
    }
    if (profile.qrData) {
        showPreview('business-qr-preview', profile.qrData);
    }
}

function saveBusinessProfileFromForm() {
    // Preserve existing stored data (like base64 images)
    const profile = Storage.getBusinessProfile() || {};
    
    const fields = [
        'businessName', 'contactName', 'regNumber', 'vatNumber',
        'email', 'phone', 'website', 'address',
        'bankName', 'accountHolder', 'accountNumber', 'branchCode', 'paymentInfo',
        'defaultCurrency'
    ];

    fields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el) {
            profile[fieldId] = el.value.trim();
        }
    });

    Storage.saveBusinessProfile(profile);
    showToast('Business profile saved successfully!');
}

function setupImageUpload(inputId, previewId, storageKey) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(uploadEvent) {
            const base64Data = uploadEvent.target.result;
            showPreview(previewId, base64Data);

            // Immediately save image data to profile storage
            const profile = Storage.getBusinessProfile();
            profile[storageKey] = base64Data;
            Storage.saveBusinessProfile(profile);
            showToast('Image uploaded & saved!');
        };
        reader.readAsDataURL(file);
    });
}

function showPreview(previewId, dataUrl) {
    const container = document.getElementById(previewId);
    if (!container) return;
    container.innerHTML = `<img src="${dataUrl}" alt="Preview" style="max-width: 120px; max-height: 120px; border-radius: 6px; object-fit: contain; border: 1px solid #ced4da; padding: 2px;">`;
}

function showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: #198754; color: #fff; padding: 10px 20px; border-radius: 6px;
            font-size: 0.85rem; z-index: 2000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 2500);
}
