var { Readable } = require('stream')
var { lstat, open, read, stat, watchFile } = require('fs')
var debug = require('debug')('append-only-live-stream')

function chiefstat (file, opts, cb) {
  opts.dereference ? stat(file, cb) : lstat(file, cb)
}

function onopen (err, fd) {
  debug('onopen err::', err)
  if (err) return this.emit('error', err)
  var diff = this._filesize - this._bytespushed
  debug('diff::', diff)
  var buf = Buffer.alloc(diff)
  read(fd, buf, 0, diff, this._bytespushed, onread.bind(this))
}

function onread (err, bytesRead, buf) {
  debug('onread err::', err)
  if (err) return this.emit('error', err)
  this._bytespushed += buf.length
  debug('pushin::', buf)
  var more = this.push(buf)
  if (more) this._read()
}

function oninitstat (err, stats) {
  if (err) return this.emit('error', err)
  this._filesize = stats.size
  debug('pulled stat file size::', this._filesize)
}

function onwatch (cur, prev) {
  debug('updating filesize::', cur.size)
  this._filesize = cur.size
  if (cur.size > this._bytespushed) this._read()
}

function createLiveStream (file, opts) {
  if (!opts) opts = {}
  var liveStream = new Readable({
    read () {
      debug('filesize,bytespushed::', this._filesize, this._bytespushed)
      if (this._filesize > this._bytespushed) {
        open(file, 'r', onopen.bind(this))
      }
    }
  })
  liveStream._opts = Object.assign({ persistent: false, interval: 419 }, opts)
  liveStream._bytespushed = 0
  liveStream._filesize = 0
  liveStream._destroy = function _destroy (cb) {
    unwatchFile(file)
    cb()
  }
  chiefstat(file, liveStream._opts, oninitstat.bind(liveStream))
  watchFile(file, liveStream._opts, onwatch.bind(liveStream))
  return liveStream
}

module.exports = createLiveStream
