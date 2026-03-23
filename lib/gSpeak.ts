import generateToken from './gToken.ts';
import LANGUAGES from './languages.ts';

const GOOGLE_TTS_URL = 'https://translate.google.com/translate_tts';
const MAX_CHARS = 100;

const escapeRegExp = (s: string): string =>
  s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

/** Callback used by the Node.js-compatible `save()` overload */
// deno-lint-ignore no-explicit-any
export type SaveCallback = (err: any) => void;

export class gSpeak {
  private lang: string;
  private text: string;
  private text_parts: string[];
  private debug: boolean;

  constructor(text: string, lang = 'en', debug = false) {
    this.debug = debug;

    if (!LANGUAGES[lang.toLowerCase()]) {
      throw new Error(`Language not supported: ${lang}`);
    }
    this.lang = lang.toLowerCase();

    if (!text) {
      throw new Error('No text to speak');
    }
    this.text = text;

    let parts = text.length <= MAX_CHARS
      ? [text]
      : this._tokenize(text, MAX_CHARS);
    parts = parts.map((p) => p.replace(/\\n/g, '').trim()).filter((p) =>
      p.length > 0
    );
    this.text_parts = parts;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Referer': 'http://translate.google.com/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
    };
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
    });
    return `${GOOGLE_TTS_URL}?${params}`;
  }

  /**
   * Returns a Web `ReadableStream<Uint8Array>` of the audio data.
   * Works in Deno, Bun, Node 18+, and browsers.
   */
  stream(): ReadableStream<Uint8Array> {
    const parts = this.text_parts;
    const getUrl = this.getUrl.bind(this);
    const getHeaders = this.getHeaders.bind(this);
    const debug = this.debug;

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for (const [idx, part] of parts.entries()) {
            const url = getUrl(part, idx);
            if (debug) console.log({ part, idx, url });

            const res = await fetch(url, { headers: getHeaders() });
            if (!res.ok) throw new Error(`Request failed: ${res.status}`);

            controller.enqueue(new Uint8Array(await res.arrayBuffer()));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  }

  /**
   * Collects all audio chunks and returns the complete MP3 as a `Uint8Array`.
   * Universal — works in Deno, Node, Bun, and browsers.
   */
  async bytes(): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    const reader = this.stream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  /**
   * Saves audio to a file.
   * - In **Deno**: uses `Deno.writeFile`.
   * - In **Node / Bun**: dynamically imports `node:fs/promises`.
   *
   * Accepts an optional Node-style callback for backward compatibility.
   */
  async save(filePath: string): Promise<void>;
  save(filePath: string, callback: SaveCallback): void;
  save(filePath: string, callback?: SaveCallback): void | Promise<void> {
    const run = async (): Promise<void> => {
      const data = await this.bytes();

      // Deno
      if (typeof Deno !== 'undefined') {
        // deno-lint-ignore no-explicit-any
        await (globalThis as any).Deno.writeFile(filePath, data);
        return;
      }

      // Node / Bun — dynamic import so this file stays parseable in Deno
      // deno-lint-ignore no-explicit-any
      const { writeFile } = await import('node:fs/promises') as any;
      await writeFile(filePath, data);
    };

    if (callback) {
      run().then(() => callback(null)).catch(callback);
    } else {
      return run();
    }
  }

  private _tokenize(text: string, max_size: number): string[] {
    const punc = '¡!()[]¿?.,;:—«»\n'.split('').map(escapeRegExp);
    const parts = text.split(new RegExp(punc.join('|')));
    return parts.flatMap((p) => this._minimize(p, ' ', max_size));
  }

  private _minimize(str: string, delim: string, max_size: number): string[] {
    if (str.length <= max_size) return [str];
    const idx = str.lastIndexOf(delim);
    return [
      str.substring(0, idx),
      ...this._minimize(str.substring(idx), delim, max_size),
    ];
  }

  static get languages(): Record<string, string> {
    return LANGUAGES;
  }
}

export default gSpeak;
