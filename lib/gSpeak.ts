/**
 * Core gSpeak class and SaveCallback type.
 *
 * @module
 */
import generateToken from './gToken.ts'
import LANGUAGES from './languages.ts'

const GOOGLE_TTS_URL = 'https://translate.google.com/translate_tts'
const MAX_CHARS = 100

const escapeRegExp = (s: string): string => s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')

/**
 * Callback passed to the Node-style {@link gSpeak.save} overload.
 * Receives `null` on success or an `Error` on failure.
 *
 * @param err - `null` on success, `Error` on failure.
 */
// deno-lint-ignore no-explicit-any
export type SaveCallback = (err: any) => void

/**
 * Google Text-to-Speech client.
 *
 * Converts text to spoken MP3 audio via the Google TTS endpoint.
 * Long text is automatically split into chunks of ≤100 characters and reassembled.
 *
 * Compatible with **Node.js**, **Deno**, **Bun**, **browsers**, and **Cloudflare Workers**.
 * Use {@link stream} or {@link bytes} in browser and worker environments.
 * Use {@link save} in Node, Deno, or Bun to write directly to a file.
 *
 * @example
 * ```ts
 * const tts = new gSpeak("Hello world", "en")
 * const bytes = await tts.bytes()
 * ```
 */
export class gSpeak {
  /** The BCP 47 language code used for this instance. */
  private lang: string

  /** The original text passed to the constructor. */
  private text: string

  /** The text split into ≤100-character chunks ready for requests. */
  private text_parts: string[]

  /** Whether debug logging is enabled. */
  private debug: boolean

  /**
   * Creates a new `gSpeak` instance.
   *
   * @param text - The text to convert to speech.
   * @param lang - BCP 47 language code (e.g. `"en"`, `"fr"`, `"zh-cn"`). Defaults to `"en"`.
   * @param debug - If `true`, logs each request URL to the console. Defaults to `false`.
   * @throws {Error} If `lang` is not a supported language code.
   * @throws {Error} If `text` is empty.
   *
   * @example
   * ```ts
   * const tts = new gSpeak("Bonjour le monde", "fr")
   * ```
   */
  constructor(text: string, lang = 'en', debug = false) {
    this.debug = debug

    if (!LANGUAGES[lang.toLowerCase()])
      throw new Error(`Language not supported: ${lang}`)
    this.lang = lang.toLowerCase()

    if (!text)
      throw new Error('No text to speak')
    this.text = text

    let parts = text.length <= MAX_CHARS ? [text] : this._tokenize(text, MAX_CHARS)
    parts = parts.map(p => p.replace(/\\n/g, '').trim()).filter(p => p.length > 0)
    this.text_parts = parts
  }

  /**
   * Returns the HTTP headers required by the Google TTS endpoint.
   *
   * @returns Headers object with `Referer` and `User-Agent`.
   */
  private getHeaders(): Record<string, string> {
    return {
      'Referer': 'http://translate.google.com/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
    }
  }

  /**
   * Builds the Google TTS request URL for a single text chunk.
   *
   * @param part - The text chunk to synthesize.
   * @param idx - The index of this chunk within the full text.
   * @returns The fully constructed request URL string.
   */
  private getUrl(part: string, idx: number): string {
    const params = new URLSearchParams({
      ie: 'UTF-8',
      q: part,
      tl: this.lang,
      total: String(this.text_parts.length),
      idx: String(idx),
      client: 'tw-ob',
      textlen: String(part.length),
      tk: generateToken(part),
    })
    return `${GOOGLE_TTS_URL}?${params}`
  }

