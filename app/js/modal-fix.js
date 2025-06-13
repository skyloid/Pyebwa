// Modal Fix and Debugging Script

// Debug modal state
window.debugModal = function() {
    const modal = document.getElementById('addMemberModal');
    if (!modal) {
        console.error('Modal not found!');
        return;
    }
    
    console.log('Modal Debug Info:');
    console.log('- Classes:', modal.className);
    console.log('- Has active class:', modal.classList.contains('active'));
    console.log('- Computed display:', window.getComputedStyle(modal).display);
    console.log('- Computed visibility:', window.getComputedStyle(modal).visibility);
    console.log('- Computed opacity:', window.getComputedStyle(modal).opacity);
    
    // Check close button
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        console.log('- Close button found:', closeBtn);
        console.log('- Close button onclick:', closeBtn.onclick);
        const listeners = getEventListeners ? getEventListeners(closeBtn) : 'Cannot check listeners';
        console.log('- Close button listeners:', listeners);
    } else {
        console.error('- Close button NOT found!');
    }
    
    return modal;
};

// Force close modal
window.forceCloseModal = function() {
    const modal = document.getElementById('addMemberModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        
        // Reset display after a moment
        setTimeout(() => {
            modal.style.display = '';
        }, 100);
        
        // Reset form
        const form = modal.querySelector('form');
        if (form) form.reset();
        
        // Clear editing state if available
        if (window.editingMemberId !== undefined) {
            window.editingMemberId = null;
        }
        
        console.log('Modal force closed');
    }
};

// Re-initialize modal listeners
window.reinitModalListeners = function() {
    const modal = document.getElementById('addMemberModal');
    if (!modal) return;
    
    // Remove any existing listeners by cloning
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        // Add new listener
        newCloseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Close button clicked');
            modal.classList.remove('active');
            const form = modal.querySelector('form');
            if (form) form.reset();
            if (window.editingMemberId !== undefined) {
                window.editingMemberId = null;
            }
        });
        console.log('Close button listener re-attached');
    }
    
    // Cancel button
    const cancelBtn = modal.querySelector('.btn-secondary');
    if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        newCancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Cancel button clicked');
            modal.classList.remove('active');
            const form = modal.querySelector('form');
            if (form) form.reset();
            if (window.editingMemberId !== undefined) {
                window.editingMemberId = null;
            }
        });
        console.log('Cancel button listener re-attached');
    }
    
    console.log('Modal listeners reinitialized');
};

// Auto-fix on load
document.addEventListener('DOMContentLoaded', function() {
    // Give other scripts time to load
    setTimeout(() => {
        const modal = document.getElementById('addMemberModal');
        if (modal && modal.classList.contains('active')) {
            console.warn('Modal was active on load - closing it');
            modal.classList.remove('active');
        }
        
        // Ensure modal has proper initial state
        if (modal && window.getComputedStyle(modal).display !== 'none' && !modal.classList.contains('active')) {
            console.warn('Modal display issue detected - fixing');
            modal.style.display = 'none';
            setTimeout(() => {
                modal.style.display = '';
            }, 100);
        }
    }, 1000);
});

console.log('Modal fix script loaded. Available commands:');
console.log('- debugModal() - Check modal state');
console.log('- forceCloseModal() - Force close the modal');
console.log('- reinitModalListeners() - Reinitialize event listeners');