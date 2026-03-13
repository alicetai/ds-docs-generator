'use strict';

// Tests for extractColors(), extractProperties(), and extractVariants().
//
// These functions are defined in code.js's global scope and are not exported,
// so we test them via the 'get-colors' message handler, which calls all three
// and posts the results back via figma.ui.postMessage.

describe('extractColors()', () => {
  let postMessage;
  let onmessage;

  beforeAll(() => {
    jest.resetModules();
    postMessage = jest.fn();
    global.__html__ = '';
    global.figma = {
      showUI: jest.fn(),
      on: jest.fn(),
      getStyleById: jest.fn().mockReturnValue(null),
      variables: { getVariableById: jest.fn().mockReturnValue(null) },
      currentPage: { selection: [] },
      ui: { postMessage, onmessage: null },
    };
    require('../code');
    onmessage = global.figma.ui.onmessage;
  });

  beforeEach(() => {
    postMessage.mockClear();
    global.figma.getStyleById.mockReturnValue(null);
    global.figma.variables.getVariableById.mockReturnValue(null);
  });

  // Helper: put a COMPONENT node in selection, trigger get-colors, return the posted message.
  async function getColors(nodeProps) {
    global.figma.currentPage.selection = [
      { type: 'COMPONENT', componentPropertyDefinitions: null, description: '', ...nodeProps },
    ];
    await onmessage({ type: 'get-colors' });
    return postMessage.mock.calls[0][0];
  }

  test('no fills → returns empty colors array', async () => {
    const msg = await getColors({ fills: [] });
    expect(msg.colors).toEqual([]);
  });

  test('single SOLID fill → returns hex and hex as fallback name', async () => {
    const msg = await getColors({
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
    });
    expect(msg.colors).toEqual([{ hex: '#ff0000', name: '#ff0000' }]);
  });

  test('fill with a paint style → uses style name', async () => {
    global.figma.getStyleById.mockReturnValue({ name: 'Brand/Primary' });
    const msg = await getColors({
      fillStyleId: 'style-id-123',
      fills: [{ type: 'SOLID', color: { r: 0.39, g: 0.34, b: 0.98 } }],
    });
    expect(msg.colors[0].name).toBe('Brand/Primary');
  });

  test('fill bound to a variable → uses variable name', async () => {
    global.figma.variables.getVariableById.mockReturnValue({ name: 'Color/Blue/500' });
    const msg = await getColors({
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 } }],
      boundVariables: {
        fills: [{ type: 'VARIABLE_ALIAS', id: 'var-id-1' }],
      },
    });
    expect(msg.colors[0].name).toBe('Color/Blue/500');
  });

  test('invisible fill (visible: false) → skipped', async () => {
    const msg = await getColors({
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: false }],
    });
    expect(msg.colors).toEqual([]);
  });

  test('non-SOLID fill → skipped', async () => {
    const msg = await getColors({
      fills: [{ type: 'GRADIENT_LINEAR', color: { r: 1, g: 0, b: 0 } }],
    });
    expect(msg.colors).toEqual([]);
  });

  test('two fills with the same hex → deduplicated to one entry', async () => {
    const msg = await getColors({
      fills: [
        { type: 'SOLID', color: { r: 0, g: 0.502, b: 1 } },
        { type: 'SOLID', color: { r: 0, g: 0.502, b: 1 } },
      ],
    });
    expect(msg.colors).toHaveLength(1);
  });

  test('child node fill → collected via tree traversal', async () => {
    const msg = await getColors({
      fills: [],
      children: [
        { fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 } }] },
      ],
    });
    expect(msg.colors).toEqual([{ hex: '#00ff00', name: '#00ff00' }]);
  });

  test('same color on parent and child → deduplicated', async () => {
    const msg = await getColors({
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
      children: [
        { fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] },
      ],
    });
    expect(msg.colors).toHaveLength(1);
  });

  test('multiple distinct colors from multiple children → all collected', async () => {
    const msg = await getColors({
      fills: [],
      children: [
        { fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] },
        { fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 } }] },
      ],
    });
    expect(msg.colors).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('extractProperties()', () => {
  let postMessage;
  let onmessage;

  beforeAll(() => {
    jest.resetModules();
    postMessage = jest.fn();
    global.__html__ = '';
    global.figma = {
      showUI: jest.fn(),
      on: jest.fn(),
      getStyleById: jest.fn().mockReturnValue(null),
      variables: { getVariableById: jest.fn().mockReturnValue(null) },
      currentPage: { selection: [] },
      ui: { postMessage, onmessage: null },
    };
    require('../code');
    onmessage = global.figma.ui.onmessage;
  });

  beforeEach(() => {
    postMessage.mockClear();
  });

  async function getProperties(defs) {
    global.figma.currentPage.selection = [
      { type: 'COMPONENT', fills: [], description: '', componentPropertyDefinitions: defs },
    ];
    await onmessage({ type: 'get-colors' });
    return postMessage.mock.calls[0][0].properties;
  }

  test('no componentPropertyDefinitions → returns empty array', async () => {
    expect(await getProperties(null)).toEqual([]);
  });

  test('TEXT property → type "text"', async () => {
    const props = await getProperties({ label: { type: 'TEXT' } });
    expect(props).toEqual([{ name: 'label', type: 'text' }]);
  });

  test('BOOLEAN property → type "boolean"', async () => {
    const props = await getProperties({ disabled: { type: 'BOOLEAN' } });
    expect(props).toEqual([{ name: 'disabled', type: 'boolean' }]);
  });

  test('VARIANT property → filtered out', async () => {
    const props = await getProperties({
      Variant: { type: 'VARIANT', variantOptions: ['Primary', 'Secondary'] },
      label: { type: 'TEXT' },
    });
    expect(props).toHaveLength(1);
    expect(props[0].type).toBe('text');
  });

  test('property name with #id:id suffix → suffix stripped', async () => {
    const props = await getProperties({ 'label#2:5': { type: 'TEXT' } });
    expect(props[0].name).toBe('label');
  });

  test('multi-word name → camelCase', async () => {
    const props = await getProperties({ 'Icon Left': { type: 'BOOLEAN' } });
    expect(props[0].name).toBe('iconLeft');
  });

  test('name with hyphens and underscores → camelCase', async () => {
    const props = await getProperties({ 'has-icon_prefix': { type: 'BOOLEAN' } });
    expect(props[0].name).toBe('hasIconPrefix');
  });

  test('name with #id:id suffix and spaces → strips suffix then camelCases', async () => {
    const props = await getProperties({ 'Helper Text#4:10': { type: 'TEXT' } });
    expect(props[0].name).toBe('helperText');
  });

  test('multiple properties → all returned in definition order', async () => {
    const props = await getProperties({
      label: { type: 'TEXT' },
      'is enabled': { type: 'BOOLEAN' },
    });
    expect(props).toEqual([
      { name: 'label', type: 'text' },
      { name: 'isEnabled', type: 'boolean' },
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('extractVariants()', () => {
  let postMessage;
  let onmessage;

  beforeAll(() => {
    jest.resetModules();
    postMessage = jest.fn();
    global.__html__ = '';
    global.figma = {
      showUI: jest.fn(),
      on: jest.fn(),
      getStyleById: jest.fn().mockReturnValue(null),
      variables: { getVariableById: jest.fn().mockReturnValue(null) },
      currentPage: { selection: [] },
      ui: { postMessage, onmessage: null },
    };
    require('../code');
    onmessage = global.figma.ui.onmessage;
  });

  beforeEach(() => {
    postMessage.mockClear();
  });

  async function getVariants(nodeProps) {
    global.figma.currentPage.selection = [
      { fills: [], description: '', componentPropertyDefinitions: null, ...nodeProps },
    ];
    await onmessage({ type: 'get-colors' });
    return postMessage.mock.calls[0][0].variants;
  }

  test('COMPONENT node (not COMPONENT_SET) → returns empty array', async () => {
    const variants = await getVariants({
      type: 'COMPONENT',
      componentPropertyDefinitions: {
        Sentiment: { type: 'VARIANT', variantOptions: ['Error', 'Warning'] },
      },
    });
    expect(variants).toEqual([]);
  });

  test('COMPONENT_SET with no componentPropertyDefinitions → returns empty array', async () => {
    const variants = await getVariants({
      type: 'COMPONENT_SET',
      componentPropertyDefinitions: null,
    });
    expect(variants).toEqual([]);
  });

  test('"variant" property → included', async () => {
    const variants = await getVariants({
      type: 'COMPONENT_SET',
      componentPropertyDefinitions: {
        Variant: { type: 'VARIANT', variantOptions: ['Primary', 'Secondary'] },
      },
    });
    expect(variants).toEqual([{ name: 'Variant', values: ['Primary', 'Secondary'] }]);
  });

  test('"size" property → included', async () => {
    const variants = await getVariants({
      type: 'COMPONENT_SET',
      componentPropertyDefinitions: {
        Size: { type: 'VARIANT', variantOptions: ['Small', 'Medium', 'Large'] },
      },
    });
    expect(variants).toEqual([{ name: 'Size', values: ['Small', 'Medium', 'Large'] }]);
  });

  test('"color", "colour", and "sentiment" properties → all included', async () => {
    const variants = await getVariants({
      type: 'COMPONENT_SET',
      componentPropertyDefinitions: {
        Color: { type: 'VARIANT', variantOptions: ['Blue'] },
        Colour: { type: 'VARIANT', variantOptions: ['Red'] },
        Sentiment: { type: 'VARIANT', variantOptions: ['Error'] },
      },
    });
    expect(variants).toHaveLength(3);
    const names = variants.map(v => v.name.toLowerCase());
    expect(names).toEqual(expect.arrayContaining(['color', 'colour', 'sentiment']));
  });

  test('non-matching variant name (e.g. "State") → filtered out', async () => {
    const variants = await getVariants({
      type: 'COMPONENT_SET',
      componentPropertyDefinitions: {
        State: { type: 'VARIANT', variantOptions: ['Hover', 'Focus'] },
        Sentiment: { type: 'VARIANT', variantOptions: ['Error'] },
      },
    });
    expect(variants).toHaveLength(1);
    expect(variants[0].name).toBe('Sentiment');
  });

  test('only TEXT/BOOLEAN definitions present → no variants returned', async () => {
    const variants = await getVariants({
      type: 'COMPONENT_SET',
      componentPropertyDefinitions: {
        label: { type: 'TEXT' },
        disabled: { type: 'BOOLEAN' },
      },
    });
    expect(variants).toEqual([]);
  });

  test('property name with #id:id suffix → suffix stripped from returned name', async () => {
    const variants = await getVariants({
      type: 'COMPONENT_SET',
      componentPropertyDefinitions: {
        'Sentiment#3:8': { type: 'VARIANT', variantOptions: ['Error', 'Warning'] },
      },
    });
    expect(variants[0].name).toBe('Sentiment');
  });

  test('missing variantOptions → values defaults to empty array', async () => {
    const variants = await getVariants({
      type: 'COMPONENT_SET',
      componentPropertyDefinitions: {
        Variant: { type: 'VARIANT' }, // no variantOptions key
      },
    });
    expect(variants[0].values).toEqual([]);
  });
});
