// Performance Optimizations for Large Family Trees
(function() {
    'use strict';
    
    const TreePerformance = {
        // Configuration
        config: {
            nodeRenderThreshold: 50,    // Nodes to render at once
            virtualScrollThreshold: 100, // When to enable virtual scrolling
            debounceDelay: 16,          // ~60fps
            intersectionMargin: '50px'   // Margin for intersection observer
        },
        
        // State
        state: {
            visibleNodes: new Set(),
            nodeObserver: null,
            renderQueue: [],
            isRendering: false
        },
        
        // Initialize performance optimizations
        init() {
            this.setupIntersectionObserver();
            this.optimizeNodeRendering();
        },
        
        // Setup intersection observer for lazy rendering
        setupIntersectionObserver() {
            const options = {
                root: document.querySelector('.tree-container'),
                rootMargin: this.config.intersectionMargin,
                threshold: [0, 0.1, 0.5, 1]
            };
            
            this.state.nodeObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const nodeId = entry.target.dataset.nodeId;
                    
                    if (entry.isIntersecting) {
                        this.state.visibleNodes.add(nodeId);
                        this.renderNodeDetails(entry.target);
                    } else {
                        this.state.visibleNodes.delete(nodeId);
                        this.simplifyNode(entry.target);
                    }
                });
            }, options);
        },
        
        // Optimize node rendering for large trees
        optimizeNodeRendering() {
            // Override the original renderTreeNode function
            const originalRenderTreeNode = window.renderTreeNode;
            
            window.renderTreeNode = (container, node, isChild = false) => {
                const memberCount = this.countNodes(node);
                
                if (memberCount > this.config.virtualScrollThreshold) {
                    // Use optimized rendering for large trees
                    this.renderOptimizedTree(container, node, isChild);
                } else {
                    // Use original rendering for small trees
                    originalRenderTreeNode(container, node, isChild);
                }
            };
        },
        
        // Count total nodes in tree
        countNodes(node) {
            if (!node) return 0;
            
            let count = node.member ? 1 : 0;
            
            if (node.children) {
                node.children.forEach(child => {
                    count += this.countNodes(child);
                });
            }
            
            if (node.spouse) {
                count += 1;
            }
            
            return count;
        },
        
        // Render optimized tree with virtual scrolling
        renderOptimizedTree(container, node, isChild = false) {
            if (!node) return;
            
            const nodeElement = this.createOptimizedNode(node, isChild);
            container.appendChild(nodeElement);
            
            // Queue children for rendering
            if (node.children && node.children.length > 0) {
                const childrenContainer = document.createElement('ul');
                nodeElement.appendChild(childrenContainer);
                
                // Render children in batches
                this.renderChildrenBatched(childrenContainer, node.children);
            }
        },
        
        // Create optimized node element
        createOptimizedNode(node, isChild) {
            const li = document.createElement('li');
            if (isChild) li.className = 'child';
            
            // Create simplified node initially
            const nodeDiv = document.createElement('div');
            nodeDiv.className = 'tree-node simplified';
            nodeDiv.dataset.nodeId = node.member?.id || 'virtual-' + Math.random();
            
            if (node.isVirtualRoot) {
                // Virtual root - don't render anything
                return li;
            }
            
            // Basic structure
            nodeDiv.innerHTML = `
                <div class="node-placeholder">
                    <div class="member-name">${node.member?.firstName || ''} ${node.member?.lastName || ''}</div>
                </div>
            `;
            
            li.appendChild(nodeDiv);
            
            // Observe this node
            this.state.nodeObserver.observe(nodeDiv);
            
            return li;
        },
        
        // Render children in batches
        renderChildrenBatched(container, children) {
            const batches = [];
            for (let i = 0; i < children.length; i += this.config.nodeRenderThreshold) {
                batches.push(children.slice(i, i + this.config.nodeRenderThreshold));
            }
            
            let batchIndex = 0;
            const renderNextBatch = () => {
                if (batchIndex >= batches.length) return;
                
                const batch = batches[batchIndex++];
                batch.forEach(child => {
                    this.renderOptimizedTree(container, child, true);
                });
                
                // Schedule next batch
                if (batchIndex < batches.length) {
                    requestAnimationFrame(renderNextBatch);
                }
            };
            
            renderNextBatch();
        },
        
        // Render full node details when visible
        renderNodeDetails(nodeElement) {
            if (!nodeElement.classList.contains('simplified')) return;
            
            const nodeId = nodeElement.dataset.nodeId;
            const member = window.familyMembers.find(m => m.id === nodeId);
            
            if (!member) return;
            
            // Create full node content
            const photoUrl = member.photoUrl || '/app/assets/images/default-avatar.png';
            const age = member.birthDate ? 
                new Date().getFullYear() - new Date(member.birthDate).getFullYear() : '';
            
            nodeElement.innerHTML = `
                <img src="${photoUrl}" alt="${member.firstName}" loading="lazy">
                <div class="member-info">
                    <div class="member-name">${member.firstName} ${member.lastName}</div>
                    ${age ? `<div class="member-age">${age} ${t('yearsOld')}</div>` : ''}
                </div>
            `;
            
            nodeElement.classList.remove('simplified');
            nodeElement.onclick = () => window.viewMemberProfile?.(member);
        },
        
        // Simplify node when not visible
        simplifyNode(nodeElement) {
            if (nodeElement.classList.contains('simplified')) return;
            
            const memberName = nodeElement.querySelector('.member-name')?.textContent || '';
            
            nodeElement.innerHTML = `
                <div class="node-placeholder">
                    <div class="member-name">${memberName}</div>
                </div>
            `;
            
            nodeElement.classList.add('simplified');
        },
        
        // Optimize tree layout calculation
        optimizeLayout() {
            // Use CSS transforms instead of reflow-triggering properties
            const nodes = document.querySelectorAll('.tree-node');
            
            // Batch DOM reads
            const positions = Array.from(nodes).map(node => ({
                node,
                rect: node.getBoundingClientRect()
            }));
            
            // Batch DOM writes
            requestAnimationFrame(() => {
                positions.forEach(({node, rect}) => {
                    // Apply optimizations
                    node.style.willChange = 'transform';
                });
            });
        },
        
        // Clean up observers
        cleanup() {
            if (this.state.nodeObserver) {
                this.state.nodeObserver.disconnect();
            }
            this.state.visibleNodes.clear();
        }
    };
    
    // Auto-initialize when tree is rendered
    const originalRenderFamilyTree = window.renderFamilyTree;
    window.renderFamilyTree = function(...args) {
        originalRenderFamilyTree.apply(this, args);
        
        // Initialize performance optimizations after tree render
        setTimeout(() => {
            TreePerformance.init();
        }, 100);
    };
    
    // Export for use
    window.pyebwaTreePerformance = TreePerformance;
})();