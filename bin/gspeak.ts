#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import gSpeak from '../src/gSpeak'

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 "text to speak" [options]')
  .demandCommand(1, 'Please provide text to speak')
  .option('l', {
    alias: 'language',
    default: 'en',
    type: 'string',
    describe: 'ISO 639-1 language code'
  })
  .option('o', {
    alias: 'output',
    demandOption: true,
    type: 'string',
    describe: 'Output file path'
  })
  .option('v', {
    alias: 'verbose',
    default: false,
    type: 'boolean',
    describe: 'Print debug messages'
  })
  .parseSync()

const gtts = new gSpeak(String(argv._[0]), argv.language as string, argv.verbose as boolean)
gtts.save(argv.output as string, (err) => {
  if (err) {
    process.stderr.write('Error: ' + err + '\n')
    process.exit(1)
  }
})
