const fs = require('fs');
const path = require('path');

const frontendDir = path.resolve(__dirname);
const rootDir = path.resolve(__dirname, '..');

const css = fs.readFileSync(path.join(frontendDir, 'src', 'styles.css'), 'utf-8');
const jsFiles = [
  'globals.js',
  'firebase-init.js',
  'utils.js',
  'api.js',
  'components/shared.js',
  'components/employee.js',
  'components/manager.js',
  'components/people.js',
  'components/detail.js',
  'components/device.js',
  'main.js'
];

let js = jsFiles.map(f => fs.readFileSync(path.join(frontendDir, 'src', f), 'utf-8')).join('\n');
let body = fs.readFileSync(path.join(frontendDir, 'src', 'body.html'), 'utf-8');

const logoBytes = fs.readFileSync(path.join(frontendDir, 'src', 'logo-circle.png'));
const logoBase64 = logoBytes.toString('base64');
const logoUrl = `data:image/png;base64,${logoBase64}`;

body = body.replace(/src\/logo-circle\.png/g, logoUrl);
js = js.replace(/src\/logo-circle\.png/g, logoUrl);

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>IRack IT Solution · WorkTime ERP</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>${css}</style></head><body>
${body}
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script>
${js}
</script></body></html>
`;

const frontendDist = path.join(frontendDir, 'dist');
if (!fs.existsSync(frontendDist)) fs.mkdirSync(frontendDist, { recursive: true });
fs.writeFileSync(path.join(frontendDist, 'workforce-erp.html'), html, 'utf-8');

const rootDist = path.join(rootDir, 'dist');
if (!fs.existsSync(rootDist)) fs.mkdirSync(rootDist, { recursive: true });
fs.writeFileSync(path.join(rootDist, 'workforce-erp.html'), html, 'utf-8');

console.log('Successfully built workforce-erp.html in frontend/dist and dist/');
