// Bundle Size Analysis Script for Pyebwa App
const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

// Configuration
const config = {
    appDir: path.join(__dirname, 'app'),
    outputFile: 'bundle-analysis.json',
    extensions: ['.js', '.css'],
    excludeDirs: ['node_modules', '.git', 'tests']
};

// Results storage
const results = {
    timestamp: new Date().toISOString(),
    totalSize: 0,
    totalGzipped: 0,
    files: [],
    byType: {},
    byDirectory: {},
    recommendations: []
};

// Get file size and gzipped size
function getFileSizes(filePath) {
    const content = fs.readFileSync(filePath);
    const size = content.length;
    const gzipped = gzipSync(content).length;
    
    return { size, gzipped };
}

// Format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Check if file has optimization potential
function analyzeFile(filePath, content) {
    const recommendations = [];
    const fileName = path.basename(filePath);
    
    // Check for common optimization opportunities
    if (filePath.endsWith('.js')) {
        // Check for console.log statements
        if (content.includes('console.log')) {
            recommendations.push('Contains console.log statements');
        }
        
        // Check for unminified code
        if (content.includes('    ') || content.includes('\n\n')) {
            recommendations.push('Code appears unminified');
        }
        
        // Check for duplicate Firebase imports
        const firebaseImports = (content.match(/firebase/g) || []).length;
        if (firebaseImports > 10) {
            recommendations.push(`High Firebase usage (${firebaseImports} references)`);
        }
        
        // Check for jQuery usage
        if (content.includes('jQuery') || content.includes('$("')) {
            recommendations.push('Uses jQuery - consider vanilla JS');
        }
    }
    
    if (filePath.endsWith('.css')) {
        // Check for unminified CSS
        if (content.includes('    ') || content.includes('\n\n')) {
            recommendations.push('CSS appears unminified');
        }
        
        // Check for vendor prefixes
        if (content.includes('-webkit-') || content.includes('-moz-')) {
            recommendations.push('Contains vendor prefixes - use autoprefixer');
        }
        
        // Check for duplicate rules
        const selectors = content.match(/[^{]+{/g) || [];
        const duplicates = selectors.filter((item, index) => selectors.indexOf(item) !== index);
        if (duplicates.length > 0) {
            recommendations.push(`Contains ${duplicates.length} duplicate selectors`);
        }
    }
    
    return recommendations;
}

// Walk directory recursively
function walkDirectory(dir, baseDir = dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const relativePath = path.relative(baseDir, filePath);
        
        if (stat.isDirectory()) {
            // Skip excluded directories
            if (!config.excludeDirs.includes(file)) {
                walkDirectory(filePath, baseDir);
            }
        } else if (stat.isFile()) {
            // Process files with target extensions
            const ext = path.extname(file);
            if (config.extensions.includes(ext)) {
                const { size, gzipped } = getFileSizes(filePath);
                const content = fs.readFileSync(filePath, 'utf8');
                const recommendations = analyzeFile(filePath, content);
                
                // Add to results
                const fileInfo = {
                    path: relativePath,
                    size,
                    gzipped,
                    sizeFormatted: formatBytes(size),
                    gzippedFormatted: formatBytes(gzipped),
                    compression: ((1 - gzipped / size) * 100).toFixed(1) + '%',
                    recommendations
                };
                
                results.files.push(fileInfo);
                results.totalSize += size;
                results.totalGzipped += gzipped;
                
                // Group by type
                if (!results.byType[ext]) {
                    results.byType[ext] = {
                        count: 0,
                        totalSize: 0,
                        totalGzipped: 0,
                        files: []
                    };
                }
                results.byType[ext].count++;
                results.byType[ext].totalSize += size;
                results.byType[ext].totalGzipped += gzipped;
                results.byType[ext].files.push(relativePath);
                
                // Group by directory
                const dirName = path.dirname(relativePath);
                if (!results.byDirectory[dirName]) {
                    results.byDirectory[dirName] = {
                        count: 0,
                        totalSize: 0,
                        totalGzipped: 0
                    };
                }
                results.byDirectory[dirName].count++;
                results.byDirectory[dirName].totalSize += size;
                results.byDirectory[dirName].totalGzipped += gzipped;
            }
        }
    });
}

