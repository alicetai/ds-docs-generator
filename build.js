const fs = require('fs');

// ── 1. Build code.js = tokens.js + code-src.js ───────────────────────────────
const tokens  = fs.readFileSync('tokens.js',   'utf8');
const codeSrc = fs.readFileSync('code-src.js', 'utf8');
fs.writeFileSync('code.js', '// GENERATED — edit code-src.js and tokens.js\n' + tokens + '\n' + codeSrc);

// ── 2. Inject TOKENS into ui.html between marker comments ────────────────────
const CSS_VAR_MAP = [
  ['--color-brand-primary',    'TOKENS.brandPrimary'],
  ['--color-brand-secondary',  'TOKENS.brandSecondary'],
  ['--color-text-primary',     'TOKENS.textPrimary'],
  ['--color-text-secondary',   'TOKENS.textSecondary'],
  ['--color-text-tertiary',    'TOKENS.textTertiary'],
  ['--color-background-primary', 'TOKENS.backgroundPrimary'],
  ['--color-border',           'TOKENS.border'],
  ['--font-size-md',           'TOKENS.fontSizeMd'],
];

const cssVarLines = CSS_VAR_MAP
  .map(([k, v]) => `    document.documentElement.style.setProperty('${k}', ${v});`)
  .join('\n');

const injection =
  '<!-- TOKENS_START -->\n' +
  '<script>\n' +
  '  // AUTO-GENERATED — edit tokens.js and run `npm run build`\n' +
  tokens.trim() + '\n' +
  cssVarLines + '\n' +
  '</script>\n' +
  '<!-- TOKENS_END -->';

let ui = fs.readFileSync('ui.html', 'utf8');
ui = ui.replace(/<!-- TOKENS_START -->[\s\S]*?<!-- TOKENS_END -->/, injection);
fs.writeFileSync('ui.html', ui);

console.log('Build complete.');
