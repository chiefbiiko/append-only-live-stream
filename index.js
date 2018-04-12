var { Readable } = require('stream')
var { createReadStream, lstat, open, read, stat } = require('fs')
var debug = require('debug')('append-only-live-stream')

function chiefstat (file, opts, cb) {
  opts.dereference ? stat(file, cb) : lstat(file, cb)
}

function oncereadable () {
  var chunk = this._readStream.read()
  debug('read chunk::', chunk, 'aka', (chunk || '').toString())
  if (chunk) {
    this._bytesTransmitted += chunk.length
    var more = this.push(chunk)
    if (more) this._read()
  }
  // else {
  //   this._read()
  // }
}

function onstat (file, err, stats) {
  debug('onstat err::', err)
  if (err) return this.emit('error', err)
  debug('stats.size, bytesTransmitted::', stats.size, this._bytesTransmitted)
  if (stats.size > this._bytesTransmitted) {
    open(file, 'r', onopen.bind(this, stats))
  }
  // else {
  //   this._read()
  // }
}

function onopen (stats, err, fd) {
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

function createLiveStream (file, opts) {
  if (!opts) opts = {}
  var liveStream = new Readable({
    read () {
      debug('::readin::')
      debug('readStream ended?::', this._readStream._readableState.ended)
      if (!this._readStream._readableState.ended) {
        debug('::readin from readStream::')
        this._readStream.once('readable', oncereadable.bind(this))
      } else {
        debug('::chiefstatin::')
        chiefstat(file, opts, onstat.bind(this, file))
      }
    }
  })
  liveStream._readStream = createReadStream(file)
  liveStream._bytesTransmitted = 0
  return liveStream
}

module.exports = createLiveStream
