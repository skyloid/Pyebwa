// PDF Export functionality for Family Tree
// Using jsPDF and html2canvas for PDF generation

// Get PDF tree size class based on member count
function getPDFTreeSizeClass(memberCount) {
    if (memberCount < 10) return 'pdf-tree-small';
    if (memberCount < 30) return 'pdf-tree-medium';
    if (memberCount < 60) return 'pdf-tree-large';
    return 'pdf-tree-xlarge';
}

// Get responsive dimensions for PDF based on family size
function getPDFResponsiveDimensions(memberCount) {
    if (memberCount < 10) {
        // Small family - larger elements
        return {
            boxWidth: 140,
            boxPadding: 12,
            fontSizeName: 14,
            fontSizeDates: 12,
            nodeMargin: 15,
            levelGap: 40,
            scale: 1
        };
    } else if (memberCount < 30) {
        // Medium family
        return {
            boxWidth: 120,
            boxPadding: 10,
            fontSizeName: 12,
            fontSizeDates: 10,
            nodeMargin: 10,
            levelGap: 35,
            scale: 0.9
        };
    } else if (memberCount < 60) {
        // Large family
        return {
            boxWidth: 100,
            boxPadding: 8,
            fontSizeName: 11,
            fontSizeDates: 9,
            nodeMargin: 8,
            levelGap: 30,
            scale: 0.75
        };
    } else {
        // Extra large family
        return {
            boxWidth: 80,
            boxPadding: 6,
            fontSizeName: 10,
            fontSizeDates: 8,
            nodeMargin: 5,
            levelGap: 25,
            scale: 0.6
        };
    }
}

// Load required libraries dynamically
function loadPDFLibraries() {
    return new Promise((resolve, reject) => {
        // Check if libraries are already loaded
        if (window.jspdf && window.html2canvas) {
            resolve();
            return;
        }
        
        // Load jsPDF
        const jsPDFScript = document.createElement('script');
        jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        
        // Load html2canvas
        const html2canvasScript = document.createElement('script');
        html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        
        // Load Chart.js for demographic charts
        const chartScript = document.createElement('script');
        chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
        
        let scriptsLoaded = 0;
        const totalScripts = 3;
        
        function checkAllLoaded() {
            scriptsLoaded++;
            if (scriptsLoaded === totalScripts) {
                resolve();
            }
        }
        
        jsPDFScript.onload = checkAllLoaded;
        html2canvasScript.onload = checkAllLoaded;
        chartScript.onload = checkAllLoaded;
        
        jsPDFScript.onerror = reject;
        html2canvasScript.onerror = reject;
        chartScript.onerror = reject;
        
        document.head.appendChild(jsPDFScript);
        document.head.appendChild(html2canvasScript);
        document.head.appendChild(chartScript);
    });
}

