const fs = require('fs');
const path = 'c:/Users/rdmeh/Downloads/assignment 6/frontend/src/app/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// The mojibake strings
const replacements = [
  { search: 'â‚¹', replace: '₹' },
  { search: 'â–²', replace: '▲' },
  { search: 'â–¼', replace: '▼' },
  { search: 'â”€', replace: '─' },
  { search: 'Â·', replace: '·' },
  { search: 'âœ“', replace: '✓' },
  { search: 'â• ', replace: '═' }
];

replacements.forEach(r => {
  content = content.split(r.search).join(r.replace);
});

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully fixed mojibake characters in page.tsx!');
