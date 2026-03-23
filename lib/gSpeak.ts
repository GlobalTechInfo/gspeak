import generateToken from './gToken.ts'
import LANGUAGES from './languages.ts'

const GOOGLE_TTS_URL = 'https://translate.google.com/translate_tts'
const MAX_CHARS = 100

const escapeRegExp = (s: string): string => s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')

/**
 * Callback passed to the Node-style {@link gSpeak.save} overload.
 * Receives `null` on success or an `Error` on failure.
 */
// deno-lint-ignore no-explicit-any
export type SaveCallback = (err: any) => void

/**
 * Google Text-to-Speech client.
 *
 * Converts text to spoken MP3 audio via the Google TTS endpoint.
 * Long text is automatically split into ≤100-character chunks and reassembled.
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
  private lang: string
  private text: string
  private text_parts: string[]
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

  private getHeaders(): Record<string, string> {
    return {
      'Referer': 'http://translate.google.com/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
    }
  }

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
   * Uses only the Web Fetch API and Streams API — compatible with
   * **Node.js 18+**, **Deno**, **Bun**, **browsers**, and **Cloudflare Workers**.
   *
   * @example
   * ```ts
   * const stream = new gSpeak("Hello", "en").stream()
   * const response = new Response(stream, { headers: { "Content-Type": "audio/mpeg" } })
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
   * @example
   * ```ts
   * const bytes = await new gSpeak("Hello", "en").bytes()
   * // bytes is a Uint8Array containing the MP3 data
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
   * > **Not available in browsers or Cloudflare Workers.** Use {@link stream} or {@link bytes} instead.
   *
   * Accepts an optional Node-style callback for backward compatibility.
   * If no callback is provided, returns a `Promise<void>`.
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

  private _tokenize(text: string, max_size: number): string[] {
    const punc = '¡!()[]¿?.,;:—«»\n'.split('').map(escapeRegExp)
    const parts = text.split(new RegExp(punc.join('|')))
    return parts.flatMap(p => this._minimize(p, ' ', max_size))
  }

  private _minimize(str: string, delim: string, max_size: number): string[] {
    if (str.length <= max_size) return [str]
    const idx = str.lastIndexOf(delim)
    return [str.substring(0, idx), ...this._minimize(str.substring(idx), delim, max_size)]
  }

  /**
   * A map of all supported BCP 47 language codes to their display names.
   *
   * @example
   * ```ts
   * console.log(gSpeak.languages["en"])  // "English"
   * console.log(gSpeak.languages["zh-cn"])  // "Chinese (Simplified)"
   * ```
   */
  static get languages(): Record<string, string> {
    return LANGUAGES
  }
}

export default gSpeak
