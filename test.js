var { createWriteStream, unlink, unlinkSync, writeFile } = require('fs')
var tape = require('tape')
var createLiveStream = require('./index')

tape.onFinish(
  unlink.bind(null, './trivial.test',
    unlink.bind(null, './medium.test',
      unlink.bind(null, './slow.test', function () {})))
)

tape('live - trivial', function (t) {
  var appendStream = createWriteStream('./trivial.test', { flags: 'a' })
  appendStream.write('419', function () { // allow data to arrive on disk
    var liveStream = createLiveStream('./trivial.test')
    var chunks = []
    liveStream.on('data', function (chunk) {
      chunks.push(chunk.toString())
    })
    for (var i = 8; i > -1; i--) appendStream.write('' + i)
    setTimeout(function () {
      t.is(chunks.join(''), '419876543210', 'got live chunks')
      t.end()
    }, 1000)
  })
})

tape('live - medium', function (t) {
  var appendStream = createWriteStream('./medium.test', { flags: 'a' })
  appendStream.write('419', function () { // allow data to arrive on disk
    var liveStream = createLiveStream('./medium.test')
    var crunch = ''
    var expected = '999'
    liveStream.on('data', function (chunk) {
      crunch += chunk.toString()
    })
    for (var i = 0, end = 1e3 - 1; i < 1e3; i++) appendStream.write('' + i)
    setTimeout(function () {
      var actual = crunch.slice(crunch.length - expected.length)
      t.is(actual, expected, 'right tail')
      t.end()
    }, 1000)
  })
})

tape('live - slow', function (t) {
  writeFile('./slow.test', '', function (err) {
    if (err) t.end(err)
    var appendStream = createWriteStream('./slow.test', { flags: 'a' })
    var liveStream = createLiveStream('./slow.test')
    var crunch = ''
    var expected = 'ACAB'
    var input = expected.split('')
    var ended = false
    liveStream.on('data', function (chunk) {
      crunch += chunk.toString()
    })
    var interval = setInterval(function () {
      var char = input.shift()
      if (char) appendStream.write(char)
      if (!char) {
        setTimeout(function () {
          t.is(crunch, expected, 'ACAB')
          if (!ended) {
            ended = true
            t.end()
          }
          clearInterval(interval)
        }, 500)
      }
    }, 500)
  })
})
