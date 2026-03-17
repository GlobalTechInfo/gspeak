import gSpeak, { LANGUAGES } from './dist/src/index'
import { PassThrough } from 'stream'

const BATCH_SIZE = 5
const DELAY_MS   = 300

function streamToBuffer(tts: InstanceType<typeof gSpeak>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const stream: PassThrough = tts.stream()
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

async function checkLang(code: string, name: string): Promise<{
  code: string
  name: string
  ok: boolean
  bytes: number
  error?: string
}> {
  try {
    const tts = new gSpeak('hello', code)
    const buf = await streamToBuffer(tts)

    const ok = buf.byteLength > 1000
    return { code, name, ok, bytes: buf.byteLength }
  } catch (e: any) {
    return { code, name, ok: false, bytes: 0, error: e.message }
  }
}

async function main() {
  const entries = Object.entries(LANGUAGES)
  const total   = entries.length

  console.log(`\n🔍 Verifying ${total} languages via gspeak (dist build)...`)
  console.log('─'.repeat(65))

  const passed: string[] = []
  const failed: Array<{ code: string; name: string; bytes: number; error?: string }> = []

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(([code, name]) => checkLang(code, name)))

    for (const r of results) {
      const icon  = r.ok ? '✅' : '❌'
      const info  = r.error
        ? `ERROR: ${r.error}`
        : `${r.bytes.toLocaleString()} bytes`
      console.log(`${icon}  ${r.code.padEnd(8)}  ${r.name.padEnd(32)}  ${info}`)
      if (r.ok) passed.push(r.code)
      else failed.push(r)
    }

    if (i + BATCH_SIZE < entries.length)
      await new Promise(res => setTimeout(res, DELAY_MS))
  }

  console.log('─'.repeat(65))
  console.log(`\n📊 Results: ${passed.length} passed / ${failed.length} failed / ${total} total\n`)

  if (failed.length === 0) {
    console.log('🎉 All languages working perfectly!')
    process.exit(0)
  } else {
    console.log('❌ Failed languages — consider removing from src/languages.ts:\n')
    for (const f of failed) {
      const reason = f.error ?? `only ${f.bytes} bytes returned (< 1 KB)`
      console.log(`   '${f.code}': '${LANGUAGES[f.code]}'  →  ${reason}`)
    }
    console.log()
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
