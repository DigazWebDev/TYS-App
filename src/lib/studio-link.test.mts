import assert from 'node:assert/strict';

import { linkDisplayText, titleFromFileName, validateStudioUrl } from './studio-link.ts';

assert.deepEqual(validateStudioUrl(''), { ok: false, error: 'Indica um endereço.' });
assert.deepEqual(validateStudioUrl('   '), { ok: false, error: 'Indica um endereço.' });
assert.equal(validateStudioUrl('https://exemplo.com/caminho').ok, true);
assert.equal(validateStudioUrl('http://exemplo.com').ok, true);
const https = validateStudioUrl('https://exemplo.com/a');
assert.equal(https.ok, true);
if (https.ok) {
  assert.equal(https.url, 'https://exemplo.com/a');
}
assert.equal(validateStudioUrl('ftp://exemplo.com').ok, false);
assert.equal(validateStudioUrl('javascript:alert(1)').ok, false);
assert.equal(validateStudioUrl('exemplo.com').ok, false);
assert.equal(validateStudioUrl('https://exemplo.com/com espaços').ok, false);
assert.equal(validateStudioUrl('https://').ok, false);

assert.equal(linkDisplayText('https://www.exemplo.com/a', ''), 'exemplo.com');
assert.equal(linkDisplayText('https://exemplo.com', 'O meu site'), 'O meu site');
assert.equal(titleFromFileName('noite-em-lisboa.mp3'), 'noite em lisboa');
assert.equal(titleFromFileName('voz.wav'), 'voz');

console.log('studio-link ok');
