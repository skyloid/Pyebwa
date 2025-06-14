// Tree Export Functionality for Pyebwa Family Tree
(function() {
    'use strict';
    
    const TreeExport = {
        // Export tree as PDF
        async exportAsPDF(format = 'A4') {
            try {
                this.showExportProgress('Preparing PDF export...');
                
                // Get tree container
                const treeContainer = document.querySelector('.tree-wrapper');
                if (!treeContainer) {
                    throw new Error('Tree not found');
                }
                
                // Temporarily modify tree for export
                const originalTransform = treeContainer.style.transform;
                treeContainer.style.transform = 'none';
                document.body.classList.add('exporting');
                
                // Wait for render
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Use existing PDF export functionality
                if (window.exportTreeAsPDF) {
                    await window.exportTreeAsPDF();
                } else {
                    // Fallback to basic implementation
                    await this.basicPDFExport(treeContainer);
                }
                
                // Restore original state
                treeContainer.style.transform = originalTransform;
                document.body.classList.remove('exporting');
                
                this.hideExportProgress();
                if (window.showSuccess) {
                    window.showSuccess('Tree exported as PDF successfully!');
                }
                
            } catch (error) {
                console.error('PDF export error:', error);
                this.hideExportProgress();
                if (window.showError) {
                    window.showError('Failed to export PDF: ' + error.message);
                }
            }
        },
        
        // Export tree as PNG
        async exportAsPNG() {
            try {
                this.showExportProgress('Preparing PNG export...');
                
                const treeContainer = document.querySelector('.tree-wrapper');
                if (!treeContainer) {
                    throw new Error('Tree not found');
                }
                
                // Use html2canvas if available
                if (window.html2canvas) {
                    const canvas = await html2canvas(treeContainer, {
                        backgroundColor: '#ffffff',
                        scale: 2,
                        logging: false,
                        useCORS: true,
                        allowTaint: true
                    });
                    
                    // Convert to blob and download
                    canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `family-tree-${new Date().toISOString().split('T')[0]}.png`;
                        a.click();
                        URL.revokeObjectURL(url);
                    });
                } else {
                    throw new Error('html2canvas library not loaded');
                }
                
                this.hideExportProgress();
                if (window.showSuccess) {
                    window.showSuccess('Tree exported as PNG successfully!');
                }
                
            } catch (error) {
                console.error('PNG export error:', error);
                this.hideExportProgress();
                if (window.showError) {
                    window.showError('Failed to export PNG: ' + error.message);
                }
            }
        },
        
        // Export tree as SVG
        async exportAsSVG() {
            try {
                this.showExportProgress('Preparing SVG export...');
                
                const treeContainer = document.querySelector('.tree-wrapper');
                if (!treeContainer) {
                    throw new Error('Tree not found');
                }
                
                // Convert HTML tree to SVG
                const svg = await this.convertTreeToSVG(treeContainer);
                
                // Download SVG
                const blob = new Blob([svg], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `family-tree-${new Date().toISOString().split('T')[0]}.svg`;
                a.click();
                URL.revokeObjectURL(url);
                
                this.hideExportProgress();
                if (window.showSuccess) {
                    window.showSuccess('Tree exported as SVG successfully!');
                }
                
            } catch (error) {
                console.error('SVG export error:', error);
                this.hideExportProgress();
                if (window.showError) {
                    window.showError('Failed to export SVG: ' + error.message);
                }
            }
        },
        
        // Convert tree to SVG format
        async convertTreeToSVG(container) {
            const rect = container.getBoundingClientRect();
            const nodes = container.querySelectorAll('.tree-node');
            const connections = container.querySelectorAll('.tree ul::before, .tree li::before, .tree li::after');
            
            let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}" viewBox="0 0 ${rect.width} ${rect.height}">`;
            svg += '<style>';
            svg += '.node-rect { fill: #f5f5f5; stroke: #ddd; stroke-width: 1; rx: 8; }';
            svg += '.node-text { font-family: Arial, sans-serif; font-size: 14px; fill: #333; }';
            svg += '.node-line { stroke: #ddd; stroke-width: 2; fill: none; }';
            svg += '</style>';
            
            // Draw connections
            svg += '<g class="connections">';
            // This would require calculating actual connection paths
            svg += '</g>';
            
            // Draw nodes
            svg += '<g class="nodes">';
            nodes.forEach(node => {
                const nodeRect = node.getBoundingClientRect();
                const x = nodeRect.left - rect.left;
                const y = nodeRect.top - rect.top;
                const width = nodeRect.width;
                const height = nodeRect.height;
                
                svg += `<g transform="translate(${x}, ${y})">`;
                svg += `<rect class="node-rect" x="0" y="0" width="${width}" height="${height}" />`;
                
                const name = node.querySelector('.member-name')?.textContent || '';
                svg += `<text class="node-text" x="${width/2}" y="${height/2}" text-anchor="middle" dominant-baseline="middle">${this.escapeXml(name)}</text>`;
                
                svg += '</g>';
            });
            svg += '</g>';
            
            svg += '</svg>';
            
            return svg;
        },
        
        // Basic PDF export fallback
        async basicPDFExport(container) {
            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            
            // Build HTML content
            const styles = Array.from(document.styleSheets)
                .map(sheet => {
                    try {
                        return Array.from(sheet.cssRules)
                            .map(rule => rule.cssText)
                            .join('\n');
                    } catch (e) {
                        return '';
                    }
                })
                .join('\n');
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Family Tree Export</title>
                    <style>
                        ${styles}
                        @page { size: landscape; margin: 20mm; }
                        body { margin: 0; }
                        .tree-controls, .tree-minimap { display: none !important; }
                    </style>
                </head>
                <body>
                    <div class="tree-export">
                        ${container.outerHTML}
                    </div>
                </body>
                </html>
            `;
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Wait for content to load
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            };
        },
        
        // Show export progress
        showExportProgress(message) {
            let progress = document.querySelector('.export-progress');
            if (!progress) {
                progress = document.createElement('div');
                progress.className = 'export-progress';
                document.body.appendChild(progress);
            }
            
            progress.innerHTML = `
                <div class="export-progress-content">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `;
            
            progress.style.display = 'flex';
        },
        
        // Hide export progress
        hideExportProgress() {
            const progress = document.querySelector('.export-progress');
            if (progress) {
                progress.style.display = 'none';
            }
        },
        
        // Escape XML special characters
        escapeXml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }
    };
    
    // Add export progress styles
    const style = document.createElement('style');
    style.textContent = `
        .export-progress {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        
        .export-progress-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
        }
        
        .export-progress .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Export styles */
        body.exporting .tree-controls,
        body.exporting .tree-minimap,
        body.exporting .minimap-toggle {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
    
    // Override the export function in tree controls
    if (window.pyebwaTreeControls) {
        window.pyebwaTreeControls.exportTree = function(format) {
            switch (format) {
                case 'pdf':
                    TreeExport.exportAsPDF();
                    break;
                case 'png':
                    TreeExport.exportAsPNG();
                    break;
                case 'svg':
                    TreeExport.exportAsSVG();
                    break;
                default:
                    console.error('Unknown export format:', format);
            }
        };
    }
    
    // Export for use
    window.pyebwaTreeExport = TreeExport;
})();