  /**
   * Returns a Web `ReadableStream<Uint8Array>` of the MP3 audio data.
   *
   * Uses only the Web Fetch and Streams APIs — compatible with
   * **Node.js 18+**, **Deno**, **Bun**, **browsers**, and **Cloudflare Workers**.
   *
   * @returns A `ReadableStream` that emits MP3 audio chunks.
   *
   * @example
   * ```ts
   * // Cloudflare Worker / browser
   * const stream = new gSpeak("Hello", "en").stream()
   * return new Response(stream, { headers: { "Content-Type": "audio/mpeg" } })
   * ```
   */
  stream(): ReadableStream<Uint8Array> {
    const parts = this.text_parts
    const getUrl = this.getUrl.bind(this)
    const getHeaders = this.getHeaders.bind(this)
    const debug = this.debug

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for (const [idx, part] of parts.entries()) {
            const url = getUrl(part, idx)
            if (debug) console.log({ part, idx, url })

            const res = await fetch(url, { headers: getHeaders() })
            if (!res.ok) throw new Error(`Request failed: ${res.status}`)

            controller.enqueue(new Uint8Array(await res.arrayBuffer()))
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })
  }

  /**
   * Fetches all audio chunks and returns the complete MP3 as a `Uint8Array`.
   *
   * Works in every runtime — **Node.js**, **Deno**, **Bun**, **browsers**, and **Cloudflare Workers**.
   *
   * @returns A `Promise` that resolves to a `Uint8Array` containing the full MP3 data.
   *
   * @example
   * ```ts
   * const bytes = await new gSpeak("Hello", "en").bytes()
   * ```
   */
  async bytes(): Promise<Uint8Array> {
    const chunks: Uint8Array[] = []
    const reader = this.stream().getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    const total = chunks.reduce((n, c) => n + c.length, 0)
    const out = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      out.set(chunk, offset)
      offset += chunk.length
    }
    return out
  }

  /**
   * Saves the MP3 audio to a file on disk.
   *
   * - **Deno**: uses `Deno.writeFile`
   * - **Node.js / Bun**: uses `node:fs/promises`
   *
   * > **Not available in browsers or Cloudflare Workers.**
   * > Use {@link stream} or {@link bytes} instead.
   *
   * @param filePath - Path to write the MP3 file to.
   * @param callback - Optional Node-style callback `(err) => void`.
   *
   * @example
   * ```ts
   * // Promise style
   * await tts.save("output.mp3")
   *
   * // Callback style (Node.js)
   * tts.save("output.mp3", (err) => { if (err) throw err })
   * ```
   */
  async save(filePath: string): Promise<void>
  save(filePath: string, callback: SaveCallback): void
  save(filePath: string, callback?: SaveCallback): void | Promise<void> {
    const run = async (): Promise<void> => {
      const data = await this.bytes()

      if (typeof Deno !== 'undefined') {
        // deno-lint-ignore no-explicit-any
        await (globalThis as any).Deno.writeFile(filePath, data)
        return
      }

      // Node / Bun
      // deno-lint-ignore no-explicit-any
      const { writeFile } = await import('node:fs/promises') as any
      await writeFile(filePath, data)
    }

    if (callback) {
      run().then(() => callback(null)).catch(callback)
    } else {
      return run()
    }
  }

  /**
   * Splits text into chunks that respect sentence boundaries and fit within `max_size`.
   *
   * @param text - The full text to split.
   * @param max_size - Maximum character length per chunk.
   * @returns An array of text chunks.
   */
  private _tokenize(text: string, max_size: number): string[] {
    const punc = '¡!()[]¿?.,;:—«»\n'.split('').map(escapeRegExp)
    const parts = text.split(new RegExp(punc.join('|')))
    return parts.flatMap(p => this._minimize(p, ' ', max_size))
  }

  /**
   * Recursively splits a string by `delim` until all parts fit within `max_size`.
   *
   * @param str - The string to split.
   * @param delim - The delimiter to split on.
   * @param max_size - Maximum character length per part.
   * @returns An array of strings each within `max_size`.
   */
  private _minimize(str: string, delim: string, max_size: number): string[] {
    if (str.length <= max_size) return [str]
    const idx = str.lastIndexOf(delim)
    return [str.substring(0, idx), ...this._minimize(str.substring(idx), delim, max_size)]
  }

  /**
   * A map of all supported BCP 47 language codes to their display names.
   *
   * @returns A `Record<string, string>` of language code to display name.
   *
   * @example
   * ```ts
   * console.log(gSpeak.languages["en"])    // "English"
   * console.log(gSpeak.languages["zh-cn"]) // "Chinese (Simplified)"
   * ```
   */
  static get languages(): Record<string, string> {
    return LANGUAGES
  }
}

export default gSpeak
