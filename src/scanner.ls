require! [ \fs \path ]

# call the function on every input, and call the callback when they're all done
# or there's an error.
function collect-combine fun, input, cb
  output = []
  # error condition
  error = void
  return cb void [] if input.length is 0
  inp <-! input.forEach
  e, outp <-! fun inp
  return if error
  return cb (error := e) if e?
  output.push [inp, outp]
  if input.length is output.length
    cb void, output


function scan dir, cb
  # read the dir
  e, files <-! fs.readdir dir
  return cb e if e?
  # stat every file in the dir
  e, stats <-! collect-combine fs.stat, files.map (-> path.join dir, it)
  return cb e if e?
  output-files = [n for [n, s] in stats when s.is-file! and path.basename(n) is 'dot.json']
  output-dirs  = [n for [n, s] in stats when s.is-directory!]

  # scan every of the dirs inside
  e, subfiles <-! check-callback collect-combine, scan, output-dirs
  return cb e if e?
  # call back
  cb void output-files.concat ...subfiles.map (.1)

function parse filenames, cb
  file, cb <-! collect-combine _, filenames, !(e, d) ->
    if e? then cb that
    else       cb void, {[k, v] for [k, v] in d}

  e, data  <-! fs.read-file file, {encoding: \utf8}
  return cb e if e?
  cb void JSON.parse data

function inspect-targets paths, cb
  function inspect-link path, cb
    e, stat <-! fs.lstat path
    switch
    | e? and e.code is \ENOENT => cb void, {is-nonexistent: -> true}
    | e?                       => cb e
    | stat.is-symbolic-link!   =>
        e, linkstring <-! fs.readlink path
        return cb e if e?
        stat.link-dest = linkstring
        cb void, stat
    | otherwise                => cb void, stat
  collect-combine inspect-link, paths, cb

exports <<< {
  scan
  parse
  inspect-targets
}

function check-callback fun, ...args, cb
  timeout = setTimeout((!-> console.log("omg it didn't call anything back")), 1000)
  <- fun ...args
  clearTimeout timeout
  cb ...

