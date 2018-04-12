var { createWriteStream, unlink } = require('fs')
var tape = require('tape')
var createLiveStream = require('./index')

tape.onFinish(unlink.bind(null, './log.test', function () {}))

tape('live', function (t) {
  var appendStream = createWriteStream('./log.test', { flags: 'a' })
  appendStream.write('419')
  var liveStream = createLiveStream('./log.test')
  var updates = []
  liveStream.on('data', function (chunk) {
    updates.push(chunk.toString())
  })
  for (var i = 8; i > -1; i--) {
    appendStream.write('' + i)
    if (!i) {
      setTimeout(function () {
        t.is(updates.join(''), '419876543210', 'got live updates')
        t.end()
      }, 1000)
    }
  }
})
