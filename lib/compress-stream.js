/**
 * As per the snappy framing format for streams, the size of any uncompressed chunk can be
 * no longer than 65536 bytes.
 *
 * From: https://github.com/google/snappy/blob/main/framing_format.txt#L90:L92
 */
const UNCOMPRESSED_CHUNK_SIZE = 65536;

var Transform = require('stream').Transform
  , util = require('util')

  , snappy = require('snappy')
  , bufferFrom = require('buffer-from')

  , checksum = require('./checksum')

  , IDENTIFIER_FRAME = bufferFrom([
      0xff, 0x06, 0x00, 0x00, 0x73, 0x4e, 0x61, 0x50, 0x70, 0x59
    ])
  , COMPRESSED = bufferFrom([ 0x00 ])
  , UNCOMPRESSED = bufferFrom([ 0x01 ])

  , CompressStream = function (opts) {
      if (!(this instanceof CompressStream))
        return new CompressStream(opts)

      this.asyncCompress = (opts && typeof(opts.asyncCompress) === 'boolean') ? opts.asyncCompress : false
      Transform.call(this)

      // first push the identifier frame
      this.push(IDENTIFIER_FRAME)
    }

util.inherits(CompressStream, Transform)

CompressStream.prototype._compressed = function (chunk, compressed) {
  var size = compressed.length + 4

  this.push(
    Buffer.concat([
        COMPRESSED
      , bufferFrom([ size, size >> 8, size >> 16 ])
      , checksum(chunk)
      , compressed
    ])
  )
}

CompressStream.prototype._uncompressed = function (chunk) {
  var size = chunk.length + 4

  this.push(
    Buffer.concat([
        UNCOMPRESSED
      , bufferFrom([ size, size >> 8, size >> 16 ])
      , checksum(chunk)
      , chunk
    ])
  )
}

/**
 * Some compression benchmarks : 
 * 
 *   i) Sync compress via snappy.compressSync ({asyncCompress:false}) default
 *   ii) Async compress via snappy.compress ({asyncCompress:true})
 *   iii) No chunking (Original)
 * 
 *  | Size               | sync compress | async compress | original (no chunking) |
 *  |--------------------|---------------|----------------|------------------------|
 *  | 10kb   (1 chunk)   | 0.0229 ms     | 0.0385 ms      | 0.0388 ms              |
 *  | 100kb  (2 chunks)  | 0.0562 ms     | 0.1051 ms      | 0.0844 ms              |
 *  | 1000kb (16 chunks) | 0.382  ms     | 0.7971 ms      | 0.1998 ms              |
 * 
 */


CompressStream.prototype._transform = function(chunk, enc, callback) {
  self = this;

  function asyncCompressNext(startFrom) {
    const endAt = startFrom + Math.min(chunk.length - startFrom, UNCOMPRESSED_CHUNK_SIZE);
    const bytesChunk = chunk.slice(startFrom, endAt);
    snappy.compress(bytesChunk, function(err, compressed) {
      if (err) {
        callback(err)
      } else {

        if (compressed.length < bytesChunk.length)
          self._compressed(bytesChunk, compressed)
        else
          self._uncompressed(bytesChunk)

        if (endAt < chunk.length) {
          asyncCompressNext(endAt)
        } else {
          callback()
        }
      }
    })
  }

  function syncCompress() {
    try {
      for (let startFrom = 0; startFrom < chunk.length; startFrom += UNCOMPRESSED_CHUNK_SIZE) {
        const endAt = startFrom + Math.min(chunk.length - startFrom, UNCOMPRESSED_CHUNK_SIZE);
        const bytesChunk = chunk.slice(startFrom, endAt);
        const compressed = snappy.compressSync(bytesChunk)

        if (compressed.length < bytesChunk.length)
          self._compressed(bytesChunk, compressed)
        else
          self._uncompressed(bytesChunk)
      }
      callback();
    } catch (err) {
      return callback(err);
    }
  }
  if (this.asyncCompress) {
    asyncCompressNext(0)
  } else {
    syncCompress();
  }
}

module.exports = CompressStream
