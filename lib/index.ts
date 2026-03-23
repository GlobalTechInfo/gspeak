/**
 * @module
 * gspeak — Google Text-to-Speech for Node.js, Deno, Bun, browsers, and Cloudflare Workers.
 *
 * Uses only Web-standard APIs (`fetch`, `ReadableStream`, `Uint8Array`) so it works
 * in any runtime. File-saving via {@link gSpeak.save} is supported in Node, Deno, and Bun.
 *
 * @example
 * ```ts
 * import gSpeak from "gspeak"
 *
 * const tts = new gSpeak("Hello world", "en")
 *
 * // Stream audio (browsers, Cloudflare Workers, Node 18+, Deno, Bun)
 * const stream = tts.stream()
 *
 * // Get raw MP3 bytes
 * const bytes = await tts.bytes()
 *
 * // Save to file (Node, Deno, Bun)
 * await tts.save("hello.mp3")
 * ```
 */
export { gSpeak as default, gSpeak } from './gSpeak.ts'
export type { SaveCallback } from './gSpeak.ts'
export { default as LANGUAGES } from './languages.ts'
