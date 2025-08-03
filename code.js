//Testing GitHup push

"use strict";
// Main thread code
// Show the UI
figma.showUI(__html__, {
    width: 320,
    height: 600,
    themeColors: true
});
// Send initial selection to UI
function sendSelectionToUI() {
    const selection = figma.currentPage.selection;
    const selectionData = selection.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        width: 'width' in node ? node.width : 0,
        height: 'height' in node ? node.height : 0,
        hasImageFill: hasImageFill(node)
    }));
    figma.ui.postMessage({
        type: 'selection-changed',
        selection: selectionData,
        count: selection.length
    });
}
// Check if node has image fill
function hasImageFill(node) {
    if ('fills' in node && Array.isArray(node.fills)) {
        return node.fills.some(fill => fill.type === 'IMAGE' && fill.imageHash !== null);
    }
    return false;
}
// Listen for selection changes
figma.on('selectionchange', () => {
    sendSelectionToUI();
});
// Send initial selection when plugin starts
sendSelectionToUI();
// Handle messages from UI
figma.ui.onmessage = async (message) => {
    try {
        switch (message.type) {
            case 'get-selection':
                sendSelectionToUI();
                break;
            case 'export-images':
                await handleExportImages(message.data);
                break;
            case 'close-plugin':
                figma.closePlugin();
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }
    catch (error) {
        console.error('Error handling message:', error);
        figma.ui.postMessage({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};
// Handle image export
async function handleExportImages(exportData) {
    try {
        const { imageConfigs } = exportData;
        const selection = figma.currentPage.selection;
        if (selection.length === 0) {
            figma.ui.postMessage({
                type: 'error',
                message: 'No objects selected'
            });
            return;
        }
        const exportResults = [];
        for (const config of imageConfigs) {
            const node = selection.find(n => n.id === config.nodeId);
            if (!node)
                continue;
            // Determine export format based on config
            const format = config.format.toUpperCase();
            // Create export settings (NO quality parameter)
            const exportSettings = {
                format: format,
                constraint: {
                    type: 'SCALE',
                    value: config.scale
                }
            };
            try {
                // Export the image
                const bytes = await node.exportAsync(exportSettings);
                // Send to UI for compression
                exportResults.push({
                    nodeId: config.nodeId,
                    nodeName: node.name,
                    originalBytes: bytes,
                    config: config,
                    success: true
                });
            }
            catch (exportError) {
                console.error('Export error for node:', node.name, exportError);
                exportResults.push({
                    nodeId: config.nodeId,
                    nodeName: node.name,
                    config: config,
                    success: false,
                    error: exportError instanceof Error ? exportError.message : 'Export failed'
                });
            }
        }
        // Send results to UI for compression
        figma.ui.postMessage({
            type: 'export-results',
            results: exportResults
        });
    }
    catch (error) {
        console.error('Export error:', error);
        figma.ui.postMessage({
            type: 'error',
            message: error instanceof Error ? error.message : 'Export failed'
        });
    }
}
// Keep plugin running until explicitly closed
console.log('Image Compression plugin started');
