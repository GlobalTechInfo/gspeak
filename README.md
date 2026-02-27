<div align="center">

<img src="https://img.icons8.com/color/96/google-logo.png" alt="gspeak" width="96"/>

# gspeak

**Google Text to Speech for Node.js — modern, typed, zero deprecated dependencies.**

A TypeScript rewrite of [gtts](https://www.npmjs.com/package/gtts) — drop-in compatible.

[![License](https://img.shields.io/npm/l/gspeak?style=flat-square&label=License&color=blue)](https://github.com/GlobalTechInfo/gspeak/blob/main/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/gspeak?style=flat-square&label=Version&color=red)](https://npmjs.com/package/gspeak)
[![Code Quality](https://img.shields.io/codefactor/grade/github/GlobalTechInfo/gspeak?style=flat-square&label=Code%20Quality)](https://www.codefactor.io/repository/github/GlobalTechInfo/gspeak)
[![Downloads](https://img.shields.io/npm/dw/gspeak?style=flat-square&label=Downloads&color=green)](https://npmjs.com/package/gspeak)

</div>

---

## ✨ Features

- 🔊 Convert any text to speech using **Google TTS**
- 📦 **Zero deprecated dependencies**
- 🔷 Full **TypeScript** support
- 🔗 **Drop-in replacement** for `gtts`
- 🌍 **60+ languages** supported
- 💾 Save to file or stream directly
- 🖥️ **CLI** included

---

## 📦 Installation

```bash
npm i gspeak
```

---

## 🚀 Quick Start

```ts
import gSpeak from 'gspeak'

const tts = new gSpeak('Hello world', 'en')
tts.save('/tmp/hello.mp3', (err) => {
  if (err) throw err
  console.log('Saved to /tmp/hello.mp3')
})
```

---

## 📥 Import

```ts
import gSpeak from 'gspeak' // ES6 / TypeScript
// const gSpeak = require('gspeak') // CommonJS
```

---

## 📖 Usage

### Save to file

```ts
import gSpeak from 'gspeak'

const tts = new gSpeak('Text to speak', 'en')
tts.save('/tmp/output.mp3', (err) => {
  if (err) throw err
  console.log('Done!')
})
```

### Stream (e.g. with Express)

```ts
import express from 'express'
import gSpeak from 'gspeak'

const app = express()

app.get('/speak', (req, res) => {
  const tts = new gSpeak(req.query.text as string, req.query.lang as string)
  tts.stream().pipe(res)
})

app.listen(3000, () => {
  console.log('http://localhost:3000/speak?lang=en&text=Hello')
})
```

### Debug mode

```ts
const tts = new gSpeak('Hello', 'en', true) // 3rd param enables debug logging
```

---

## 🖥️ CLI

```bash
gspeak "Hello Google Text to Speech" -l en -o /tmp/hello.mp3
```

| Flag | Alias | Description |
|------|-------|-------------|
| `--language` | `-l` | Language code (default: `en`) |
| `--output` | `-o` | Output file path (required) |
| `--verbose` | `-v` | Print debug messages |

---

## 🌍 Supported Languages

| Code | Language |
|------|----------|
| `af` | Afrikaans |
| `sq` | Albanian |
| `ar` | Arabic |
| `hy` | Armenian |
| `ca` | Catalan |
| `zh` | Chinese |
| `zh-cn` | Chinese (Mandarin/China) |
| `zh-tw` | Chinese (Mandarin/Taiwan) |
| `zh-yue` | Chinese (Cantonese) |
| `hr` | Croatian |
| `cs` | Czech |
| `da` | Danish |
| `nl` | Dutch |
| `en` | English |
| `en-au` | English (Australia) |
| `en-uk` | English (United Kingdom) |
| `en-us` | English (United States) |
| `eo` | Esperanto |
| `fi` | Finnish |
| `fr` | French |
| `de` | German |
| `el` | Greek |
| `ht` | Haitian Creole |
| `hi` | Hindi |
| `hu` | Hungarian |
| `is` | Icelandic |
| `id` | Indonesian |
| `it` | Italian |
| `ja` | Japanese |
| `ko` | Korean |
| `la` | Latin |
| `lv` | Latvian |
| `mk` | Macedonian |
| `no` | Norwegian |
| `pl` | Polish |
| `pt` | Portuguese |
| `pt-br` | Portuguese (Brazil) |
| `ro` | Romanian |
| `ru` | Russian |
| `sr` | Serbian |
| `sk` | Slovak |
| `es` | Spanish |
| `es-es` | Spanish (Spain) |
| `es-us` | Spanish (United States) |
| `sw` | Swahili |
| `sv` | Swedish |
| `ta` | Tamil |
| `th` | Thai |
| `tr` | Turkish |
| `vi` | Vietnamese |
| `cy` | Welsh |

---

## 🔄 Migrating from `gtts`

`gspeak` is a drop-in replacement. Just change the import:

```ts
// before
const gTTS = require('gtts')
const tts = new gTTS('Hello', 'en')

// after
const gSpeak = require('gspeak')
const tts = new gSpeak('Hello', 'en')
```

Same constructor, same `.save()`, same `.stream()` — nothing else changes.

---

## 📄 License

MIT © [Qasim Ali](https://github.com/GlobalTechInfo)

---

<div align="center">

Made with ❤️ — Thanks for using **gspeak**!

</div>

