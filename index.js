var { Readable } = require('stream')
var { createReadStream, lstat, open, read, stat } = require('fs')
var debug = require('debug')('append-only-live-stream')

function chiefstat (file, opts, cb) {
  opts.dereference ? lstat(file, cb) : stat(file, cb)
}

function onstat (err, stats) {
  debug('onstat err::', err)
  if (err) return this.emit('error', err)
  debug('stats.size, bytesTransmitted::', stats.size, this._bytesTransmitted)
  if (stats.size > this._bytesTransmitted) open(file, 'r', onopen.bind(this))
}

function onopen (err, fd) {
  debug('onopen err::', err)
  if (err) return this.emit('error', err)
  var diff = stats.size - this._bytesTransmitted
  var buf = Buffer.alloc(diff)
  read(fd, buf, 0, diff, this._bytesTransmitted + 1, onread.bind(this))
}

function onread (err, bytesRead, buf) {
  debug('onread err::', err)
  if (err) return this.emit('error', err)
  var more = this.push(buf)
  if (more) this._read()
}

function createLiveStream (file) { // opts?
  var liveStream = new Readable({
    read () {
      debug('::readin::')
      if (!this._readStream._readableState.ended) {
        debug('::readin from readStream::')
        var chunk = this._readStream.read()
        if (chunk) {
          this._bytesTransmitted += chunk.length
          var more = this.push(chunk)
          if (more) this._read()
        }
      } else {
        debug('::chiefstatin::')
        chiefstat(file, onstat.bind(this))
      }
    }
  })
  liveStream._readStream = createReadStream(file)
  liveStream._bytesTransmitted = 0
  return liveStream
}

module.exports = createLiveStream
