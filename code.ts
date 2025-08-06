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
  // Remember selection in client storage
  figma.clientStorage.setAsync('savedSelection', selectionData.map(node => node.id));

  figma.ui.postMessage({
    type: 'selection-changed',
    selection: selectionData,
    count: selection.length
  });
}

// Check if node has image fill
function hasImageFill(node: SceneNode): boolean {
  if ('fills' in node && Array.isArray(node.fills)) {
    return node.fills.some(fill => 
      fill.type === 'IMAGE' && fill.imageHash !== null
    );
  }
  return false;
}

// Restore saved selection
async function restoreSavedSelection() {
  try {
    const savedIds: string[] = await figma.clientStorage.getAsync('savedSelection') || [];
    if (savedIds.length > 0) {
      const nodePromises = savedIds.map(async (id: string) => {
        try {
          return await figma.getNodeByIdAsync(id);
        } 
        catch {
          return null;
        }
      });

      const nodes = await Promise.all(nodePromises);
      const nodesToSelect = nodes.filter((node): node is SceneNode => node !== null) as SceneNode[];

      
      if (nodesToSelect.length > 0) {
        figma.currentPage.selection = nodesToSelect;
        sendSelectionToUI();
      }
    }
  } 
  catch (error) {
    console.log('Could not restore selection:', error);
  }
}

// Listen for selection changes
figma.on('selectionchange', () => {
  sendSelectionToUI();
});

// Send initial selection when plugin starts
sendSelectionToUI();
restoreSavedSelection();

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
  } catch (error) {
    console.error('Error handling message:', error);
    figma.ui.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};

// Handle image export
async function handleExportImages(exportData: any) {
  try {
    const { imageConfigs } = exportData;
    
    if (!imageConfigs || imageConfigs.length === 0) {
      figma.ui.postMessage({
        type: 'error',
        message: 'No images configured for export'
      });
      return;
    }

    const exportResults = [];
    for (const config of imageConfigs) {
      // Find node by ID directly (not from current selection!)
      const node = await figma.getNodeByIdAsync(config.nodeId) as SceneNode;
      
      if (!node) {
        console.error('Node not found:', config.nodeId);
        exportResults.push({
          nodeId: config.nodeId,
          nodeName: config.nodeName || 'Unknown',
          config: config,
          success: false,
          error: 'Node not found - it may have been deleted'
        });
        continue;
      }

      // Determine export format based on config
      const format = config.format.toUpperCase() as 'PNG' | 'JPG';
      
      // Create export settings (NO quality parameter)
      const exportSettings: ExportSettings = {
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

      } catch (exportError) {
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
  } catch (error) {
    console.error('Export error:', error);
    figma.ui.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Export failed'
    });
  }
}

// Keep plugin running until explicitly closed
console.log('Image Compression plugin started');