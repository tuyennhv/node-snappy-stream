import fs from 'fs'
import {join} from 'path'
import {expect} from 'chai'
import {checksum} from '../lib/checksum.js'
import path from 'path'
import {fileURLToPath} from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function bufferToArray(buffer) {
  var array = new Array(buffer.length);
  for (var i = 0; i < buffer.length; ++i) {
    array[i] = buffer[i];
  }
  return array;
}

if ('UPDATE_EXPECTED' in process.env) {
  var expectedRows = [];
  for (var i = 0; i < 1000; ++i) {
    var buffer = Buffer.alloc(1);
    buffer[0] = i;

    console.log(checksum(buffer));

    expectedRows.push(bufferToArray(checksum(buffer)));
  }

  fs.writeFileSync(
    join(__dirname, 'checksum.expected'),
    JSON.stringify(expectedRows)
  );
}

var expectedRows = JSON.parse(
  fs.readFileSync(join(__dirname, 'checksum.expected'))
);

it('Checksum', function () {
  expectedRows.forEach(function (expected, index) {
    var buffer = Buffer.alloc(1);
    buffer[0] = index;
    var actual = bufferToArray(checksum(buffer));
    expect(actual).to.be.deep.equal(expected, 'Buffer created from ' + index)
  });
});
