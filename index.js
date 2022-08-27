import {CompressStream} from './lib/compress-stream.js'
import {UncompressStream} from './lib/uncompress-stream.js'

export function createUncompressStream(opts) {
  return new UncompressStream(opts)
}

export function createCompressStream(opts) {
  return new CompressStream(opts)
}
