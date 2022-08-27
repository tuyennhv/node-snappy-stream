import fs from 'fs'
import {spawn} from 'child_process'
import {fileURLToPath} from 'url'
import {expect} from 'chai'
import {createCompressStream, createUncompressStream} from '../index.js'

const __filename = fileURLToPath(import.meta.url)
const largerInput = fs.readFileSync(__filename)
const largerInputString = largerInput.toString()

it('compress and uncompress small string', function (done) {
  var uncompressStream = createUncompressStream({ asBuffer: false })
    , compressStream = createCompressStream()
    , data = ''

  uncompressStream.on('data', function (chunk) {
    data = data + chunk
    expect(typeof(chunk)).to.be.equal('string')
  })

  uncompressStream.on('end', function () {
    expect(data).to.be.equal('beepbop')
    done()
  })

  compressStream.on('data', function (chunk) {
    console.log('Som data from the compressed stream', chunk)
    uncompressStream.write(chunk)
  })

  compressStream.on('end', function end() {
    uncompressStream.end()
  })

  compressStream.write('beep')
  compressStream.write('bop')
  compressStream.end()
})

it('uncompress small string', function (done) {
  var child = spawn('python', [ '-m', 'snappy', '-c' ])
    , uncompressStream = createUncompressStream({ asBuffer: false })
    , data = ''

  uncompressStream.on('data', function (chunk) {
    data = data + chunk
    expect(typeof(chunk)).to.be.equal('string')
  })

  uncompressStream.on('end', function () {
    expect(data).to.be.equal('beep boop')
    done()
  })

  child.stdout.pipe(uncompressStream)

  child.stdin.write('beep boop')
  child.stdin.end()
})

it('uncompress small Buffer', function (done) {
  var child = spawn('python', [ '-m', 'snappy', '-c' ])
    , uncompressStream = createUncompressStream()
    , data = []

  uncompressStream.on('data', function (chunk) {
    data.push(chunk)
    expect(Buffer.isBuffer(chunk)).to.be.true
  })

  uncompressStream.on('end', function () {
    expect(Buffer.concat(data)).to.be.deep.equal(Buffer.from('beep boop'))
    done()
  })

  child.stdout.pipe(uncompressStream)

  child.stdin.write(Buffer.from('beep boop'))
  child.stdin.end()
})

it.skip('uncompress large string', function (done) {
  var child = spawn('python', [ '-m', 'snappy', '-c' ])
    , uncompressStream = createUncompressStream({ asBuffer: false })
    , data = ''

  uncompressStream.on('data', function (chunk) {
    data = data + chunk
    // TODO: figure out why this is still a Buffer (largerInput)
    expect(typeof(chunk)).to.be.equal('string')
  })

  uncompressStream.on('end', function () {
    expect(data).to.be.equal(largerInputString)
    done()
  })

  child.stdout.pipe(uncompressStream)

  child.stdin.write(largerInputString)
  child.stdin.end()
})

it('uncompress large Buffer', function (done) {
  var child = spawn('python', [ '-m', 'snappy', '-c' ])
    , uncompressStream = createUncompressStream()
    , data = []

    uncompressStream.on('data', function (chunk) {
      data.push(chunk)
      expect(Buffer.isBuffer(chunk)).to.be.true
    })

    uncompressStream.on('end', function () {
      expect(Buffer.concat(data)).to.be.deep.equal(largerInput)
      done()
    })


  child.stdout.pipe(uncompressStream)

  child.stdin.write(largerInput)
  child.stdin.end()
})

it('uncompress with bad identifier', function (done) {
  var uncompressStream = createUncompressStream()

  uncompressStream.on('error', function (err) {
    expect(err.message).to.be.equal('malformed input: bad identifier')
    done()
  })

  uncompressStream.write(
    Buffer.from([ 0xff, 0x06, 0x00, 0x00, 0x73, 0x4e, 0x61, 0x50, 0x70, 0x60 ])
  )
  uncompressStream.end()
})

it('uncompress with bad first frame', function (done) {
  var uncompressStream = createUncompressStream()

  uncompressStream.on('error', function (err) {
    expect(err.message).to.be.equal('malformed input: must begin with an identifier')
    done()
  })

  uncompressStream.write(
    Buffer.from([ 0x0, 0x06, 0x00, 0x00, 0x73, 0x4e, 0x61, 0x50, 0x70, 0x60 ])
  )
  uncompressStream.end()
})

