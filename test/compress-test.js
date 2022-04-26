var spawn = require('child_process').spawn
  , createCompressStream = require('../').createCompressStream
  , test = require('tap').test
  , largerInput = require('fs').readFileSync(__filename)
  , largerInputString = largerInput.toString()

const UNCOMPRESSED_CHUNK_SIZE = 65536
let superLargeInput = largerInput;
for (let i = largerInput.length; i <= UNCOMPRESSED_CHUNK_SIZE; i += largerInput.length) {
  superLargeInput = Buffer.concat([superLargeInput, largerInput]);
}
const superLargeInputString = superLargeInput.toString();

test('compress small string', function (t) {
  var child = spawn('python', [ '-m', 'snappy', '-d' ])
    , compressStream = createCompressStream()
    , data = ''

  child.stdout.on('data', function (chunk) {
    data = data + chunk.toString()
  })

  child.stdout.on('end', function () {
    t.equal(data, 'beep boop')
    t.end()
  })

  child.stderr.pipe(process.stderr)

  compressStream.pipe(child.stdin)

  compressStream.write('beep boop')
  compressStream.end()
})

test('compress large string', function (t) {
  var child = spawn('python', [ '-m', 'snappy', '-d' ])
    , compressStream = createCompressStream()
    , data = ''

  child.stdout.on('data', function (chunk) {
    data = data + chunk.toString()
  })

  child.stdout.on('end', function () {
    t.equal(data, largerInputString)
    t.end()
  })

  child.stderr.pipe(process.stderr)

  compressStream.pipe(child.stdin)

  compressStream.write(largerInputString)
  compressStream.end()
})


test('compress very very large string', function (t) {
  var child = spawn('python', [ '-m', 'snappy', '-d' ])
    , compressStream = createCompressStream()
    , data = ''

  child.stdout.on('data', function (chunk) {
    data = data + chunk.toString()
  })

  child.stdout.on('end', function () {
    t.equal(data, superLargeInputString)
    t.end()
  })

  child.stderr.pipe(process.stderr)

  compressStream.pipe(child.stdin)

  compressStream.write(superLargeInputString)
  compressStream.end()
})
