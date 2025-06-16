// Responsive Tree Scaling Logic

let currentZoomLevel = 100;

// Calculate optimal tree size class based on number of members
function getTreeSizeClass(memberCount) {
    if (memberCount < 10) return 'tree-small';
    if (memberCount < 30) return 'tree-medium';
    if (memberCount < 60) return 'tree-large';
    return 'tree-xlarge';
}

// Auto-scale tree to fit viewport on desktop
function autoScaleTree() {
    // Only auto-scale on desktop
    if (window.innerWidth <= 768) return;
    
    const treeContainer = document.querySelector('.tree-container');
    const treeWrapper = document.querySelector('.tree-wrapper');
    const tree = document.querySelector('.tree');
    
    if (!tree || !treeContainer || !treeWrapper) return;
    
    // Reset any existing transforms
    treeWrapper.classList.remove('tree-scale-90', 'tree-scale-80', 'tree-scale-70', 'tree-scale-60', 'tree-scale-50');
    treeWrapper.classList.add('tree-scale-auto');
    
    // Wait for render
    setTimeout(() => {
        // Get actual dimensions
        const containerWidth = treeContainer.clientWidth - 80; // Account for padding
        const treeWidth = tree.scrollWidth;
        
        console.log('Container width:', containerWidth, 'Tree width:', treeWidth);
        
        // Calculate scale needed to fit
        if (treeWidth > containerWidth) {
            const scale = containerWidth / treeWidth;
            
            // Apply appropriate scale class
            if (scale >= 0.9) {
                treeWrapper.classList.remove('tree-scale-auto');
                treeWrapper.classList.add('tree-scale-90');
                currentZoomLevel = 90;
            } else if (scale >= 0.8) {
                treeWrapper.classList.remove('tree-scale-auto');
                treeWrapper.classList.add('tree-scale-80');
                currentZoomLevel = 80;
            } else if (scale >= 0.7) {
                treeWrapper.classList.remove('tree-scale-auto');
                treeWrapper.classList.add('tree-scale-70');
                currentZoomLevel = 70;
            } else if (scale >= 0.6) {
                treeWrapper.classList.remove('tree-scale-auto');
                treeWrapper.classList.add('tree-scale-60');
                currentZoomLevel = 60;
            } else {
                treeWrapper.classList.remove('tree-scale-auto');
                treeWrapper.classList.add('tree-scale-50');
                currentZoomLevel = 50;
            }
            
            updateZoomDisplay();
        }
    }, 100);
}

// Zoom controls removed - no longer needed

// Manual zoom function
function zoomTree(direction) {
    const treeWrapper = document.querySelector('.tree-wrapper');
    if (!treeWrapper) return;
    
    // Calculate new zoom level
    if (direction === 'in' && currentZoomLevel < 150) {
        currentZoomLevel += 10;
    } else if (direction === 'out' && currentZoomLevel > 50) {
        currentZoomLevel -= 10;
    }
    
    // Apply zoom
    applyZoomLevel(currentZoomLevel);
}

// Apply specific zoom level
function applyZoomLevel(level) {
    const treeWrapper = document.querySelector('.tree-wrapper');
    if (!treeWrapper) return;
    
    currentZoomLevel = level;
    
    // Remove all scale classes
    treeWrapper.classList.remove('tree-scale-auto', 'tree-scale-90', 'tree-scale-80', 'tree-scale-70', 'tree-scale-60', 'tree-scale-50');
    
    // Apply custom scale
    const tree = treeWrapper.querySelector('.tree');
    if (tree) {
        tree.style.transform = `scale(${level / 100})`;
    }
    
    updateZoomDisplay();
}

// Update zoom level display
function updateZoomDisplay() {
    const zoomLevelDisplay = document.querySelector('.zoom-level');
    if (zoomLevelDisplay) {
        zoomLevelDisplay.textContent = `${currentZoomLevel}%`;
    }
}

// Fit tree to screen
function fitTreeToScreen() {
    autoScaleTree();
}

// Apply size class based on family size
function applyTreeSizeClass() {
    const treeWrapper = document.querySelector('.tree-wrapper');
    const tree = document.querySelector('.tree');
    if (!treeWrapper || !tree) return;
    
    // Remove existing size classes
    tree.classList.remove('tree-small', 'tree-medium', 'tree-large', 'tree-xlarge');
    
    // Count family members
    const memberCount = window.familyMembers ? window.familyMembers.length : 0;
    
    // Apply appropriate size class
    const sizeClass = getTreeSizeClass(memberCount);
    tree.classList.add(sizeClass);
    
    console.log(`Applied tree size class: ${sizeClass} for ${memberCount} members`);
}

// Initialize responsive tree features
function initializeResponsiveTree() {
    // Apply size class
    applyTreeSizeClass();
    
    // Auto-scale to fit
    autoScaleTree();
    
    // Re-scale on window resize (debounced)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.innerWidth > 768) {
                autoScaleTree();
            }
        }, 250);
    });
}

// Export functions for global use
window.zoomTree = zoomTree;
window.fitTreeToScreen = fitTreeToScreen;
window.initializeResponsiveTree = initializeResponsiveTree;
window.autoScaleTree = autoScaleTree;

// Update the existing renderFamilyTree function
const originalRenderFamilyTree = window.renderFamilyTree;
window.renderFamilyTree = function() {
    // Call original render function
    if (originalRenderFamilyTree) {
        originalRenderFamilyTree();
    }
    
    // Initialize responsive features after rendering
    setTimeout(() => {
        initializeResponsiveTree();
    }, 100);
};