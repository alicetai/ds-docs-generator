// Design System Docs Generator
// Generates generic documentation for the selected component

figma.showUI(__html__, { width: 1000, height: 600 });

// Notify UI of the current selection immediately on plugin open
function isComponent(node) {
  return node.type === 'COMPONENT' || node.type === 'COMPONENT_SET';
}

function notifySelection() {
  const sel = figma.currentPage.selection;
  if (sel.length === 1 && isComponent(sel[0])) {
    figma.ui.postMessage({ type: 'selection-changed', componentName: sel[0].name, isComponent: true });
  } else if (sel.length === 1 && !isComponent(sel[0])) {
    figma.ui.postMessage({ type: 'selection-changed', componentName: null, isComponent: false, nodeType: sel[0].type });
  } else {
    figma.ui.postMessage({ type: 'selection-changed', componentName: null, isComponent: false, nodeType: null });
  }
}

notifySelection();
figma.on('selectionchange', notifySelection);

figma.ui.onmessage = async (msg) => {

  // ── 1. User clicks "Generate" ──────────────────────────────────────────────
  if (msg.type === 'generate-docs') {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Please select a component first.' });
      return;
    }
    if (selection.length > 1) {
      figma.ui.postMessage({ type: 'error', message: 'Please select only one component at a time.' });
      return;
    }

    const node = selection[0];
    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
      figma.ui.postMessage({ type: 'error', message: 'Selected object is not a component. Please select a component.' });
      return;
    }
    const componentName = node.name;
    figma.ui.postMessage({ type: 'component-found', componentName });
  }

  // ── 2. UI sends back the docs to render ────────────────────────────────────
  if (msg.type === 'render-docs') {
    try {
      const { componentName, sections } = msg;

      const fontFamily  = 'Roboto';
      const semiboldStyle = 'Medium';
      await figma.loadFontAsync({ family: 'Roboto', style: 'Bold' });
      await figma.loadFontAsync({ family: 'Roboto', style: 'Medium' });
      await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });

      const colors = {
        purple:    { r: 0.392, g: 0.341, b: 0.976 }, // #6457f9
        secondary: { r: 0.443, g: 0.463, b: 0.502 }, // #717680
      };

      const FRAME_WIDTH = 640;
      const INNER_WIDTH = FRAME_WIDTH - 96; // 48px padding each side

      // ── Helper: create a styled documentation frame ──────────────────────
      function createDocFrame(name) {
        const frame = figma.createFrame();
        frame.name = name;
        frame.layoutMode = 'VERTICAL';
        frame.primaryAxisSizingMode = 'AUTO';
        frame.counterAxisSizingMode = 'FIXED';
        frame.resize(FRAME_WIDTH, 100);
        frame.paddingLeft   = 48;
        frame.paddingRight  = 48;
        frame.paddingTop    = 48;
        frame.paddingBottom = 48;
        frame.itemSpacing   = 0;
        frame.fills         = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        frame.cornerRadius  = 16;
        frame.effects = [{
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.08 },
          offset: { x: 0, y: 8 },
          radius: 24,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL',
        }];
        return frame;
      }

      // ── Helper: append a text node to a frame ───────────────────────────
      function addText(targetFrame, { text, size, style, color, bottomSpacing, lineHeightPercent }) {
        const node = figma.createText();
        node.fontName       = { family: fontFamily, style: style || 'Regular' };
        node.fontSize       = size || 16;
        node.characters     = text;
        node.fills          = [{ type: 'SOLID', color: color || { r: 0.2, g: 0.2, b: 0.2 } }];
        node.textAutoResize = 'HEIGHT';
        node.resize(INNER_WIDTH, node.height);
        if (lineHeightPercent) {
          node.lineHeight = { value: lineHeightPercent, unit: 'PERCENT' };
        }
        targetFrame.appendChild(node);
        if (bottomSpacing) {
          const spacer = figma.createFrame();
          spacer.resize(INNER_WIDTH, bottomSpacing);
          spacer.fills = [];
          targetFrame.appendChild(spacer);
        }
        return node;
      }

      // ── Helper: append a blank spacer to a frame ────────────────────────
      function addSpacer(targetFrame, height) {
        const spacer = figma.createFrame();
        spacer.resize(INNER_WIDTH, height);
        spacer.fills = [];
        targetFrame.appendChild(spacer);
      }

      // ── Helper: render section body text into a frame ────────────────────
      function addSectionBody(targetFrame, body) {
        const blocks = body.split('\n\n');
        blocks.forEach((block, bi) => {
          const lines = block.split('\n');
          lines.forEach((line, li) => {
            if (!line.trim()) return;
            const isSubheading = line.endsWith(':') && line.length < 60;
            addText(targetFrame, {
              text: line,
              size: isSubheading ? 14 : 15,
              style: isSubheading ? semiboldStyle : 'Regular',
              color: isSubheading ? { r: 0.1, g: 0.1, b: 0.1 } : colors.secondary,
              lineHeightPercent: 160,
              bottomSpacing: isSubheading ? 4 : (li < lines.length - 1 ? 2 : 0),
            });
          });
          if (bi < blocks.length - 1) addSpacer(targetFrame, 14);
        });
      }

      // ── One frame per section, stacked vertically with 40px gap ─────────
      const sel    = figma.currentPage.selection[0];
      const frameX = sel.x + sel.width + 80;
      let   nextY  = sel.y;
      const createdFrames = [];

      sections.forEach((section, index) => {
        const frameName = index === 0
          ? `${componentName} — Documentation`
          : `${componentName} — ${section.title}`;

        const frame = createDocFrame(frameName);

        // Component name header in first frame only
        if (index === 0) {
          addText(frame, {
            text: componentName,
            size: 30,
            style: 'Bold',
            color: { r: 0.07, g: 0.07, b: 0.07 },
            bottomSpacing: 6,
          });
          addSpacer(frame, 32);
        }

        addText(frame, {
          text: section.title,
          size: 18,
          style: semiboldStyle,
          color: { r: 0.07, g: 0.07, b: 0.07 },
          bottomSpacing: 12,
        });

        addSectionBody(frame, section.body);

        frame.x = frameX;
        frame.y = nextY;
        nextY += frame.height + 40;

        createdFrames.push(frame);
      });

      figma.currentPage.selection = createdFrames;
      figma.viewport.scrollAndZoomIntoView(createdFrames);
      figma.ui.postMessage({ type: 'success' });
    } catch (error) {
      console.error('Error rendering docs:', error);
      figma.ui.postMessage({ type: 'error', message: 'Failed to create documentation: ' + error.message });
    }
  }

  // ── 3. Cancel ──────────────────────────────────────────────────────────────
  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};