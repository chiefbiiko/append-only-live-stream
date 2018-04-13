var { Readable } = require('stream')
var { lstat, open, read, stat, watchFile, watch } = require('fs')
var debug = require('debug')('append-only-live-stream')

function chiefstat (file, opts, cb) {
  opts.dereference ? stat(file, cb) : lstat(file, cb)
}

function onopen (err, fd) {
  debug('onopen err::', err)
  if (err) return this.emit('error', err)
  var diff = this._filesize - this._bytesPiped
  debug('diff::', diff)
  if (diff < 1) return
  this._bytesPiped += diff//buf.length
  var buf = Buffer.alloc(diff)
  read(fd, buf, 0, diff, this._bytesPiped - diff, onread.bind(this, diff))
}

function onread (diff, err, bytesRead, buf) {
  debug('onread err::', err)
  debug('diff,err,bytesRead,buf', diff, err, bytesRead, buf)
  if (err) return this.emit('error', err)
  // this._bytesPiped += buf.length
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
  if (cur.size > this._bytesPiped) this._read()
}

function _destroy (cb) {
  this._watcher.close()
  cb()
}

function onstat (err, stats) {
  if (err) return this.emit('error', err)
  debug('updating filesize::', stats.size)
  this._filesize = stats.size
  if (stats.size > this._bytesPiped) this._read()
}

function onchange (file, eventType, filename) {
  debug('onchange eventType::', eventType)
  if (eventType !== 'change') return
  debug('::onchange statin::')
  chiefstat(file, this._opts, onstat.bind(this))
}

function createLiveStream (file, opts) {
  var liveStream = new Readable({
    read () {
      debug('filesize,bytesPiped::', this._filesize, this._bytesPiped)
      if (this._filesize > this._bytesPiped) {
        open(file, 'r', onopen.bind(this))
      }
    }
  })
  // liveStream._opts = Object.assign({ persistent: false, interval: 419 }, opts || {})
  liveStream._opts = Object.assign({ persistent: false }, opts || {})
  liveStream._bytesPiped = 0
  liveStream._filesize = 0
  liveStream._destroy = _destroy.bind(liveStream)
  chiefstat(file, liveStream._opts, oninitstat.bind(liveStream))
  // watchFile(file, liveStream._opts, onwatch.bind(liveStream))
  liveStream._watcher = watch(file, liveStream._opts)
  liveStream._watcher.on('change', onchange.bind(liveStream, file))
  liveStream._watcher.on('error', liveStream.emit.bind(liveStream, 'error'))
  return liveStream
}

module.exports = createLiveStream
