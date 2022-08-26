var spawn = require('child_process').spawn

  , createUncompressStream = require('../').createUncompressStream
  , expect = require('chai').expect
  , bufferFrom = require('buffer-from')

  , largerInput = require('fs').readFileSync(__filename)
  , largerInputString = largerInput.toString()

it('uncompress small string', function () {
  var child = spawn('python', [ '-m', 'snappy', '-c' ])
    , uncompressStream = createUncompressStream({ asBuffer: false })
    , data = ''

  uncompressStream.on('data', function (chunk) {
    data = data + chunk
    expect(typeof(chunk)).to.be.equal('string')
  })

  uncompressStream.on('end', function () {
    expect(data).to.be.equal('beep boop')
  })

  child.stdout.pipe(uncompressStream)

  child.stdin.write('beep boop')
  child.stdin.end()
})

it('uncompress small Buffer', function () {
  var child = spawn('python', [ '-m', 'snappy', '-c' ])
    , uncompressStream = createUncompressStream()
    , data = []

  uncompressStream.on('data', function (chunk) {
    data.push(chunk)
    expect(Buffer.isBuffer(chunk)).to.be.true
  })

  uncompressStream.on('end', function () {
    expect(Buffer.concat(data)).to.be.deep.equal(bufferFrom('beep boop'))
  })

  child.stdout.pipe(uncompressStream)

  child.stdin.write(bufferFrom('beep boop'))
  child.stdin.end()
})

it('uncompress large string', function () {
  var child = spawn('python', [ '-m', 'snappy', '-c' ])
    , uncompressStream = createUncompressStream({ asBuffer: false })
    , data = ''

  uncompressStream.on('data', function (chunk) {
    data = data + chunk
    expect(typeof(chunk)).to.be.equal('string')
  })

  uncompressStream.on('end', function () {
    expect(data).to.be.equal(largerInputString)
  })

  child.stdout.pipe(uncompressStream)

  child.stdin.write(largerInput)
  child.stdin.end()
})

it('uncompress large string', function () {
  var child = spawn('python', [ '-m', 'snappy', '-c' ])
    , uncompressStream = createUncompressStream()
    , data = []

    uncompressStream.on('data', function (chunk) {
      data.push(chunk)
      expect(Buffer.isBuffer(chunk)).to.be.true
    })

    uncompressStream.on('end', function () {
      expect(Buffer.concat(data)).to.be.deep.equal(largerInput)
    })


  child.stdout.pipe(uncompressStream)

  child.stdin.write(largerInput)
  child.stdin.end()
})

it('uncompress with bad identifier', function () {
  var uncompressStream = createUncompressStream()

  uncompressStream.on('error', function (err) {
    expect(err.message).to.be.equal('malformed input: bad identifier')
  })

  uncompressStream.write(
    bufferFrom([ 0xff, 0x06, 0x00, 0x00, 0x73, 0x4e, 0x61, 0x50, 0x70, 0x60 ])
  )
  uncompressStream.end()
})

it('uncompress with bad first frame', function () {
  var uncompressStream = createUncompressStream()

  uncompressStream.on('error', function (err) {
    expect(err.message).to.be.equal('malformed input: must begin with an identifier')
  })

  uncompressStream.write(
    bufferFrom([ 0x0, 0x06, 0x00, 0x00, 0x73, 0x4e, 0x61, 0x50, 0x70, 0x60 ])
  )
  uncompressStream.end()
})

it('uncompress large String in small pieces', function () {
  var child = spawn('python', [ '-m', 'snappy', '-c' ])
    , uncompressStream = createUncompressStream()
    , data = []

    uncompressStream.on('data', function (chunk) {
      data.push(chunk)
      expect(Buffer.isBuffer(chunk)).to.be.true
    })

    uncompressStream.on('end', function () {
      expect(Buffer.concat(data)).to.be.deep.equal(largerInput)
    })

  child.stdout.on('data', function (chunk) {
    var i = 0;

    while (i < chunk.length) {
      uncompressStream.write(bufferFrom([ chunk[i] ]))
      i++
    }
  })

  child.stdout.once('end', function () {
    uncompressStream.end()
  })

  child.stdin.write(largerInput)
  child.stdin.end()
})

it('uncompress small Buffer across multiple chunks', function () {
  var uncompressStream = createUncompressStream()
    , data = []
    , IDENTIFIER = bufferFrom([
      0xff, 0x06, 0x00, 0x00, 0x73, 0x4e, 0x61, 0x50, 0x70, 0x59
    ])

  uncompressStream.on('data', function (chunk) {
    data.push(chunk)
    expect(Buffer.isBuffer(chunk)).to.be.true
  })

  uncompressStream.on('end', function () {
    expect(Buffer.concat(data)).to.be.deep.equal(bufferFrom('beep boop'))
    t.end()
  })

  // identifier
  uncompressStream.write(IDENTIFIER)
  // "beep"
  uncompressStream.write(bufferFrom([0x01, 0x08, 0x00, 0x00, 0xfb, 0x5e, 0xc9, 0x6e, 0x62, 0x65, 0x65, 0x70]))
  // " boop"
  uncompressStream.write(bufferFrom([0x01, 0x09, 0x00, 0x00, 0x5f, 0xae, 0xb4, 0x84, 0x20, 0x62, 0x6f, 0x6f, 0x70]))
  uncompressStream.end()
})

it('uncompress large string across multiple chunks', function () {
  var child1 = spawn('python', [ '-m', 'snappy', '-c' ])
    , IDENTIFIER = bufferFrom([
        0xff, 0x06, 0x00, 0x00, 0x73, 0x4e, 0x61, 0x50, 0x70, 0x59
      ])
    , uncompressStream = createUncompressStream({ asBuffer: false })
    , data = ''

  uncompressStream.on('data', function (chunk) {
    data = data + chunk
    expect(typeof(chunk)).to.be.equal('string')
  })

  uncompressStream.on('end', function () {
    expect(data).to.be.equal(largerInputString + largerInputString)
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
    child2.stdin.write(largerInput)
    child2.stdin.end()
  })

  // write identifier only once
  uncompressStream.write(IDENTIFIER)

  child1.stdin.write(largerInput)
  child1.stdin.end()
})

it('uncompress large string with padding chunks', function () {
  var child1 = spawn('python', [ '-m', 'snappy', '-c' ])
    , IDENTIFIER = bufferFrom([
        0xff, 0x06, 0x00, 0x00, 0x73, 0x4e, 0x61, 0x50, 0x70, 0x59
      ])
    , uncompressStream = createUncompressStream({ asBuffer: false })
    , data = ''

  uncompressStream.on('data', function (chunk) {
    data = data + chunk
    expect(typeof(chunk)).to.be.equal('string')
  })

  uncompressStream.on('end', function () {
    expect(data).to.be.equal(largerInputString + largerInputString)
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

  child1.stdin.write(largerInput)
  child1.stdin.end()
})