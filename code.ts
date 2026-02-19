figma.showUI(__html__, { width: 520, height: 640 });

figma.on("run", () => {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "Please select a component."
    });
    return;
  }

  const node = selection[0];

  if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") {
    figma.ui.postMessage({
      type: "error",
      message: "Selected layer is not a component."
    });
    return;
  }

  const componentName = node.name;

  figma.ui.postMessage({
    type: "component-selected",
    componentName
  });
});