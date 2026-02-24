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

    const fontFamily = 'Roboto';
    const semiboldStyle = 'Medium';
    await figma.loadFontAsync({ family: 'Roboto', style: 'Bold' });
    await figma.loadFontAsync({ family: 'Roboto', style: 'Medium' });
    await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });

    const colors = {
      purple:    { r: 0.392, g: 0.341, b: 0.976 }, // #6457f9
      secondary: { r: 0.443, g: 0.463, b: 0.502 }, // #717680
    };

    // ── Outer card frame ───────────────────────────────────────────────────
    const card = figma.createFrame();
    card.name = `${componentName} — Documentation`;
    card.layoutMode = 'VERTICAL';
    card.primaryAxisSizingMode = 'AUTO';
    card.counterAxisSizingMode = 'FIXED';
    card.resize(640, 100); // height auto-grows
    card.paddingLeft   = 48;
    card.paddingRight  = 48;
    card.paddingTop    = 48;
    card.paddingBottom = 48;
    card.itemSpacing   = 0;
    card.fills         = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    card.cornerRadius  = 16;
    card.effects = [{
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.08 },
      offset: { x: 0, y: 8 },
      radius: 24,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL',
    }];

    // ── Helper: add a text node ────────────────────────────────────────────
    function addText({ text, size, style, color, bottomSpacing, lineHeightPercent, opacity }) {
      const node = figma.createText();
      node.fontName    = { family: fontFamily, style: style || 'Regular' };
      node.fontSize    = size || 16;
      node.characters  = text;
      node.fills       = [{ type: 'SOLID', color: color || { r: 0.2, g: 0.2, b: 0.2 }, opacity: opacity !== undefined ? opacity : 1 }];
      node.textAutoResize = 'HEIGHT';
      node.resize(544, node.height); // 640 - 48*2
      if (lineHeightPercent) {
        node.lineHeight = { value: lineHeightPercent, unit: 'PERCENT' };
      }
      card.appendChild(node);

      if (bottomSpacing) {
        const spacer = figma.createFrame();
        spacer.resize(544, bottomSpacing);
        spacer.fills = [];
        card.appendChild(spacer);
      }
      return node;
    }

    // ── Helper: thin divider line ──────────────────────────────────────────
    function addDivider(topGap = 0, bottomGap = 0) {
      if (topGap) {
        const s = figma.createFrame();
        s.resize(544, topGap);
        s.fills = [];
        card.appendChild(s);
      }
      const line = figma.createFrame();
      line.resize(544, 1);
      line.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
      card.appendChild(line);
      if (bottomGap) {
        const s = figma.createFrame();
        s.resize(544, bottomGap);
        s.fills = [];
        card.appendChild(s);
      }
    }

    // ── Component title ────────────────────────────────────────────────────
    addText({
      text: componentName,
      size: 30,
      style: 'Bold',
      color: { r: 0.07, g: 0.07, b: 0.07 },
      bottomSpacing: 6,
    });

    // Spacer after title
    const titleSpacer = figma.createFrame();
    titleSpacer.resize(544, 32);
    titleSpacer.fills = [];
    card.appendChild(titleSpacer);

    // ── Sections ───────────────────────────────────────────────────────────
    sections.forEach((section, index) => {
      if (index > 0) addDivider(32, 32);

      // Section title (larger label)
      addText({
        text: section.title,
        size: 18,
        style: semiboldStyle,
        color: { r: 0.07, g: 0.07, b: 0.07 },
        bottomSpacing: 12,
      });

      // Body text — split on \n\n for sub-sections
      const blocks = section.body.split('\n\n');
      blocks.forEach((block, bi) => {
        const lines = block.split('\n');
        lines.forEach((line, li) => {
          const isSubheading = line.endsWith(':') && line.length < 60;
          addText({
            text: line,
            size: isSubheading ? 14 : 15,
            style: isSubheading ? semiboldStyle : 'Regular',
            color: isSubheading
              ? { r: 0.1, g: 0.1, b: 0.1 }
              : colors.secondary,
            lineHeightPercent: 160,
            bottomSpacing: isSubheading ? 4 : (li < lines.length - 1 ? 2 : 0),
          });
        });
        if (bi < blocks.length - 1) {
          const spacer = figma.createFrame();
          spacer.resize(544, 14);
          spacer.fills = [];
          card.appendChild(spacer);
        }
      });
    });

    // ── Position next to selected component ───────────────────────────────
    const sel = figma.currentPage.selection[0];
    card.x = sel.x + sel.width + 80;
    card.y = sel.y;

    figma.currentPage.selection = [card];
    figma.viewport.scrollAndZoomIntoView([card]);

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