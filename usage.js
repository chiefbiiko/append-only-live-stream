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
