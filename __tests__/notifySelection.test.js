'use strict';

describe('notifySelection()', () => {
  let notifySelection;
  let postMessage;

  beforeAll(() => {
    postMessage = jest.fn();

    // Mock the Figma sandbox globals that code.js relies on at the top level.
    global.__html__ = '';
    global.figma = {
      showUI: jest.fn(),
      // Capture the selectionchange handler when figma.on() is called.
      on: jest.fn((event, handler) => {
        if (event === 'selectionchange') notifySelection = handler;
      }),
      currentPage: { selection: [] },
      ui: { postMessage, onmessage: null },
    };

    // Loading code.js runs its top-level code, which:
    //   1. calls figma.showUI()
    //   2. calls notifySelection() once immediately
    //   3. calls figma.on('selectionchange', notifySelection)  ← captures handler
    //   4. assigns figma.ui.onmessage
    require('../code');
  });

  beforeEach(() => {
    postMessage.mockClear();
  });

  test('no selection — posts selection-changed with isComponent false and no nodeType', () => {
    global.figma.currentPage.selection = [];

    notifySelection();

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'selection-changed',
      componentName: null,
      isComponent: false,
      nodeType: null,
    });
  });

  test('1 component selected — posts componentName and isComponent true', () => {
    global.figma.currentPage.selection = [{ type: 'COMPONENT', name: 'Button' }];

    notifySelection();

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'selection-changed',
      componentName: 'Button',
      isComponent: true,
      isKnownComponent: true,
    });
  });

  test('1 component with unrecognised name — posts isKnownComponent false', () => {
    global.figma.currentPage.selection = [{ type: 'COMPONENT', name: 'MyCustomWidget' }];

    notifySelection();

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'selection-changed',
      componentName: 'MyCustomWidget',
      isComponent: true,
      isKnownComponent: false,
    });
  });

  test('1 non-component selected — posts isComponent false with nodeType', () => {
    global.figma.currentPage.selection = [{ type: 'RECTANGLE', name: 'Rect 1' }];

    notifySelection();

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'selection-changed',
      componentName: null,
      isComponent: false,
      nodeType: 'RECTANGLE',
    });
  });

  test('multiple mixed objects selected — posts nodeType "OTHER"', () => {
    global.figma.currentPage.selection = [
      { type: 'COMPONENT', name: 'Button' },
      { type: 'TEXT', name: 'Label' },
    ];

    notifySelection();

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'selection-changed',
      componentName: null,
      isComponent: false,
      nodeType: 'OTHER',
    });
  });

  test('multiple components selected — posts nodeType "MULTIPLE_COMPONENTS"', () => {
    global.figma.currentPage.selection = [
      { type: 'COMPONENT', name: 'Button' },
      { type: 'COMPONENT_SET', name: 'Input' },
    ];

    notifySelection();

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'selection-changed',
      componentName: null,
      isComponent: false,
      nodeType: 'MULTIPLE_COMPONENTS',
    });
  });
});
