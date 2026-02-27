import { strict as assert } from 'assert'
import { existsSync, unlinkSync } from 'fs'
import { PassThrough } from 'stream'
import gSpeak, { LANGUAGES } from '../src'

describe('gSpeak', () => {
  describe('Constructor', () => {
    it('should create instance with default language', () => {
      const tts = new gSpeak('Hello')
      assert.ok(tts)
    })

    it('should throw on unsupported language', () => {
      assert.throws(() => new gSpeak('Hello', 'xx'), /Language not supported/)
    })

    it('should throw on empty text', () => {
      assert.throws(() => new gSpeak(''), /No text to speak/)
    })

    it('should accept all supported languages', () => {
      for (const lang of Object.keys(LANGUAGES)) {
        assert.doesNotThrow(() => new gSpeak('test', lang))
      }
    })
  })

  describe('save()', () => {
    it('should save english speech to file', (done) => {
      const output = '/tmp/gspeak-test-en.mp3'
      const tts = new gSpeak('Hello world', 'en')
      tts.save(output, (err) => {
        assert.ifError(err)
        assert.ok(existsSync(output))
        unlinkSync(output)
        done()
      })
    })

    it('should save hindi speech to file', (done) => {
      const output = '/tmp/gspeak-test-hi.mp3'
      const tts = new gSpeak('नमस्ते', 'hi')
      tts.save(output, (err) => {
        assert.ifError(err)
        assert.ok(existsSync(output))
        unlinkSync(output)
        done()
      })
    })

    it('should handle long text by tokenizing', (done) => {
      const output = '/tmp/gspeak-test-long.mp3'
      const long = 'This is a very long sentence that exceeds one hundred characters and should be tokenized into multiple parts by the library automatically.'
      const tts = new gSpeak(long, 'en')
      tts.save(output, (err) => {
        assert.ifError(err)
        assert.ok(existsSync(output))
        unlinkSync(output)
        done()
      })
    })
  })

  describe('stream()', () => {
    it('should return a readable stream', (done) => {
      const tts = new gSpeak('Hello', 'en')
      const stream = tts.stream()
      assert.ok(stream instanceof PassThrough)
      const chunks: Buffer[] = []
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', () => {
        assert.ok(Buffer.concat(chunks).length > 0)
        done()
      })
      stream.on('error', done)
    })
  })

  describe('LANGUAGES', () => {
    it('should export languages map', () => {
      assert.ok(typeof LANGUAGES === 'object')
      assert.ok(LANGUAGES['en'] === 'English')
      assert.ok(LANGUAGES['hi'] === 'Hindi')
    })
  })
})
