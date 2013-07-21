{spawn} = require \child_process


task \build 'Compile all LiveScript from src/ to JavaScript in lib/' ->
  clean ->
    build!


task \clean 'Remove all compile output' ->
  clean!

clean = (cb) ->
  proc = spawn \rm [\-r \./lib]
  if cb then proc.on \exit cb

build = (cb) ->
  livescript [\-co \lib] ++ ["src/#file" for file in dir \src when /\.ls$/.test file], cb

livescript = (args, cb) ->
  say \livescript + ' ' + args.join ' '
  proc = spawn \livescript args
  proc.stderr.on \data say
  proc.on \exit, (err) ->
    if err then process.exit err
    if cb then cb!
