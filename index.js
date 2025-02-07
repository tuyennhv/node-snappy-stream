var CompressStream = require('./lib/compress-stream')
  , UncompressStream = require('./lib/uncompress-stream')

module.exports = {
    createUncompressStream: function (opts) {
      return new UncompressStream(opts)
    }
  , createCompressStream: function (opts) {
      return new CompressStream(opts)
    }
}