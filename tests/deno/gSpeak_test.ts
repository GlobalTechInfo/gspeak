/**
 * Deno tests for the gSpeak tokenizer (issue #1 regression).
 *
 * Run with: `deno test --allow-read tests/` (from the repo root, using deno.json).
 * These tests import the Deno/Bun/browser-compatible class from lib/ and verify
 * that `_minimize` keeps chunks within MAX_CHARS and never overflows the call
 * stack on long, space-free text (CJK, URLs, long tokens).
 */
import { gSpeak } from '../../lib/index.ts';

// text_parts is private in TypeScript; read through a cast for these tests.
// deno-lint-ignore no-explicit-any
function chunks(tts: gSpeak): string[] {
  return (tts as any).text_parts;
}

Deno.test('long clause with spaces splits into chunks of <= 100 chars', () => {
  const tts = new gSpeak('word '.repeat(60).trim(), 'en');
  const parts = chunks(tts);
  parts.forEach((p) => {
    if (p.length > 100) throw new Error(`chunk too long (${p.length}): ${p}`);
  });
  if (parts.length < 2) {
    throw new Error(`expected multiple chunks, got ${parts.length}`);
  }
});

Deno.test('no-space >100-char text (CJK) does not overflow the stack', () => {
  const tts = new gSpeak('你好世界，这是一个测试。'.repeat(10), 'zh');
  const parts = chunks(tts);
  parts.forEach((p) => {
    if (p.length > 100) throw new Error(`chunk too long (${p.length})`);
  });
});

Deno.test('long URL / no-space token does not overflow the stack', () => {
  const tts = new gSpeak('https://example.com/' + 'a'.repeat(150), 'en');
  const parts = chunks(tts);
  parts.forEach((p) => {
    if (p.length > 100) throw new Error(`chunk too long (${p.length})`);
  });
});

Deno.test('a >=100-char token after a space does not overflow the stack', () => {
  const tts = new gSpeak('ok ' + 'x'.repeat(120) + ' end', 'en');
  const parts = chunks(tts);
  parts.forEach((p) => {
    if (p.length > 100) throw new Error(`chunk too long (${p.length})`);
  });
});

Deno.test('a 100-char string stays a single chunk', () => {
  const tts = new gSpeak('a'.repeat(100), 'en');
  const parts = chunks(tts);
  if (parts.length !== 1) {
    throw new Error(`expected 1 chunk, got ${parts.length}`);
  }
});
