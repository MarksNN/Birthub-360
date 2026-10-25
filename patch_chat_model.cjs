const fs = require('fs');
const path = 'src/lib/ai/gateway/chat-model.ts';
let code = fs.readFileSync(path, 'utf8');
if (!code.includes("import { logger } from '../../logger.js';")) {
  code = code.replace(
    "import { assertAiBudgetNotExceeded } from '../budget.js';",
    "import { logger } from '../../logger.js';\nimport { assertAiBudgetNotExceeded } from '../budget.js';"
  );
  fs.writeFileSync(path, code);
  console.log('patched chat-model.ts');
}