// Generate optimization recommendations
function generateRecommendations() {
    // Sort files by size
    const largeFiles = results.files
        .sort((a, b) => b.size - a.size)
        .slice(0, 10);
    
    // Overall recommendations
    if (results.totalSize > 1024 * 1024) { // 1MB
        results.recommendations.push({
            type: 'critical',
            message: `Total bundle size (${formatBytes(results.totalSize)}) exceeds 1MB. Consider code splitting.`
        });
    }
    
    // Check for large individual files
    largeFiles.forEach(file => {
        if (file.size > 100 * 1024) { // 100KB
            results.recommendations.push({
                type: 'warning',
                message: `${file.path} is ${file.sizeFormatted}. Consider splitting or optimizing.`,
                file: file.path
            });
        }
    });
    
    // Check JavaScript files
    if (results.byType['.js']) {
        const jsStats = results.byType['.js'];
        if (jsStats.totalSize > 500 * 1024) { // 500KB
            results.recommendations.push({
                type: 'warning',
                message: `JavaScript files total ${formatBytes(jsStats.totalSize)}. Implement code splitting.`
            });
        }
    }
    
    // Check CSS files
    if (results.byType['.css']) {
        const cssStats = results.byType['.css'];
        if (cssStats.count > 10) {
            results.recommendations.push({
                type: 'info',
                message: `${cssStats.count} CSS files found. Consider consolidating.`
            });
        }
    }
    
    // Check for optimization opportunities
    const unoptimizedFiles = results.files.filter(f => f.recommendations.length > 0);
    if (unoptimizedFiles.length > 0) {
        results.recommendations.push({
            type: 'info',
            message: `${unoptimizedFiles.length} files have optimization opportunities.`
        });
    }
}

// Main execution
console.log('🔍 Analyzing bundle sizes...\n');

walkDirectory(config.appDir);
generateRecommendations();

// Sort files by size for output
results.files.sort((a, b) => b.size - a.size);

// Format results for output
const output = {
    summary: {
        timestamp: results.timestamp,
        totalFiles: results.files.length,
        totalSize: formatBytes(results.totalSize),
        totalGzipped: formatBytes(results.totalGzipped),
        compression: ((1 - results.totalGzipped / results.totalSize) * 100).toFixed(1) + '%'
    },
    byType: Object.entries(results.byType).map(([ext, data]) => ({
        extension: ext,
        count: data.count,
        totalSize: formatBytes(data.totalSize),
        totalGzipped: formatBytes(data.totalGzipped),
        averageSize: formatBytes(data.totalSize / data.count)
    })),
    largestFiles: results.files.slice(0, 10).map(f => ({
        path: f.path,
        size: f.sizeFormatted,
        gzipped: f.gzippedFormatted,
        compression: f.compression
    })),
    recommendations: results.recommendations,
    detailedAnalysis: results.files
};

// Save results
fs.writeFileSync(config.outputFile, JSON.stringify(output, null, 2));

// Console output
console.log('📊 Bundle Analysis Summary');
console.log('==========================\n');
console.log(`Total Files: ${output.summary.totalFiles}`);
console.log(`Total Size: ${output.summary.totalSize}`);
console.log(`Gzipped Size: ${output.summary.totalGzipped}`);
console.log(`Compression: ${output.summary.compression}\n`);

console.log('📁 By File Type:');
output.byType.forEach(type => {
    console.log(`  ${type.extension}: ${type.count} files, ${type.totalSize} (avg: ${type.averageSize})`);
});

console.log('\n🏆 Largest Files:');
output.largestFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.path} - ${file.size} (${file.gzipped} gzipped)`);
});

console.log('\n💡 Recommendations:');
output.recommendations.forEach(rec => {
    const icon = rec.type === 'critical' ? '❗' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`  ${icon} ${rec.message}`);
});

console.log(`\n✅ Full analysis saved to: ${config.outputFile}`);

// Export for use in other scripts
module.exports = { results, output };