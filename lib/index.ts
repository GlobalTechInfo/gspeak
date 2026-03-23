/**
 * gspeak — Google Text-to-Speech for Node.js, Deno, Bun, browsers, and Cloudflare Workers.
 *
 * Uses only Web-standard APIs (`fetch`, `ReadableStream`, `Uint8Array`) so it runs
 * in any modern runtime. File saving via {@link gSpeak.save} is available in Node, Deno, and Bun.
 *
 * @example
 * ```ts
 * import gSpeak from "gspeak"
 *
 * const tts = new gSpeak("Hello world", "en")
 *
 * // Stream audio (works everywhere)
 * const stream = tts.stream()
 *
 * // Get raw MP3 bytes (works everywhere)
 * const bytes = await tts.bytes()
 *
 * // Save to file (Node, Deno, Bun only)
 * await tts.save("hello.mp3")
 * ```
 *
 * @module
 */
export { gSpeak as default, gSpeak } from './gSpeak.ts'
export type { SaveCallback } from './gSpeak.ts'
export { default as LANGUAGES } from './languages.ts'
