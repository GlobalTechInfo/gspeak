import { describe, it, expect } from 'vitest'
import { existsSync, unlinkSync, statSync } from 'fs'
import { PassThrough } from 'stream'
import gSpeak, { LANGUAGES } from '../src'
import generateToken from '../src/gToken'

// ─── Helpers ───────────────────────

function saveToDisk(tts: gSpeak, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    tts.save(output, (err) => (err ? reject(err) : resolve()))
  })
}

function streamToBuffer(tts: gSpeak): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const stream = tts.stream()
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

// ─── LANGUAGES ───────────────────────

describe('LANGUAGES', () => {
  it('should be a non-empty object', () => {
    expect(typeof LANGUAGES).toBe('object')
    expect(Object.keys(LANGUAGES).length).toBeGreaterThan(0)
  })

  it('should have only string keys and string values', () => {
    for (const [code, name] of Object.entries(LANGUAGES)) {
      expect(typeof code).toBe('string')
      expect(typeof name).toBe('string')
      expect(code.length).toBeGreaterThan(0)
      expect(name.length).toBeGreaterThan(0)
    }
  })

  it('should have no duplicate keys', () => {
    const keys = Object.keys(LANGUAGES)
    expect(keys.length).toBe(new Set(keys).size)
  })

  it('should have no duplicate values', () => {
    const values = Object.values(LANGUAGES)
    expect(values.length).toBe(new Set(values).size)
  })

  it('should contain core expected languages', () => {
    expect(LANGUAGES['en']).toBe('English')
    expect(LANGUAGES['hi']).toBe('Hindi')
    expect(LANGUAGES['fr']).toBe('French')
    expect(LANGUAGES['de']).toBe('German')
    expect(LANGUAGES['zh']).toBe('Chinese')
    expect(LANGUAGES['ar']).toBe('Arabic')
    expect(LANGUAGES['ja']).toBe('Japanese')
    expect(LANGUAGES['ko']).toBe('Korean')
    expect(LANGUAGES['ru']).toBe('Russian')
    expect(LANGUAGES['es']).toBe('Spanish')
  })

  it('should contain all dialect variants', () => {
    const dialects = [
      'en-us', 'en-uk', 'en-au', 'en-ca', 'en-in', 'en-ie', 'en-za',
      'fr-ca', 'fr-fr',
      'pt-br', 'pt-pt',
      'es-es', 'es-us',
      'zh-cn', 'zh-tw', 'zh-yue',
    ]
    for (const d of dialects) expect(LANGUAGES[d]).toBeDefined()
  })
})

// ─── gToken ───────────────────────

describe('generateToken', () => {
  it('should return a string in "number.number" format', () => {
    expect(generateToken('hello')).toMatch(/^\d+\.\d+$/)
  })

  it('should produce consistent format across multiple calls', () => {
    for (const text of ['hello', 'world', 'test 123'])
      expect(generateToken(text)).toMatch(/^\d+\.\d+$/)
  })

  it('should handle ASCII text', () => {
    expect(() => generateToken('Hello World')).not.toThrow()
  })

  it('should handle 2-byte UTF-8 characters (accented/Arabic/Hindi)', () => {
    expect(() => generateToken('café')).not.toThrow()
    expect(() => generateToken('\u0645\u0631\u062d\u0628\u0627')).not.toThrow()
    expect(() => generateToken('\u0928\u092e\u0938\u094d\u0924\u0947')).not.toThrow()
  })

  it('should handle 3-byte UTF-8 characters (CJK)', () => {
    expect(() => generateToken('\u4f60\u597d')).not.toThrow()
    expect(() => generateToken('\u65e5\u672c\u8a9e')).not.toThrow()
    expect(() => generateToken('\ud55c\uad6d\uc5b4')).not.toThrow()
  })

  it('should handle 4-byte surrogate pair characters (emoji)', () => {
    expect(() => generateToken('Hello \uD83D\uDE00')).not.toThrow()
    expect(() => generateToken('\uD83C\uDF0D\uD83C\uDF0E\uD83C\uDF0F')).not.toThrow()
  })

  it('should handle empty string', () => {
    expect(() => generateToken('')).not.toThrow()
    expect(generateToken('')).toMatch(/^\d+\.\d+$/)
  })

  it('should return different tokens for different inputs', () => {
    expect(generateToken('hello')).not.toBe(generateToken('world'))
  })
})

// ─── gSpeak Constructor ───────────────────────

describe('gSpeak — Constructor', () => {
  it('should create instance with default language (en)', () => {
    expect(() => new gSpeak('Hello')).not.toThrow()
  })

  it('should accept language codes case-insensitively', () => {
    expect(() => new gSpeak('Hello', 'EN')).not.toThrow()
    expect(() => new gSpeak('Hello', 'Fr')).not.toThrow()
    expect(() => new gSpeak('Hello', 'DE')).not.toThrow()
  })

  it('should throw on unsupported language', () => {
    expect(() => new gSpeak('Hello', 'xx')).toThrow(/Language not supported/)
    expect(() => new gSpeak('Hello', 'zz')).toThrow(/Language not supported/)
    expect(() => new gSpeak('Hello', 'xyz')).toThrow(/Language not supported/)
  })

  it('should throw on empty text', () => {
    expect(() => new gSpeak('')).toThrow(/No text to speak/)
  })

  it('should enable debug mode when flag is set', () => {
    expect(() => new gSpeak('Hello', 'en', true)).not.toThrow()
  })

  it('should handle text with newline escapes', () => {
    expect(() => new gSpeak('Line one\\nLine two', 'en')).not.toThrow()
  })

  it('should handle text exactly at MAX_CHARS boundary (100 chars)', () => {
    expect(() => new gSpeak('a'.repeat(100), 'en')).not.toThrow()
  })

  it('should handle text longer than MAX_CHARS — triggers tokenization', () => {
    expect(() => new gSpeak('This sentence is intentionally longer than one hundred characters so that the tokenizer will split it up into multiple parts.', 'en')).not.toThrow()
  })

  it('should handle text that splits on punctuation', () => {
    expect(() => new gSpeak('Hello! How are you? I am fine. Great: let us go now (please).', 'en')).not.toThrow()
  })

  describe('should accept every supported language', () => {
    for (const [code, name] of Object.entries(LANGUAGES)) {
      it(`${code} — ${name}`, () => {
        expect(() => new gSpeak('test', code)).not.toThrow()
      })
    }
  })
})

