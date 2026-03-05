// Design System Docs Generator
// Generates generic documentation for the selected component

figma.showUI(__html__, { width: 1000, height: 600 });

// Notify UI of the current selection immediately on plugin open
function isComponent(node) {
  return node.type === 'COMPONENT' || node.type === 'COMPONENT_SET';
}

// Common design system component names to check against
const DS_COMPONENTS = [
  'accordion', 'alert', 'alertdialog', 'avatar', 'badge', 'backdrop', 'banner', 'bottomnav', 'breadcrumb', 'breadcrumb',
  'button', 'buttongroup', 'calendar', 'card', 'carousel', 'chart', 'checkbox', 'chip', 'circularloader', 'colorpicker', 'combobox', 'commandbar', 'contextmenu',
  'datatable', 'datagrid', 'datepicker', 'dialog', 'divider', 'drawer',
  'dropdown', 'dropzone', 'emptystate','filepicker', 'fileupload', 'flyover', 'form','formfield', 'icon', 'iconbutton',
  'input', 'inputfield', 'label', 'linearloader', 'link', 'list', 'listitem', 'loader', 'lookup','megamenu', 'menu', 'messagebox', 'modal', 'navbar',
  'navigation', 'overlay', 'pagination', 'panel', 'paper', 'passwordfield', 'pill', 'popup', 'popover', 'progressbar', 'progressindicator', 'progressstepper', 'progressring',
  'radio', 'radiobutton', 'rating', 'scrollbar', 'searchfield', 'segmentedbutton', 'segmentedcontrol', 'select', 'separator', 'sidebar', 'sidenav', 'sidepanel', 'skeleton', 'slideover', 'slider', 'snackbar',
  'spacer', 'spinner', 'statusindicator', 'stepper', 'switch', 'tab', 'tag', 'tabbar', 'tabs', 'table', 'tag', 'textfield', 'textarea',
  'textfield', 'timeline', 'timepicker', 'toast', 'toggle', 'togglebutton', 'toggleswitch', 'togglegroup', 'tooltip', 'topnav', 'transferlist','treemenu', 'treeview'
];

function isKnownDSComponent(name) {
  const normalized = name.toLowerCase().replace(/[\s\-_/]/g, '');
  return DS_COMPONENTS.some(c => normalized.includes(c));
}

