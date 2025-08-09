# Image Compression Figma Plugin

A Figma plugin to compress and export selected images.

## Features
- Real-time selection detection and updates.
- Built-in presets for common export settings (Mobile, Tablet, Room Title, Store Preview).
- Adjustable quality sliders for JPG and PNG.
- Export images at custom scale and format; outputs a zipped download.
- Remembers the last selection across plugin runs.

## Installation
1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install

Build the plugin:

npm run build
In Figma, go to Plugins → Development → Import plugin from manifest... and choose the manifest.json file from this project.

Usage
-Select frames or layers containing images in your Figma file.
-Run Image Compression from the plugin menu.
-Click Add Selected Images to queue the current selection.
-Optionally apply a preset or tweak format, scale, and quality for each image.
-Press Compress & Export to download the optimized images as a ZIP archive.

Development
Watch for changes during development:
npm run watch
Main plugin logic lives in code.ts; the UI is defined in ui.html.
The build step compiles TypeScript to code.js.