// Generate PDF with family tree and statistics
async function exportFamilyTreePDF() {
    try {
        console.log('PDF Export - familyMembers:', window.familyMembers);
        console.log('PDF Export - familyMembers length:', window.familyMembers ? window.familyMembers.length : 'undefined');
        
        // Check if we have family members
        if (!window.familyMembers || window.familyMembers.length === 0) {
            showError(t('noMembersForExport') || 'Please add family members before exporting.');
            return;
        }
        
        // Show loading
        showPDFExportLoading();
        
        // Load libraries if needed
        await loadPDFLibraries();
        
        // Create PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        // Set fonts and colors
        const primaryBlue = [0, 33, 125];
        const primaryRed = [212, 17, 37];
        const accentYellow = [255, 199, 44];
        
        // Add header
        await addPDFHeader(pdf);
        
        // Add family tree visualization (left side)
        const treeInfo = await addFamilyTreeVisualization(pdf);
        
        // Add demographics and statistics (right side)
        await addDemographicsSection(pdf, treeInfo);
        
        // Add footer
        addPDFFooter(pdf);
        
        // Save the PDF
        const fileName = `pyebwa-family-tree-${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        hidePDFExportLoading();
        showSuccess(t('pdfExported') || 'Family tree exported as PDF successfully!');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        hidePDFExportLoading();
        showError(t('pdfExportError') || 'Error generating PDF. Please try again.');
    }
}

// Draw text logo fallback
function drawTextLogo(pdf) {
    pdf.setFontSize(16);
    pdf.setTextColor(212, 17, 37); // Red color
    pdf.setFont(undefined, 'bold');
    pdf.text('PYEBWA', 25, 20);
    pdf.setFont(undefined, 'normal');
}

// Add PDF header with title and date
async function addPDFHeader(pdf) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Add logo if available - use local copy to avoid CORS issues
    try {
        // Create an image element for the logo
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous'; // Set crossOrigin for local images
        
        await new Promise((resolve, reject) => {
            logoImg.onload = async () => {
                try {
                    // Create canvas to draw the logo
                    const canvas = document.createElement('canvas');
                    const scale = 2; // For better quality
                    canvas.width = 120 * scale;
                    canvas.height = 60 * scale;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw white background
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Try to draw the loaded image
                    ctx.drawImage(logoImg, 0, 0, canvas.width, canvas.height);
                    
                    // Add to PDF
                    const logoData = canvas.toDataURL('image/png');
                    pdf.addImage(logoData, 'PNG', 10, 10, 30, 15);
                    resolve();
                } catch (err) {
                    console.log('Error processing logo:', err);
                    // Fallback: Draw text logo
                    drawTextLogo(pdf);
                    resolve();
                }
            };
            
            logoImg.onerror = () => {
                console.log('Logo load failed, using text fallback');
                // Fallback: Draw text logo
                drawTextLogo(pdf);
                resolve();
            };
            
            // Try to load the local PNG logo
            logoImg.src = '/app/images/pyebwa-logo.png';
        });
        
    } catch (e) {
        console.log('Logo creation failed, continuing without it');
    }
    
    // Title
    pdf.setFontSize(24);
    pdf.setTextColor(0, 33, 125);
    pdf.text(t('familyTreeReport') || 'Family Tree Report', pageWidth / 2, 20, { align: 'center' });
    
    // User name and date
    pdf.setFontSize(12);
    pdf.setTextColor(100);
    const userName = currentUser?.displayName || currentUser?.email || 'User';
    pdf.text(`${userName} - ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
    
    // Divider line
    pdf.setDrawColor(200);
    pdf.line(10, 35, pageWidth - 10, 35);
}

// Add family tree visualization
async function addFamilyTreeVisualization(pdf) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Determine family size for responsive scaling
    const memberCount = window.familyMembers ? window.familyMembers.length : 0;
    const sizeClass = getPDFTreeSizeClass(memberCount);
    
    // Create a temporary container for the tree
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        width: ${pageWidth * 3}px;
        background: white;
        padding: 20px;
    `;
    tempContainer.innerHTML = `
        <div class="pdf-tree-container ${sizeClass}">
            ${generateSimplifiedTreeHTML()}
        </div>
    `;
    document.body.appendChild(tempContainer);
    
    // Get responsive dimensions based on family size
    const dimensions = getPDFResponsiveDimensions(memberCount);
    
    // Add styles for PDF tree with responsive sizing
    const style = document.createElement('style');
    style.textContent = `
        .pdf-tree-container {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            padding: 20px;
            transform-origin: top left;
        }
        
        /* Responsive sizing classes */
        .pdf-tree-container.pdf-tree-small {
            --box-width: ${dimensions.boxWidth}px;
            --box-padding: ${dimensions.boxPadding}px;
            --font-size-name: ${dimensions.fontSizeName}px;
            --font-size-dates: ${dimensions.fontSizeDates}px;
            --node-margin: ${dimensions.nodeMargin}px;
            --level-gap: ${dimensions.levelGap}px;
        }
        
        .pdf-tree-container.pdf-tree-medium {
            --box-width: ${dimensions.boxWidth}px;
            --box-padding: ${dimensions.boxPadding}px;
            --font-size-name: ${dimensions.fontSizeName}px;
            --font-size-dates: ${dimensions.fontSizeDates}px;
            --node-margin: ${dimensions.nodeMargin}px;
            --level-gap: ${dimensions.levelGap}px;
        }
        
        .pdf-tree-container.pdf-tree-large {
            --box-width: ${dimensions.boxWidth}px;
            --box-padding: ${dimensions.boxPadding}px;
            --font-size-name: ${dimensions.fontSizeName}px;
            --font-size-dates: ${dimensions.fontSizeDates}px;
            --node-margin: ${dimensions.nodeMargin}px;
            --level-gap: ${dimensions.levelGap}px;
        }
        
        .pdf-tree-container.pdf-tree-xlarge {
            --box-width: ${dimensions.boxWidth}px;
            --box-padding: ${dimensions.boxPadding}px;
            --font-size-name: ${dimensions.fontSizeName}px;
            --font-size-dates: ${dimensions.fontSizeDates}px;
            --node-margin: ${dimensions.nodeMargin}px;
            --level-gap: ${dimensions.levelGap}px;
        }
        
        .pdf-tree-node {
            display: inline-block;
            text-align: center;
            margin: 0 var(--node-margin);
        }
        
        .pdf-member-box {
            background: white;
            border: 2px solid #00217D;
            border-radius: 8px;
            padding: var(--box-padding);
            margin: 5px;
            min-width: var(--box-width);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .pdf-member-box.female {
            border-color: #D41125;
        }
        .pdf-member-name {
            font-weight: bold;
            font-size: var(--font-size-name);
            color: #333;
        }
        .pdf-member-dates {
            font-size: var(--font-size-dates);
            color: #666;
            margin-top: 4px;
        }
        .pdf-tree-children {
            margin-top: var(--level-gap);
            position: relative;
        }
        .pdf-tree-children::before {
            content: '';
            position: absolute;
            top: -20px;
            left: 50%;
            width: 2px;
            height: 20px;
            background: #ccc;
            transform: translateX(-50%);
        }
        .pdf-tree-level {
            display: flex;
            justify-content: center;
            gap: 20px;
        }
    `;
    document.head.appendChild(style);
    
    // Apply responsive scaling to container before capture
    const treeContent = tempContainer.querySelector('.pdf-tree-container');
    if (treeContent && dimensions.scale < 1) {
        treeContent.style.transform = `scale(${dimensions.scale})`;
        treeContent.style.transformOrigin = 'top left';
    }
    
    // Wait for render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture the tree as canvas
    try {
        const canvas = await html2canvas(tempContainer, {
            scale: 2,
            logging: false,
            backgroundColor: '#ffffff',
            width: tempContainer.scrollWidth * dimensions.scale,
            height: tempContainer.scrollHeight * dimensions.scale
        });
        
        // Calculate optimal size for PDF
        const maxWidth = (pageWidth * 0.6) - 20; // 60% of page width for tree
        const maxHeight = pageHeight - 100; // Leave space for header and margins
        
        let imgWidth = maxWidth;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // If height is too large, scale based on height instead
        if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = (canvas.width * imgHeight) / canvas.height;
        }
        
        // Center the tree if it's smaller than max width
        const xOffset = imgWidth < maxWidth ? 10 + (maxWidth - imgWidth) / 2 : 10;
        
        pdf.addImage(
            canvas.toDataURL('image/png'),
            'PNG',
            xOffset,
            45,
            imgWidth,
            imgHeight
        );
        
        // Clean up
        document.body.removeChild(tempContainer);
        document.head.removeChild(style);
        
        // Return tree info for demographics positioning
        return {
            treeWidth: imgWidth,
            treeX: xOffset,
            treeEndX: xOffset + imgWidth,
            scale: dimensions.scale
        };
    } catch (error) {
        console.error('Error capturing tree:', error);
        // Fallback: Add text representation
        pdf.setFontSize(10);
        pdf.text('Family Tree Visualization', 20, 50);
        addTextTreeRepresentation(pdf, 20, 60);
        
        // Clean up
        document.body.removeChild(tempContainer);
        document.head.removeChild(style);
        
        // Return default info
        return {
            treeWidth: (pageWidth * 0.6) - 20,
            treeX: 10,
            treeEndX: (pageWidth * 0.6) - 10,
            scale: 1
        };
    }
}

// Generate simplified tree HTML for PDF
function generateSimplifiedTreeHTML() {
    const treeData = buildTreeStructure();
    
    function renderNode(node) {
        if (node.isVirtualRoot) {
            return `<div class="pdf-tree-level">${node.children.map(child => renderNode(child)).join('')}</div>`;
        }
        
        const boxClass = `pdf-member-box ${node.gender || 'unknown'}`;
        const birthYear = node.birthDate ? new Date(node.birthDate).getFullYear() : '';
        
        return `
            <div class="pdf-tree-node">
                <div class="${boxClass}">
                    <div class="pdf-member-name">${node.firstName} ${node.lastName}</div>
                    ${birthYear ? `<div class="pdf-member-dates">${birthYear}</div>` : ''}
                </div>
                ${node.children && node.children.length > 0 ? `
                    <div class="pdf-tree-children">
                        <div class="pdf-tree-level">
                            ${node.children.map(child => renderNode(child)).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    return renderNode(treeData);
}

// Add text representation of tree (fallback)
function addTextTreeRepresentation(pdf, x, y) {
    const treeData = buildTreeStructure();
    let currentY = y;
    
    function addNodeText(node, level = 0) {
        if (node.isVirtualRoot) {
            node.children.forEach(child => addNodeText(child, level));
            return;
        }
        
        const indent = level * 10;
        const birthYear = node.birthDate ? ` (${new Date(node.birthDate).getFullYear()})` : '';
        
        pdf.setFontSize(10);
        pdf.text(`${'  '.repeat(level)}• ${node.firstName} ${node.lastName}${birthYear}`, x + indent, currentY);
        currentY += 6;
        
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => addNodeText(child, level + 1));
        }
    }
    
    addNodeText(treeData);
}

// Add demographics section with charts and statistics
async function addDemographicsSection(pdf, treeInfo) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Position demographics based on tree placement
    const rightColumnX = treeInfo ? Math.max(treeInfo.treeEndX + 15, (pageWidth * 0.6) + 10) : (pageWidth * 0.6) + 10;
    const rightColumnWidth = pageWidth - rightColumnX - 10;
    
    // Calculate statistics
    const stats = calculateFamilyStats();
    const demographics = calculateDemographics();
    
    // Adjust font sizes based on available space
    const titleSize = rightColumnWidth < 80 ? 14 : 16;
    const textSize = rightColumnWidth < 80 ? 10 : 12;
    const smallTextSize = rightColumnWidth < 80 ? 9 : 10;
    
    // Title for statistics section
    pdf.setFontSize(titleSize);
    pdf.setTextColor(0, 33, 125);
    pdf.text(t('familyStatistics') || 'Family Statistics', rightColumnX, 50);
    
    let currentY = 60;
    
    // Basic statistics
    pdf.setFontSize(textSize);
    pdf.setTextColor(50);
    
    const statItems = [
        { label: t('totalMembers') || 'Total Members', value: stats.totalMembers },
        { label: t('males') || 'Males', value: stats.males },
        { label: t('females') || 'Females', value: stats.females },
        { label: t('generations') || 'Generations', value: stats.generations },
        { label: t('averageAge') || 'Average Age', value: `${stats.averageAge} ${t('years') || 'years'}` }
    ];
    
    statItems.forEach(item => {
        pdf.setFont(undefined, 'bold');
        pdf.text(`${item.label}:`, rightColumnX, currentY);
        pdf.setFont(undefined, 'normal');
        pdf.text(String(item.value), rightColumnX + 50, currentY);
        currentY += 8;
    });
    
    currentY += 10;
    
    // Determine chart size based on available space
    const chartSize = rightColumnWidth < 80 ? 'small' : 'normal';
    const chartHeight = chartSize === 'small' ? 40 : 50;
    const chartSpacing = chartSize === 'small' ? 50 : 60;
    
    // Add gender distribution chart
    await addGenderChart(pdf, rightColumnX, currentY, rightColumnWidth, demographics, chartSize);
    currentY += chartSpacing;
    
    // Add age distribution chart
    await addAgeChart(pdf, rightColumnX, currentY, rightColumnWidth, demographics, chartSize);
    currentY += chartSpacing;
    
    // Add generation breakdown
    if (currentY < pageHeight - 40) {
        pdf.setFontSize(textSize + 2);
        pdf.setTextColor(0, 33, 125);
        pdf.text(t('generationBreakdown') || 'Generation Breakdown', rightColumnX, currentY);
        currentY += 10;
        
        pdf.setFontSize(smallTextSize);
        pdf.setTextColor(50);
        demographics.generationBreakdown.forEach(gen => {
            // Truncate long generation names if space is limited
            const genName = rightColumnWidth < 80 && gen.name.length > 20 
                ? gen.name.substring(0, 17) + '...' 
                : gen.name;
            pdf.text(`${genName}: ${gen.count} ${t('members') || 'members'}`, rightColumnX, currentY);
            currentY += 6;
        });
    }
}

// Add gender distribution pie chart
async function addGenderChart(pdf, x, y, width, demographics, size = 'normal') {
    // Create temporary canvas for chart
    const canvas = document.createElement('canvas');
    canvas.width = size === 'small' ? 200 : 300;
    canvas.height = size === 'small' ? 150 : 200;
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    try {
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [t('males') || 'Males', t('females') || 'Females'],
                datasets: [{
                    data: [demographics.genderDistribution.male, demographics.genderDistribution.female],
                    backgroundColor: ['#00217D', '#D41125'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 12 }
                        }
                    },
                    title: {
                        display: true,
                        text: t('genderDistribution') || 'Gender Distribution',
                        font: { size: 14 }
                    }
                }
            }
        });
        
        // Wait for chart to render
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Add to PDF
        const imgData = canvas.toDataURL('image/png');
        const chartWidth = Math.min(width * 0.8, size === 'small' ? 60 : 80);
        const chartHeight = size === 'small' ? 40 : 50;
        pdf.addImage(imgData, 'PNG', x, y, chartWidth, chartHeight);
        
        chart.destroy();
    } catch (error) {
        console.error('Error creating gender chart:', error);
        // Fallback: Add text representation
        pdf.setFontSize(10);
        pdf.text(`Gender: ${demographics.genderDistribution.male} males, ${demographics.genderDistribution.female} females`, x, y + 10);
    }
    
    document.body.removeChild(canvas);
}

// Add age distribution bar chart
async function addAgeChart(pdf, x, y, width, demographics, size = 'normal') {
    const canvas = document.createElement('canvas');
    canvas.width = size === 'small' ? 200 : 300;
    canvas.height = size === 'small' ? 150 : 200;
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    try {
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: demographics.ageGroups.map(g => g.range),
                datasets: [{
                    label: t('numberOfMembers') || 'Number of Members',
                    data: demographics.ageGroups.map(g => g.count),
                    backgroundColor: '#00217D',
                    borderColor: '#001551',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: t('ageDistribution') || 'Age Distribution',
                        font: { size: 14 }
                    }
                }
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const imgData = canvas.toDataURL('image/png');
        const chartWidth = Math.min(width * 0.8, size === 'small' ? 60 : 80);
        const chartHeight = size === 'small' ? 40 : 50;
        pdf.addImage(imgData, 'PNG', x, y, chartWidth, chartHeight);
        
        chart.destroy();
    } catch (error) {
        console.error('Error creating age chart:', error);
        pdf.setFontSize(10);
        pdf.text('Age distribution data available in JSON export', x, y + 10);
    }
    
    document.body.removeChild(canvas);
}

// Calculate demographics for charts
function calculateDemographics() {
    const demographics = {
        genderDistribution: { male: 0, female: 0, unknown: 0 },
        ageGroups: [],
        generationBreakdown: []
    };
    
    // Gender distribution
    familyMembers.forEach(member => {
        if (member.gender === 'male') demographics.genderDistribution.male++;
        else if (member.gender === 'female') demographics.genderDistribution.female++;
        else demographics.genderDistribution.unknown++;
    });
    
    // Age groups
    const ageRanges = [
        { range: '0-18', min: 0, max: 18, count: 0 },
        { range: '19-30', min: 19, max: 30, count: 0 },
        { range: '31-50', min: 31, max: 50, count: 0 },
        { range: '51-70', min: 51, max: 70, count: 0 },
        { range: '70+', min: 71, max: 200, count: 0 }
    ];
    
    familyMembers.forEach(member => {
        if (member.birthDate) {
            const age = new Date().getFullYear() - new Date(member.birthDate).getFullYear();
            const range = ageRanges.find(r => age >= r.min && age <= r.max);
            if (range) range.count++;
        }
    });
    
    demographics.ageGroups = ageRanges.filter(r => r.count > 0);
    
    // Generation breakdown (simplified)
    const generationMap = new Map();
    familyMembers.forEach(member => {
        if (member.birthDate) {
            const birthYear = new Date(member.birthDate).getFullYear();
            const generation = Math.floor((new Date().getFullYear() - birthYear) / 25);
            const genName = getGenerationName(generation);
            generationMap.set(genName, (generationMap.get(genName) || 0) + 1);
        }
    });
    
    demographics.generationBreakdown = Array.from(generationMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    
    return demographics;
}

// Get generation name
function getGenerationName(genNumber) {
    const names = [
        t('currentGeneration') || 'Current Generation',
        t('parentsGeneration') || 'Parents Generation',
        t('grandparentsGeneration') || 'Grandparents Generation',
        t('greatGrandparentsGeneration') || 'Great-Grandparents Generation'
    ];
    return names[genNumber] || `${t('generation') || 'Generation'} ${genNumber + 1}`;
}

// Add PDF footer
function addPDFFooter(pdf) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text(
        `${t('generatedBy') || 'Generated by'} Pyebwa - ${t('yourFamilyTree') || 'Your Family Tree'} | pyebwa.com`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
    );
}

// Show loading overlay for PDF export
function showPDFExportLoading() {
    const overlay = document.createElement('div');
    overlay.id = 'pdfExportOverlay';
    overlay.innerHTML = `
        <div class="pdf-export-loading">
            <div class="spinner"></div>
            <h3>${t('generatingPDF') || 'Generating PDF...'}</h3>
            <p>${t('pleaseWait') || 'Please wait while we create your family tree report'}</p>
        </div>
    `;
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .pdf-export-loading {
            background: white;
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .pdf-export-loading h3 {
            margin: 20px 0 10px;
            color: #00217D;
        }
        .pdf-export-loading p {
            color: #666;
            margin: 0;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
}

// Hide loading overlay
function hidePDFExportLoading() {
    const overlay = document.getElementById('pdfExportOverlay');
    if (overlay) overlay.remove();
}

// Export functions
window.exportFamilyTreePDF = exportFamilyTreePDF;
window.calculateDemographics = calculateDemographics;