function rgbToHex(r, g, b) {
  const toHex = c => Math.round(c * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

function extractColors(rootNode) {
  const seen = new Map(); // hex -> { hex, name }
  function visit(node) {
    try {
      if ('fills' in node && Array.isArray(node.fills)) {
        node.fills.forEach((fill, i) => {
          if (fill.type !== 'SOLID' || fill.visible === false) return;
          const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
          if (seen.has(hex)) return;
          let name = null;
          // 1. Named paint style
          if (typeof node.fillStyleId === 'string' && node.fillStyleId) {
            try { const s = figma.getStyleById(node.fillStyleId); if (s) name = s.name; } catch (e) {}
          }
          // 2. Bound variable (overrides style)
          if (!name && node.boundVariables && node.boundVariables.fills) {
            const binding = Array.isArray(node.boundVariables.fills) ? node.boundVariables.fills[i] : null;
            if (binding && binding.type === 'VARIABLE_ALIAS') {
              try { const v = figma.variables.getVariableById(binding.id); if (v) name = v.name; } catch (e) {}
            }
          }
          seen.set(hex, { hex, name: name || hex });
        });
      }
    } catch (e) {}
    if ('children' in node) node.children.forEach(visit);
  }
  visit(rootNode);
  return Array.from(seen.values());
}

function notifySelection() {
  const sel = figma.currentPage.selection;
  if (sel.length === 1 && isComponent(sel[0])) {
    figma.ui.postMessage({ type: 'selection-changed', componentName: sel[0].name, isComponent: true, isKnownComponent: isKnownDSComponent(sel[0].name) });
  } else if (sel.length === 1 && !isComponent(sel[0])) {
    figma.ui.postMessage({ type: 'selection-changed', componentName: null, isComponent: false, nodeType: sel[0].type });
  } else {
    figma.ui.postMessage({ type: 'selection-changed', componentName: null, isComponent: false, nodeType: null });
  }
}

notifySelection();
figma.on('selectionchange', notifySelection);

figma.ui.onmessage = async (msg) => {

  // ── 0. UI requests colour data from the selected component ───────────────
  if (msg.type === 'get-colors') {
    const sel = figma.currentPage.selection;
    const colorList = (sel.length === 1 && isComponent(sel[0]))
      ? extractColors(sel[0])
      : [];
    figma.ui.postMessage({ type: 'colors-data', colors: colorList });
  }

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
      const palette = msg.colors || [];

      const fontFamily  = 'Inter';
      const semiboldStyle = 'Semi Bold';
      await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

      const colors = {
        purple:    { r: 0.392, g: 0.341, b: 0.976 }, // #6457f9
        secondary: { r: 0.443, g: 0.463, b: 0.502 }, // #717680
      };

      const FRAME_WIDTH = 640;
      const INNER_WIDTH = FRAME_WIDTH - 96; // 48px padding each side
      const BORDER_COLOR = { r: 0.898, g: 0.914, b: 0.929 }; // #e5e7eb

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
        node.fontSize       = size || 14;
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

      // ── Helper: bold section heading + divider ───────────────────────────
      function addSectionHeading(targetFrame, text) {
        addText(targetFrame, {
          text,
          size: 28,
          style: 'Bold',
          color: { r: 0.07, g: 0.07, b: 0.07 },
          bottomSpacing: 12,
        });
        const divider = figma.createRectangle();
        divider.resize(INNER_WIDTH, 1);
        divider.fills = [{ type: 'SOLID', color: BORDER_COLOR }];
        targetFrame.appendChild(divider);
        addSpacer(targetFrame, 20);
      }

      // ── Helper: render section body text into a frame ────────────────────
      function addSectionBody(targetFrame, body) {
        const blocks = body.split('\n\n');
        blocks.forEach((block, bi) => {
          const lines = block.split('\n');
          lines.forEach((line, li) => {
            if (!line.trim()) return;
            if (line.startsWith('# ')) {
              addSectionHeading(targetFrame, line.slice(2).trim());
            } else if (line.startsWith('## ')) {
              addText(targetFrame, {
                text: line.slice(3).trim(),
                size: 16,
                style: semiboldStyle,
                color: { r: 0.1, g: 0.1, b: 0.1 },
                lineHeightPercent: 160,
                bottomSpacing: 4,
              });
            } else {
              addText(targetFrame, {
                text: line,
                size: 14,
                style: 'Regular',
                color: colors.secondary,
                lineHeightPercent: 160,
                bottomSpacing: li < lines.length - 1 ? 2 : 0,
              });
            }
          });
          if (bi < blocks.length - 1) addSpacer(targetFrame, 14);
        });
      }

      // ── Merge Introduction + When to use into one frame ──────────────────
      const introIdx = sections.findIndex(s => s.title === 'Introduction');
      const whenIdx  = sections.findIndex(s => s.title === 'When to use');
      const renderSections = sections.slice();
      if (introIdx !== -1 && whenIdx !== -1) {
        renderSections.splice(Math.min(introIdx, whenIdx), 2, {
          title: 'Introduction',
          body: sections[introIdx].body + '\n\n' + sections[whenIdx].body,
        });
      }

      // ── One frame per section, stacked horizontally with 40px gap ────────
      const sel    = figma.currentPage.selection[0];
      let   nextX  = sel.x + sel.width + 80;
      const frameY = sel.y;
      const createdFrames = [];

      renderSections.forEach((section, index) => {
        const frameName = index === 0
          ? `${componentName} — Introduction`
          : `${componentName} — ${section.title}`;

        const frame = createDocFrame(frameName);

        addSectionHeading(frame, section.title);

        if (section.title === 'Characteristics') {
          // Parse body: # → H1, ## → H2, colour lines → skip, other → body text
          const bodyLines = section.body.split('\n');
          bodyLines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;
            if (/,\s*#[0-9a-fA-F]{6}$/i.test(trimmed)) return; // colour data lines
            if (trimmed.startsWith('# ')) {
              addSectionHeading(frame, trimmed.slice(2));
            } else if (trimmed.startsWith('## ')) {
              addText(frame, {
                text: trimmed.slice(3),
                size: 16,
                style: semiboldStyle,
                color: { r: 0.1, g: 0.1, b: 0.1 },
                lineHeightPercent: 160,
                bottomSpacing: 4,
              });
            } else {
              addText(frame, {
                text: trimmed,
                size: 14,
                style: 'Regular',
                color: colors.secondary,
                lineHeightPercent: 160,
                bottomSpacing: 8,
              });
            }
          });

          if (palette.length > 0) {
            // Layout constants
            const SWATCH_X  = 16;
            const NAME_X    = SWATCH_X + 20 + 12; // 48
            const HEX_X     = INNER_WIDTH - 100;
            const HEADER_H  = 36;
            const ROW_H     = 40;
            const SEP_H     = 1;
            const totalH = HEADER_H + SEP_H + palette.length * ROW_H + (palette.length - 1) * SEP_H;

            // Table container (no layoutMode — children are absolute)
            const table = figma.createFrame();
            table.name = 'Colour table';
            table.resize(INNER_WIDTH, totalH);
            table.cornerRadius = 8;
            table.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            table.strokes = [{ type: 'SOLID', color: BORDER_COLOR }];
            table.strokeWeight = 1;
            table.clipsContent = true;

            // Header background
            const hBg = figma.createRectangle();
            hBg.resize(INNER_WIDTH, HEADER_H);
            hBg.x = 0; hBg.y = 0;
            hBg.fills = [{ type: 'SOLID', color: { r: 0.976, g: 0.98, b: 0.984 } }];
            table.appendChild(hBg);

            // Header: "Name" label
            const hName = figma.createText();
            hName.fontName = { family: fontFamily, style: semiboldStyle };
            hName.fontSize = 14;
            hName.characters = 'Name';
            hName.fills = [{ type: 'SOLID', color: { r: 0.612, g: 0.639, b: 0.671 } }];
            hName.textAutoResize = 'WIDTH_AND_HEIGHT';
            hName.x = NAME_X;
            hName.y = Math.round((HEADER_H - hName.height) / 2);
            table.appendChild(hName);

            // Header: "Hex" label
            const hHex = figma.createText();
            hHex.fontName = { family: fontFamily, style: semiboldStyle };
            hHex.fontSize = 14;
            hHex.characters = 'Hex';
            hHex.fills = [{ type: 'SOLID', color: { r: 0.612, g: 0.639, b: 0.671 } }];
            hHex.textAutoResize = 'WIDTH_AND_HEIGHT';
            hHex.x = HEX_X;
            hHex.y = Math.round((HEADER_H - hHex.height) / 2);
            table.appendChild(hHex);

            // Separator below header
            const hSep = figma.createRectangle();
            hSep.resize(INNER_WIDTH, SEP_H);
            hSep.x = 0; hSep.y = HEADER_H;
            hSep.fills = [{ type: 'SOLID', color: BORDER_COLOR }];
            table.appendChild(hSep);

            // Data rows
            let rowY = HEADER_H + SEP_H;
            palette.forEach((color, i) => {
              if (i > 0) {
                const sep = figma.createRectangle();
                sep.resize(INNER_WIDTH, SEP_H);
                sep.x = 0; sep.y = rowY;
                sep.fills = [{ type: 'SOLID', color: BORDER_COLOR }];
                table.appendChild(sep);
                rowY += SEP_H;
              }

              const midY = rowY + ROW_H / 2;

              // Colour swatch
              const ellipse = figma.createEllipse();
              ellipse.resize(20, 20);
              ellipse.fills = [{ type: 'SOLID', color: hexToRgb(color.hex) }];
              ellipse.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.08 }];
              ellipse.strokeWeight = 1;
              ellipse.x = SWATCH_X;
              ellipse.y = Math.round(midY - 10);
              table.appendChild(ellipse);

              // Name
              const nameNode = figma.createText();
              nameNode.fontName = { family: fontFamily, style: 'Regular' };
              nameNode.fontSize = 14;
              nameNode.characters = color.name;
              nameNode.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.07 } }];
              nameNode.textAutoResize = 'WIDTH_AND_HEIGHT';
              nameNode.x = NAME_X;
              nameNode.y = Math.round(midY - nameNode.height / 2);
              table.appendChild(nameNode);

              // Hex code
              const hexNode = figma.createText();
              hexNode.fontName = { family: fontFamily, style: 'Regular' };
              hexNode.fontSize = 14;
              hexNode.characters = color.hex.toUpperCase();
              hexNode.fills = [{ type: 'SOLID', color: colors.secondary }];
              hexNode.textAutoResize = 'WIDTH_AND_HEIGHT';
              hexNode.x = HEX_X;
              hexNode.y = Math.round(midY - hexNode.height / 2);
              table.appendChild(hexNode);

              rowY += ROW_H;
            });

            frame.appendChild(table);
            addSpacer(frame, 4);
          }
        } else {
          addSectionBody(frame, section.body);
        }

        frame.x = nextX;
        frame.y = frameY;
        nextX += FRAME_WIDTH + 40;

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