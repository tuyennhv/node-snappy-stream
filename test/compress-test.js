const spawn = require('child_process').spawn,
  createCompressStream = require('../').createCompressStream,
  test = require('tap').test,
  largerInput = require('fs').readFileSync(__filename)

const UNCOMPRESSED_CHUNK_SIZE = 65536
let superLargeInput = largerInput;
for (let i = largerInput.length; i <= UNCOMPRESSED_CHUNK_SIZE; i += largerInput.length) {
  superLargeInput = Buffer.concat([superLargeInput, largerInput]);
}

[{
  testName: "small",
  testString: "beep boop",
  asyncCompress: true
}, {
  testName: "small",
  testString: "beep boop",
  asyncCompress: false
}, {
  testName: "large",
  testString: largerInput,
  asyncCompress: true
}, {
  testName: "large",
  testString: largerInput,
  asyncCompress: false
}, {
  testName: "super large",
  testString: superLargeInput,
  asyncCompress: true
}, {
  testName: "super large",
  testString: superLargeInput,
  asyncCompress: false
}].forEach(({
  testName,
  testString,
  asyncCompress
}) => {

  test(`compress ${testName} input - asyncCompress=${asyncCompress}`, function(t) {
    const child = spawn('python', ['-m', 'snappy', '-d']),
      compressStream = createCompressStream({
        asyncCompress
      })
    let data = ''

    child.stdout.on('data', function(chunk) {
      data = data + chunk.toString()
    })

    child.stdout.on('end', function() {
      t.equal(data, testString.toString())
      t.end()
    })

    child.stderr.pipe(process.stderr)

    compressStream.pipe(child.stdin)

    compressStream.write(testString)
    compressStream.end()
  })

})