// LeetCode Secure Layout Base CSS — structural overrides for theming
module.exports = `
html[data-lc-theme] {
  --layer-bg-pure: var(--bg-base) !important;
  --layer-bg-gray: var(--bg-base) !important;
  --fill-pure: var(--bg-base) !important;
  --dark-gray-10: var(--bg-base) !important;
  --gray-10: var(--bg-base) !important;

  --layer-01: var(--bg-surface) !important;
  --layer-02: var(--bg-surface) !important;
  --layer-03: var(--bg-surface) !important;
  --dark-gray-20: var(--bg-surface) !important;
  --dark-gray-30: var(--bg-surface) !important;
  --dark-gray-40: var(--bg-surface) !important;
  --gray-20: var(--bg-surface) !important;
  --gray-40: var(--bg-surface) !important;

  --brand-orange: var(--brand-accent) !important;
  --dark-brand-orange: var(--brand-accent) !important;
  --light-brand-orange: var(--brand-accent) !important;
}

html[data-lc-theme] body,
html[data-lc-theme] #__next,
html[data-lc-theme] [class*="bg-dark-layer-bg"],
html[data-lc-theme] [class*="bg-layer-bg"],
html[data-lc-theme] div[class*="bg-zinc-950"],
html[data-lc-theme] div[class*="bg-neutral-950"],
html[data-lc-theme] div[class*="bg-[#1a1a1a]"],
html[data-lc-theme] div[class*="dark:bg-[#1a1a1a]"] {
  background-color: var(--bg-base) !important;
  background-image: none !important;
}

html[data-lc-theme] nav,
html[data-lc-theme] header,
html[data-lc-theme] [class*="bg-dark-layer-1"],
html[data-lc-theme] [class*="bg-lc-layer-01"] {
  background-color: var(--bg-base) !important;
}

html[data-lc-theme] {
  --color-tabset-background: var(--bg-base) !important;
  --color-splitter: var(--bg-base) !important;
  --color-tab-selected-background: var(--bg-surface) !important;
  --color-tab-hover-background: var(--bg-surface) !important;
  --color-tabset-tabbar-background: var(--bg-base) !important;
  --color-tab-selected: #ffffff !important;
  --color-tab-unselected: rgba(255, 255, 255, 0.45) !important;
}

html[data-lc-theme] .bg-sd-background,
html[data-lc-theme] .bg-sd-background-gray,
html[data-lc-theme] .bg-sd-gray-950 {
  background-color: var(--bg-base) !important;
}

html[data-lc-theme] .bg-sd-card,
html[data-lc-theme] .bg-sd-popover,
html[data-lc-theme] .bg-sd-muted,
html[data-lc-theme] .bg-sd-gray-900,
html[data-lc-theme] .bg-sd-gray-800 {
  background-color: var(--bg-surface) !important;
}

html[data-lc-theme] .border-sd-border,
html[data-lc-theme] .border-sd-divider,
html[data-lc-theme] .border-sd-separator-nonopaque,
html[data-lc-theme] .border-sd-gray-700 {
  border-color: var(--border-color) !important;
}

html[data-lc-theme] table,
html[data-lc-theme] thead,
html[data-lc-theme] tbody,
html[data-lc-theme] tr,
html[data-lc-theme] th,
html[data-lc-theme] td,
html[data-lc-theme] [class*="no-scrollbar"],
html[data-lc-theme] .view-lines {
  background-color: transparent !important;
}

html[data-lc-theme] .monaco-editor,
html[data-lc-theme] .monaco-editor-background,
html[data-lc-theme] .monaco-editor .margin,
html[data-lc-theme] .margin-view-overlays {
  background-color: var(--bg-surface) !important;
}

html[data-lc-theme] .monaco-editor .current-line,
html[data-lc-theme] .monaco-editor .view-overlays .current-line,
html[data-lc-theme] .monaco-editor .margin-view-overlays .current-line-margin {
  background-color: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

html[data-lc-theme] .monaco-editor .selected-text,
html[data-lc-theme] .monaco-editor .focused .selected-text,
html[data-lc-theme] .monaco-editor .view-overlays .selected-text,
html[data-lc-theme] div.monaco-editor div.view-overlays div.selected-text,
html[data-lc-theme] ::selection,
html[data-lc-theme] *::selection {
  background-color: color-mix(in srgb, var(--brand-accent) 25%, transparent) !important;
}

html[data-lc-theme] ::-webkit-scrollbar {
  width: 0px !important;
  height: 0px !important;
  display: none !important;
}

html[data-lc-theme] {
  scrollbar-width: none !important;
}
`;
