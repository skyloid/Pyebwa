// UI helper functions for Pyebwa app
// Extracted from app.js for modularity

// Show loading state
window.showLoadingState = function(message = 'Loading...') {
    const loadingView = document.getElementById('loadingView');
    if (loadingView) {
        loadingView.style.display = 'flex';
        const messageEl = loadingView.querySelector('p');
        if (messageEl && message !== 'Loading...') {
            messageEl.textContent = message;
        }
    }
    document.querySelectorAll('.view-container').forEach(view => {
        if (view.id !== 'loadingView') {
            view.style.display = 'none';
        }
    });
};

// Hide loading state
window.hideLoadingState = function() {
    const loadingView = document.getElementById('loadingView');
    if (loadingView) {
        loadingView.style.display = 'none';
    }
};

// Show success message
window.showSuccess = function(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification success';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// Show error message
window.showError = function(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification error';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f44336;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
};

// Close all modals
window.closeAllModals = function() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
        const form = modal.querySelector('form');
        if (form) form.reset();
    });
    window.editingMemberId = null;
};
