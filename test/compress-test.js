const spawn = require('child_process').spawn,
  createCompressStream = require('../').createCompressStream,
  expect = require('chai').expect,
  largerInput = require('fs').readFileSync(__filename)

const UNCOMPRESSED_CHUNK_SIZE = 65536
let superLargeInput = largerInput;
for (let i = largerInput.length; i <= UNCOMPRESSED_CHUNK_SIZE; i += largerInput.length) {
  superLargeInput = Buffer.concat([superLargeInput, largerInput]);
}

[{
  testName: "small",
  testString: "beep boop",
}, {
  testName: "small",
  testString: "beep boop",
}, {
  testName: "large",
  testString: largerInput,
}, {
  testName: "large",
  testString: largerInput,
}, {
  testName: "super large",
  testString: superLargeInput,
}, {
  testName: "super large",
  testString: superLargeInput,
}].forEach(({
  testName,
  testString,
}) => {

  it(`compress ${testName} input`, function() {
    const child = spawn('python', ['-m', 'snappy', '-d']),
      compressStream = createCompressStream()
    let data = ''

    child.stdout.on('data', function(chunk) {
      data = data + chunk.toString()
    })

    child.stdout.on('end', function() {
      expect(data).to.be.equal(testString.toString())
    })

    child.stderr.pipe(process.stderr)

    compressStream.pipe(child.stdin)

    compressStream.write(testString)
    compressStream.end()
  })

})