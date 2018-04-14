var { Readable } = require('stream')
var { lstat, open, read, stat, watch } = require('fs')
var debug = require('debug')('append-only-live-stream')

function chiefstat (file, opts, cb) {
  opts.dereference ? stat(file, cb) : lstat(file, cb)
}

function onopen (err, fd) {
  debug('onopen err,fd::', err, fd)
  if (err) return this.emit('error', err)
  var diff = this._filesize - this._bytespiped
  debug('diff::', diff)
  if (diff < 1) return
  this._bytespiped += diff
  var buf = Buffer.alloc(diff)
  read(fd, buf, 0, diff, this._bytespiped - diff, onread.bind(this))
}

function onread (err, bytesread, buf) {
  debug('onread err,bytesread,buf::', err, bytesread, buf)
  if (err) return this.emit('error', err)
  debug('pushin::', buf)
  var more = this.push(buf)
  if (more) this._read()
}

function onstat (pull, err, stats) {
  debug('onstat err,stats.size::', err, stats.size)
  if (err) return this.emit('error', err)
  this._filesize = stats.size
  if (pull && stats.size > this._bytespiped) this._read()
}

function onchange (e, filename) {
  debug('onchange e,filename::', e, filename)
  if (e !== 'change') return
  chiefstat(filename, this._opts, onstat.bind(this, true))
}

function createLiveStream (file, opts) {
  if (!opts) opts = {}
  var liveStream = new Readable({
    highWaterMark: opts.highWaterMark || 16384,
    encoding: opts.encoding || null,
    read () {
      debug('filesize,bytespiped::', this._filesize, this._bytespiped)
      if (this._filesize > this._bytespiped) {
        open(file, 'r', onopen.bind(this))
      }
    },
    destroy (err, cb) {
      this._watcher.close()
      cb(err)
    }
  })
  liveStream._opts = Object.assign({ persistent: false }, opts)
  liveStream._bytespiped = 0
  liveStream._filesize = 0
  liveStream._watcher = watch(file, liveStream._opts)
  liveStream._watcher.on('change', onchange.bind(liveStream))
  liveStream._watcher.on('error', liveStream.emit.bind(liveStream, 'error'))
  chiefstat(file, liveStream._opts, onstat.bind(liveStream, false))
  return liveStream
}

module.exports = createLiveStream