// ─── gSpeak.languages static getter ───────────────────

describe('gSpeak.languages', () => {
  it('should return the LANGUAGES map', () => {
    expect(gSpeak.languages).toBe(LANGUAGES)
  })

  it('should be the same reference as the exported LANGUAGES', () => {
    expect(gSpeak.languages).toStrictEqual(LANGUAGES)
  })
})

// ─── Integration: save() ───────────────────────

describe('gSpeak — save() [integration]', () => {
  it('should save English speech to file', async () => {
    const output = '/tmp/gspeak-test-en.mp3'
    await saveToDisk(new gSpeak('Hello world', 'en'), output)
    expect(existsSync(output)).toBe(true)
    expect(statSync(output).size).toBeGreaterThan(0)
    unlinkSync(output)
  }, 30000)

  it('should save Hindi speech to file', async () => {
    const output = '/tmp/gspeak-test-hi.mp3'
    await saveToDisk(new gSpeak('\u0928\u092e\u0938\u094d\u0924\u0947 \u0926\u0941\u0928\u093f\u092f\u093e', 'hi'), output)
    expect(existsSync(output)).toBe(true)
    unlinkSync(output)
  }, 30000)

  it('should save Arabic speech to file', async () => {
    const output = '/tmp/gspeak-test-ar.mp3'
    await saveToDisk(new gSpeak('\u0645\u0631\u062d\u0628\u0627 \u0628\u0627\u0644\u0639\u0627\u0644\u0645', 'ar'), output)
    expect(existsSync(output)).toBe(true)
    unlinkSync(output)
  }, 30000)

  it('should save Chinese speech to file', async () => {
    const output = '/tmp/gspeak-test-zh.mp3'
    await saveToDisk(new gSpeak('\u4f60\u597d\u4e16\u754c', 'zh'), output)
    expect(existsSync(output)).toBe(true)
    unlinkSync(output)
  }, 30000)

  it('should save long text split across multiple parts', async () => {
    const output = '/tmp/gspeak-test-long.mp3'
    await saveToDisk(new gSpeak('This is a very long sentence that exceeds one hundred characters and should be tokenized into multiple parts by the library automatically.', 'en'), output)
    expect(existsSync(output)).toBe(true)
    unlinkSync(output)
  }, 30000)

  it('should append parts correctly — long file larger than short file', async () => {
    const shortOut = '/tmp/gspeak-test-short.mp3'
    const longOut  = '/tmp/gspeak-test-long2.mp3'
    await saveToDisk(new gSpeak('Hi.', 'en'), shortOut)
    await saveToDisk(new gSpeak('This is a very long sentence that exceeds one hundred characters and should be tokenized into multiple parts by the library automatically.', 'en'), longOut)
    expect(statSync(longOut).size).toBeGreaterThan(statSync(shortOut).size)
    unlinkSync(shortOut)
    unlinkSync(longOut)
  }, 60000)

  it('should save with debug mode enabled', async () => {
    const output = '/tmp/gspeak-test-debug-save.mp3'
    await saveToDisk(new gSpeak('Hi', 'en', true), output)
    expect(existsSync(output)).toBe(true)
    unlinkSync(output)
  }, 30000)

  it('should call callback with error on failed request', async () => {
    const tts = new gSpeak('Hello', 'en')
    ;(tts as any).lang = 'invalid-lang-that-will-fail'
    await expect(
      new Promise<void>((resolve, reject) => {
        tts.save('/tmp/gspeak-fail.mp3', (err) => (err ? reject(err) : resolve()))
      })
    ).rejects.toThrow()
  }, 15000)
})

// ─── Integration: stream() ───────────────────────

describe('gSpeak — stream() [integration]', () => {
  it('should return a PassThrough stream', () => {
    expect(new gSpeak('Hello', 'en').stream()).toBeInstanceOf(PassThrough)
  })

  it('should stream English audio with non-zero bytes', async () => {
    expect((await streamToBuffer(new gSpeak('Hello', 'en'))).length).toBeGreaterThan(0)
  }, 30000)

  it('should stream Japanese audio', async () => {
    expect((await streamToBuffer(new gSpeak('\u3053\u3093\u306b\u3061\u306f', 'ja'))).length).toBeGreaterThan(0)
  }, 30000)

  it('should stream French audio', async () => {
    expect((await streamToBuffer(new gSpeak('Bonjour le monde', 'fr'))).length).toBeGreaterThan(0)
  }, 30000)

  it('should stream with debug mode enabled', async () => {
    expect((await streamToBuffer(new gSpeak('Hi', 'en', true))).length).toBeGreaterThan(0)
  }, 30000)

  it('should emit error on stream failure', async () => {
    const tts = new gSpeak('Hello', 'en')
    ;(tts as any).lang = 'invalid-lang-that-will-fail'
    await expect(streamToBuffer(tts)).rejects.toThrow()
  }, 15000)
})
