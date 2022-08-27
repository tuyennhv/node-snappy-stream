import {spawn} from 'child_process'
import {expect} from 'chai'
import fs from 'fs'
import {fileURLToPath} from 'url'
import {createCompressStream} from '../index.js'

const __filename = fileURLToPath(import.meta.url)
const largerInput = fs.readFileSync(__filename)

const UNCOMPRESSED_CHUNK_SIZE = 65536
let superLargeInput = largerInput;
for (let i = largerInput.length; i <= UNCOMPRESSED_CHUNK_SIZE; i += largerInput.length) {
  superLargeInput = Buffer.concat([superLargeInput, largerInput]);
}

[{
  testName: 'small',
  testString: 'beep boop',
}, {
  testName: 'small',
  testString: 'beep boop',
}, {
  testName: 'large',
  testString: largerInput,
}, {
  testName: 'large',
  testString: largerInput,
}, {
  testName: 'super large',
  testString: superLargeInput,
}, {
  testName: 'super large',
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