it('uncompress large String in small pieces', function (done) {
  var child = spawn('python', [ '-m', 'snappy', '-c' ])
    , uncompressStream = createUncompressStream()
    , data = []

    uncompressStream.on('data', function (chunk) {
      data.push(chunk)
      expect(Buffer.isBuffer(chunk)).to.be.true
    })

    uncompressStream.on('end', function () {
      expect(Buffer.concat(data)).to.be.deep.equal(largerInput)
      done()
    })

  child.stdout.on('data', function (chunk) {
    var i = 0;

    while (i < chunk.length) {
      uncompressStream.write(Buffer.from([ chunk[i] ]))
      i++
    }
  })

  child.stdout.once('end', function () {
    uncompressStream.end()
  })

  child.stdin.write(largerInput)
  child.stdin.end()
})

it('uncompress small Buffer across multiple chunks', function (done) {
  var uncompressStream = createUncompressStream()
    , data = []
    , IDENTIFIER = Buffer.from([
      0xff, 0x06, 0x00, 0x00, 0x73, 0x4e, 0x61, 0x50, 0x70, 0x59
    ])

  uncompressStream.on('data', function (chunk) {
    data.push(chunk)
    expect(Buffer.isBuffer(chunk)).to.be.true
  })

  uncompressStream.on('end', function () {
    expect(Buffer.concat(data)).to.be.deep.equal(Buffer.from('beep boop'))
    done()
  })

  // identifier
  uncompressStream.write(IDENTIFIER)
  // "beep"
  uncompressStream.write(Buffer.from([0x01, 0x08, 0x00, 0x00, 0xfb, 0x5e, 0xc9, 0x6e, 0x62, 0x65, 0x65, 0x70]))
  // " boop"
  uncompressStream.write(Buffer.from([0x01, 0x09, 0x00, 0x00, 0x5f, 0xae, 0xb4, 0x84, 0x20, 0x62, 0x6f, 0x6f, 0x70]))
  uncompressStream.end()
})

it.skip('uncompress large string across multiple chunks', function (done) {
  var child1 = spawn('python', [ '-m', 'snappy', '-c' ])
    , IDENTIFIER = Buffer.from([
        0xff, 0x06, 0x00, 0x00, 0x73, 0x4e, 0x61, 0x50, 0x70, 0x59
      ])
    , uncompressStream = createUncompressStream({ asBuffer: false })
    , data = ''

  uncompressStream.on('data', function (chunk) {
    data = data + chunk
    // TODO: figure out why this is still a Buffer (largerInput)
    expect(typeof(chunk)).to.be.equal('string')
  })

  uncompressStream.on('end', function () {
    expect(data).to.be.equal(largerInputString + largerInputString)
    done()
  })

  // manually pipe processes in so we can remove identifiers
  child1.stdout.on('data', function(chunk) {
    uncompressStream.write(chunk.slice(10))
  })

  child1.once('close', function () {
    var child2 = spawn('python', [ '-m', 'snappy', '-c' ])

    child2.stdout.on('data', function(chunk) {
      uncompressStream.write(chunk.slice(10))
      uncompressStream.end()
    })

    // trigger second write after first write
    child2.stdin.write(largerInputString)
    child2.stdin.end()
  })

  // write identifier only once
  uncompressStream.write(IDENTIFIER)

  child1.stdin.write(largerInput)
  child1.stdin.end()
})

it.skip('uncompress large string with padding chunks', function (done) {
  var child1 = spawn('python', [ '-m', 'snappy', '-c' ])
    , IDENTIFIER = Buffer.from([
        0xff, 0x06, 0x00, 0x00, 0x73, 0x4e, 0x61, 0x50, 0x70, 0x59
      ])
    , uncompressStream = createUncompressStream({ asBuffer: false })
    , data = ''

  uncompressStream.on('data', function (chunk) {
    data = data + chunk
    // TODO: figure out why this is still a Buffer (largerInput)
    expect(typeof(chunk)).to.be.equal('string')
  })

  uncompressStream.on('end', function () {
    expect(data).to.be.equal(largerInputString + largerInputString)
    done()
  })

  // manually pipe processes in so we can remove identifiers
  child1.stdout.on('data', function(chunk) {
    uncompressStream.write(chunk.slice(10))
    // padding
    uncompressStream.write(Buffer.from([0xfe, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
  })

  child1.on('close', () => {
    var child2 = spawn('python', [ '-m', 'snappy', '-c' ])

    child2.stdout.on('data', function(chunk) {
      uncompressStream.write(chunk.slice(10))
      uncompressStream.end()
    })

      // trigger second write after first write
      child2.stdin.write(largerInput)
      child2.stdin.end()
  })

  // write identifier only once
  uncompressStream.write(IDENTIFIER)

  child1.stdin.write(largerInputString)
  child1.stdin.end()
})