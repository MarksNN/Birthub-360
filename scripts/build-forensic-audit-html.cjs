const fs = require('fs');
const path = require('path');

// Caminho do Desktop
const desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\Marks', 'Desktop');
const destFile = path.join(desktopDir, 'BIRTHUB360_AUDITORIA_REAL_COMPLETA.html');
const localCopy = path.join(__dirname, '..', '.agents', 'audits', 'BIRTHUB360_AUDITORIA_REAL_COMPLETA.html');

console.log('Target Desktop:', destFile);

// Gerador completo
require('./generate-forensic-audit-report.cjs');
