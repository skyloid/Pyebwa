// Enhanced Tree Controls for Pyebwa Family Tree
(function() {
    'use strict';
    
    const TreeControls = {
        // Control state
        state: {
            zoom: 100,
            minZoom: 25,
            maxZoom: 200,
            zoomStep: 10,
            isPanning: false,
            startX: 0,
            startY: 0,
            scrollLeft: 0,
            scrollTop: 0,
            viewMode: 'full', // full, ancestors, descendants, hourglass
            isFullscreen: false
        },
        
        // Initialize controls
        init() {
            this.createControlsUI();
            this.attachEventListeners();
            this.setupKeyboardShortcuts();
            this.initializePanZoom();
        },
        
        // Create controls UI
        createControlsUI() {
            const treeView = document.getElementById('treeView');
            if (!treeView) return;
            
            // Create controls container
            const controls = document.createElement('div');
            controls.className = 'tree-controls';
            controls.innerHTML = `
                <!-- Zoom Controls -->
                <div class="zoom-controls">
                    <button class="control-btn zoom-out" title="Zoom Out (-)">
                        <i class="material-icons">remove</i>
                    </button>
                    <div class="zoom-level">
                        <span class="zoom-value">100%</span>
                    </div>
                    <button class="control-btn zoom-in" title="Zoom In (+)">
                        <i class="material-icons">add</i>
                    </button>
                    <button class="control-btn zoom-reset" title="Reset Zoom (0)">
                        <i class="material-icons">center_focus_strong</i>
                    </button>
                </div>
                
                <!-- View Mode Controls -->
                <div class="view-controls">
                    <button class="control-btn view-mode active" data-mode="full" title="Full Tree">
                        <i class="material-icons">account_tree</i>
                    </button>
                    <button class="control-btn view-mode" data-mode="ancestors" title="Ancestors Only">
                        <i class="material-icons">vertical_align_top</i>
                    </button>
                    <button class="control-btn view-mode" data-mode="descendants" title="Descendants Only">
                        <i class="material-icons">vertical_align_bottom</i>
                    </button>
                    <button class="control-btn view-mode" data-mode="hourglass" title="Hourglass View">
                        <i class="material-icons">hourglass_empty</i>
                    </button>
                </div>
                
                <!-- Action Controls -->
                <div class="action-controls">
                    <button class="control-btn fullscreen" title="Fullscreen (F)">
                        <i class="material-icons">fullscreen</i>
                    </button>
                    <button class="control-btn print" title="Print Tree">
                        <i class="material-icons">print</i>
                    </button>
                    <button class="control-btn export" title="Export Tree">
                        <i class="material-icons">download</i>
                    </button>
                </div>
                
                <!-- Search in Tree -->
                <div class="tree-search">
                    <input type="text" class="tree-search-input" placeholder="Search in tree...">
                    <button class="control-btn tree-search-btn">
                        <i class="material-icons">search</i>
                    </button>
                </div>
            `;
            
            // Insert controls
            const treeContainer = treeView.querySelector('.tree-container');
            if (treeContainer) {
                treeView.insertBefore(controls, treeContainer);
            }
            
            // Create mini-map
            this.createMiniMap();
            
            // Store references
            this.elements = {
                controls,
                zoomValue: controls.querySelector('.zoom-value'),
                treeContainer: treeContainer,
                treeWrapper: treeContainer?.querySelector('.tree-wrapper'),
                tree: treeContainer?.querySelector('.tree')
            };
        },
        
        // Create mini-map navigation
        createMiniMap() {
            const miniMap = document.createElement('div');
            miniMap.className = 'tree-minimap';
            miniMap.innerHTML = `
                <div class="minimap-container">
                    <div class="minimap-tree"></div>
                    <div class="minimap-viewport"></div>
                </div>
                <button class="minimap-toggle" title="Toggle Mini-map">
                    <i class="material-icons">map</i>
                </button>
            `;
            
            document.getElementById('treeView')?.appendChild(miniMap);
            this.miniMap = miniMap;
        },
        
        // Initialize pan and zoom functionality
        initializePanZoom() {
            const container = this.elements.treeContainer;
            if (!container) return;
            
            // Make container scrollable
            container.style.overflow = 'auto';
            container.style.position = 'relative';
            
            // Center tree initially
            this.centerTree();
        },
        
        // Attach event listeners
        attachEventListeners() {
            // Zoom controls
            document.querySelector('.zoom-in')?.addEventListener('click', () => this.zoom(this.state.zoomStep));
            document.querySelector('.zoom-out')?.addEventListener('click', () => this.zoom(-this.state.zoomStep));
            document.querySelector('.zoom-reset')?.addEventListener('click', () => this.resetZoom());
            
            // View mode controls
            document.querySelectorAll('.view-mode').forEach(btn => {
                btn.addEventListener('click', () => this.changeViewMode(btn.dataset.mode));
            });
            
            // Action controls
            document.querySelector('.fullscreen')?.addEventListener('click', () => this.toggleFullscreen());
            document.querySelector('.print')?.addEventListener('click', () => this.printTree());
            document.querySelector('.export')?.addEventListener('click', () => this.showExportOptions());
            
            // Tree search
            const searchInput = document.querySelector('.tree-search-input');
            const searchBtn = document.querySelector('.tree-search-btn');
            
            searchInput?.addEventListener('input', this.debounce(() => this.searchInTree(), 300));
            searchBtn?.addEventListener('click', () => this.searchInTree());
            
            // Pan functionality
            this.setupPanning();
            
            // Mini-map toggle
            document.querySelector('.minimap-toggle')?.addEventListener('click', () => this.toggleMiniMap());
            
            // Mouse wheel zoom
            this.elements.treeContainer?.addEventListener('wheel', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -this.state.zoomStep : this.state.zoomStep;
                    this.zoom(delta);
                }
            });
        },
        
        // Setup panning
        setupPanning() {
            const container = this.elements.treeContainer;
            if (!container) return;
            
            // Mouse events
            container.addEventListener('mousedown', (e) => this.startPan(e));
            container.addEventListener('mousemove', (e) => this.pan(e));
            container.addEventListener('mouseup', () => this.endPan());
            container.addEventListener('mouseleave', () => this.endPan());
            
            // Touch events
            container.addEventListener('touchstart', (e) => this.startPan(e.touches[0]));
            container.addEventListener('touchmove', (e) => this.pan(e.touches[0]));
            container.addEventListener('touchend', () => this.endPan());
        },
        
        // Start panning
        startPan(e) {
            if (e.button && e.button !== 0) return; // Only left click
            
            this.state.isPanning = true;
            this.state.startX = e.pageX - this.elements.treeContainer.offsetLeft;
            this.state.startY = e.pageY - this.elements.treeContainer.offsetTop;
            this.state.scrollLeft = this.elements.treeContainer.scrollLeft;
            this.state.scrollTop = this.elements.treeContainer.scrollTop;
            
            this.elements.treeContainer.style.cursor = 'grabbing';
        },
        
        // Pan
        pan(e) {
            if (!this.state.isPanning) return;
            
            e.preventDefault();
            const x = e.pageX - this.elements.treeContainer.offsetLeft;
            const y = e.pageY - this.elements.treeContainer.offsetTop;
            const walkX = (x - this.state.startX) * 1.5;
            const walkY = (y - this.state.startY) * 1.5;
            
            this.elements.treeContainer.scrollLeft = this.state.scrollLeft - walkX;
            this.elements.treeContainer.scrollTop = this.state.scrollTop - walkY;
            
            this.updateMiniMapViewport();
        },
        
        // End panning
        endPan() {
            this.state.isPanning = false;
            this.elements.treeContainer.style.cursor = 'grab';
        },
        
        // Zoom functionality
        zoom(delta) {
            const newZoom = Math.max(
                this.state.minZoom,
                Math.min(this.state.maxZoom, this.state.zoom + delta)
            );
            
            if (newZoom === this.state.zoom) return;
            
            this.state.zoom = newZoom;
            this.applyZoom();
        },
        
        // Apply zoom
        applyZoom() {
            const wrapper = this.elements.treeWrapper;
            if (!wrapper) return;
            
            wrapper.style.transform = `scale(${this.state.zoom / 100})`;
            wrapper.style.transformOrigin = 'center top';
            this.elements.zoomValue.textContent = `${this.state.zoom}%`;
            
            // Update mini-map
            this.updateMiniMap();
        },
        
        // Reset zoom
        resetZoom() {
            this.state.zoom = 100;
            this.applyZoom();
            this.centerTree();
        },
        
        // Center tree in viewport
        centerTree() {
            const container = this.elements.treeContainer;
            const tree = this.elements.tree;
            if (!container || !tree) return;
            
            setTimeout(() => {
                const containerWidth = container.clientWidth;
                const containerHeight = container.clientHeight;
                const treeWidth = tree.offsetWidth * (this.state.zoom / 100);
                const treeHeight = tree.offsetHeight * (this.state.zoom / 100);
                
                container.scrollLeft = (treeWidth - containerWidth) / 2;
                container.scrollTop = Math.max(0, (treeHeight - containerHeight) / 4);
                
                this.updateMiniMapViewport();
            }, 100);
        },
        
        // Change view mode
        changeViewMode(mode) {
            this.state.viewMode = mode;
            
            // Update active button
            document.querySelectorAll('.view-mode').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });
            
            // Reload tree with new view mode
            this.filterTreeByMode();
        },
        
        // Filter tree by view mode
        filterTreeByMode() {
            // Store current zoom and position
            const currentZoom = this.state.zoom;
            const scrollLeft = this.elements.treeContainer?.scrollLeft || 0;
            const scrollTop = this.elements.treeContainer?.scrollTop || 0;
            
            // Re-render tree with filtered data
            if (window.renderFamilyTree) {
                window.renderFamilyTree(this.state.viewMode);
                
                // Re-initialize controls after tree re-render
                setTimeout(() => {
                    // Re-get elements after re-render
                    this.elements.treeContainer = document.querySelector('.tree-container');
                    this.elements.treeWrapper = document.querySelector('.tree-wrapper');
                    this.elements.tree = document.querySelector('.tree');
                    
                    // Restore zoom and position
                    this.state.zoom = currentZoom;
                    this.applyZoom();
                    if (this.elements.treeContainer) {
                        this.elements.treeContainer.scrollLeft = scrollLeft;
                        this.elements.treeContainer.scrollTop = scrollTop;
                    }
                }, 100);
            }
        },
        
        // Toggle fullscreen
        toggleFullscreen() {
            const treeView = document.getElementById('treeView');
            if (!treeView) return;
            
            if (!this.state.isFullscreen) {
                if (treeView.requestFullscreen) {
                    treeView.requestFullscreen();
                } else if (treeView.webkitRequestFullscreen) {
                    treeView.webkitRequestFullscreen();
                } else if (treeView.msRequestFullscreen) {
                    treeView.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
            
            this.state.isFullscreen = !this.state.isFullscreen;
            treeView.classList.toggle('fullscreen', this.state.isFullscreen);
            
            // Update button icon
            const btn = document.querySelector('.fullscreen');
            const icon = btn?.querySelector('.material-icons');
            if (icon) {
                icon.textContent = this.state.isFullscreen ? 'fullscreen_exit' : 'fullscreen';
            }
        },
        
        // Search in tree
        searchInTree() {
            const query = document.querySelector('.tree-search-input')?.value.trim();
            if (!query) {
                this.clearTreeSearch();
                return;
            }
            
            const queryLower = query.toLowerCase();
            const nodes = document.querySelectorAll('.tree-node');
            let foundCount = 0;
            
            nodes.forEach(node => {
                const name = node.querySelector('.member-name')?.textContent || '';
                const matches = name.toLowerCase().includes(queryLower);
                
                node.classList.toggle('search-match', matches);
                node.classList.toggle('search-dimmed', !matches && query.length > 0);
                
                if (matches) {
                    foundCount++;
                    // Scroll to first match
                    if (foundCount === 1) {
                        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            });
            
            // Show result count
            this.showSearchResults(foundCount, query);
        },
        
        // Clear tree search
        clearTreeSearch() {
            document.querySelectorAll('.tree-node').forEach(node => {
                node.classList.remove('search-match', 'search-dimmed');
            });
            this.hideSearchResults();
        },
        
        // Show search results
        showSearchResults(count, query) {
            let resultsDiv = document.querySelector('.tree-search-results');
            if (!resultsDiv) {
                resultsDiv = document.createElement('div');
                resultsDiv.className = 'tree-search-results';
                document.querySelector('.tree-search')?.appendChild(resultsDiv);
            }
            
            resultsDiv.textContent = count > 0 
                ? `Found ${count} match${count !== 1 ? 'es' : ''} for "${query}"`
                : `No matches found for "${query}"`;
            resultsDiv.style.display = 'block';
        },
        
        // Hide search results
        hideSearchResults() {
            const resultsDiv = document.querySelector('.tree-search-results');
            if (resultsDiv) {
                resultsDiv.style.display = 'none';
            }
        },
        
        // Print tree
        printTree() {
            window.print();
        },
        
        // Show export options
        showExportOptions() {
            const modal = document.createElement('div');
            modal.className = 'export-modal';
            modal.innerHTML = `
                <div class="export-modal-content">
                    <h3>Export Family Tree</h3>
                    <div class="export-options">
                        <button class="export-option" data-format="pdf">
                            <i class="material-icons">picture_as_pdf</i>
                            <span>Export as PDF</span>
                        </button>
                        <button class="export-option" data-format="png">
                            <i class="material-icons">image</i>
                            <span>Export as PNG</span>
                        </button>
                        <button class="export-option" data-format="svg">
                            <i class="material-icons">code</i>
                            <span>Export as SVG</span>
                        </button>
                    </div>
                    <button class="close-export-modal">Cancel</button>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add event listeners
            modal.querySelectorAll('.export-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.exportTree(btn.dataset.format);
                    document.body.removeChild(modal);
                });
            });
            
            modal.querySelector('.close-export-modal').addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        },
        
        // Export tree
        exportTree(format) {
            // This will be implemented with the export functionality
            console.log('Exporting tree as:', format);
            
            if (window.showSuccess) {
                window.showSuccess(`Exporting tree as ${format.toUpperCase()}...`);
            }
        },
        
        // Mini-map functionality
        toggleMiniMap() {
            this.miniMap?.classList.toggle('active');
            this.updateMiniMap();
        },
        
        // Update mini-map
        updateMiniMap() {
            if (!this.miniMap?.classList.contains('active')) return;
            
            // This will be implemented to show a scaled-down version of the tree
            console.log('Updating mini-map');
        },
        
        // Update mini-map viewport indicator
        updateMiniMapViewport() {
            // This will be implemented to show current viewport position
            console.log('Updating mini-map viewport');
        },
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Zoom shortcuts
                if (e.key === '+' || e.key === '=') {
                    e.preventDefault();
                    this.zoom(this.state.zoomStep);
                } else if (e.key === '-' || e.key === '_') {
                    e.preventDefault();
                    this.zoom(-this.state.zoomStep);
                } else if (e.key === '0') {
                    e.preventDefault();
                    this.resetZoom();
                }
                
                // Fullscreen shortcut
                if (e.key === 'f' || e.key === 'F') {
                    e.preventDefault();
                    this.toggleFullscreen();
                }
                
                // View mode shortcuts
                if (e.key >= '1' && e.key <= '4') {
                    const modes = ['full', 'ancestors', 'descendants', 'hourglass'];
                    const mode = modes[parseInt(e.key) - 1];
                    if (mode) {
                        this.changeViewMode(mode);
                    }
                }
            });
        },
        
        // Debounce helper
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Wait for tree view to be created
            setTimeout(() => TreeControls.init(), 500);
        });
    } else {
        // Wait for tree view to be created
        setTimeout(() => TreeControls.init(), 500);
    }
    
    // Export for use
    window.pyebwaTreeControls = TreeControls;
})();