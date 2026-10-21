import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/lib/auth.ts', 'utf8');
const start = source.indexOf('sendResetPassword:');
const end = source.indexOf('socialProviders,', start);
assert(start > 0 && end > start);
const block = source.slice(start, end);
const loggerCalls = block.match(/logger\.(warn|error)\([\s\S]*?\);/g) || [];
assert(loggerCalls.length >= 4, 'logs de reset e verificação ausentes');
const logged = loggerCalls.join('\n');
assert(!logged.includes('url'), logged);
assert(!logged.includes('user.email'), logged);
assert(!logged.includes('token'), logged);
assert(logged.includes('MAILER_NOT_CONFIGURED'));
assert(block.includes('throw new APIError'));
console.log('PASS: logs de SMTP ausente não incluem URL, token nem e-mail.');
