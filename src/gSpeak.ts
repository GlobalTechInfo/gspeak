import { createWriteStream } from 'fs'
import { PassThrough } from 'stream'
import generateToken from './gToken'
import LANGUAGES from './languages'

const GOOGLE_TTS_URL = 'https://translate.google.com/translate_tts'
const MAX_CHARS = 100

const escapeRegExp = (s: string): string => s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')

export type SaveCallback = (err: Error | null) => void

export class gSpeak {
  private lang: string
  private text: string
  private text_parts: string[]
  private debug: boolean

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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
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
      tk: generateToken(part)
    })
    return `${GOOGLE_TTS_URL}?${params}`
  }

  stream(): PassThrough {
    const pass = new PassThrough()

    ;(async () => {
      for (const [idx, part] of this.text_parts.entries()) {
        const url = this.getUrl(part, idx)
        if (this.debug) console.log({ part, idx, url })

        const res = await fetch(url, { headers: this.getHeaders() })
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)

        pass.write(Buffer.from(await res.arrayBuffer()))
      }
      pass.end()
    })().catch(err => pass.destroy(err))

    return pass
  }

  save(filePath: string, callback: SaveCallback): void {
    ;(async () => {
      for (const [idx, part] of this.text_parts.entries()) {
        const url = this.getUrl(part, idx)
        if (this.debug) console.log({ part, idx, url })

        const res = await fetch(url, { headers: this.getHeaders() })
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)

        await new Promise<void>(async (resolve, reject) => {
          const ws = createWriteStream(filePath, { flags: idx > 0 ? 'a' : 'w' })
          ws.on('finish', resolve)
          ws.on('error', reject)
          ws.end(Buffer.from(await res.arrayBuffer()))
        })
      }
    })().then(() => callback(null)).catch(callback)
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

  static get languages(): Record<string, string> {
    return LANGUAGES
  }
}

export default gSpeak
