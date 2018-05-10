# append-only-live-stream

[![build status](http://img.shields.io/travis/chiefbiiko/append-only-live-stream.svg?style=flat)](http://travis-ci.org/chiefbiiko/append-only-live-stream) [![AppVeyor Build Status](https://ci.appveyor.com/api/projects/status/github/chiefbiiko/append-only-live-stream?branch=master&svg=true)](https://ci.appveyor.com/project/chiefbiiko/append-only-live-stream)

***

Create a live stream from an append-only file.

***

## Get it!

```
npm install --save append-only-live-stream
```

***

## Usage

``` js
var { createWriteStream, unlink, writeFile } = require('fs')
var createLiveStream = require('./index')
var assert = require('assert')

writeFile('./some.usage', '', function (err) {
  if (err) throw err

  var appendStream = createWriteStream('./some.usage', { flags: 'a' })
  var liveStream = createLiveStream('./some.usage')

  var crunch = ''
  var expected = 'ACAB'
  var input = expected.split('')

  liveStream.on('data', function (chunk) {
    var txt = chunk.toString()
    console.log(txt)
    crunch += txt
  })

  appendStream.write(input.shift(), function () { // A
    appendStream.write(input.shift(), function () { // C
      appendStream.write(input.shift(), function () { // A
        appendStream.write(input.shift(), function () { // B
          setTimeout(function () {
            assert.ok(crunch === expected, 'ACAB')
            unlink('some.usage', function () {})
          }, 1500)
        })
      })
    })
  })

})
```

***

## API

### `createLiveStream(file[, opts])`

Create a readable stream from an append-only file and get live updates of appends. `file` indicates an append-only file. Options get passed on to the `stream.Readable` constructor and `fs.watch`. `opts` defaults to:

``` js
{
  encoding: null // decode buffers to strings using encoding
  highWaterMark: 16384 // readable streams highWatermark
  persistent: false // keep process alive while watching?
}
```

***

## License

[MIT](./license.md)
