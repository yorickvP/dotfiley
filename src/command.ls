
require! <[ ./scanner fs path util readline ]>

{argv, stderr, stdout} = process

function say
  process.stdout.write it + \\n

function show-help([cmd] = [])
  say "Usage: dotfiley command\n"
  switch
  | cmd? and cmd of commands => say "#cmd: #{commands[cmd].descr}"
  | cmd?                     => die "help: unknown command #cmd"
  | otherwise                => say "Where command is one of: \n" +
                                    ["* #{k}: #{v.descr}" for k,v of commands] * \\n + \\n

function die(message, code = 1)
  fs.writeSync process.stderr.fd, message + \\n
  process.exit code

commands =
  help:    descr: "Show this Message",     command: show-help
  install: descr: "Install your dotfiles", command: install
  info:    descr: "Show information about the dotfiles", command: info

do ->
  [, , command, ...args] = argv
  switch
  | not command?        => show-help!; die "No command specified"
  | command of commands => commands[command].command args
  | otherwise           => show-help!; die "Unknown command"

function parse-json-path json_path, relative = \.
  path.resolve relative, ... do
    path.normalize json_path
      .replace \~ \$HOME
      .split path.sep
      .map ->
        if   it.indexOf(\$) is 0
        then process.env[it.slice 1]
        else it

function fix-paths data
  {[filename, symlinks: content.symlinks?map ->
    source: parse-json-path it.source, path.dirname filename
    target: parse-json-path it.target, path.dirname filename
  ] for filename, content of data}

function info
  say "Looking for dot.json files..."
  e, f <-! scanner.scan \.
  die "Error: #e" if e?
  say "Found files at #f"
  say "Reading and parsing the files..."
  e, data <-! scanner.parse f
  die "Error: #e" if e?
  say "Done!"
  total-symlinks = [d.symlinks.length for ,d of data].reduce (+)
  total-files = Object.keys data .length
  say "#total-symlinks symlinks spread over #total-files files."
  data = fix-paths data

function make-link {source, target}, cb = (->)
  e <-! mkdir-p path.dirname target
  die "Error: #e while making dir" if e?
  e <-! fs.symlink source, target
  die "Error: #e while linking" if e?
  say "ln -s #{source} #{target}"
  cb!

class Prompter
  (@amnt-files) ->
    @prompts = []
  mark-done: !->
    @amnt-files -= 1
    if @amnt-files is 0 then @prompt!
  add-prompt: !(descr, cb) ->
    @prompts.push [descr, cb]
    @mark-done!
  prompt: !->
    rl = readline.create-interface {
      input: process.stdin
      output: process.stdout }
    iterate-over = !(a, i) ->
      if i >= a.length
        rl.close!
        return
      answer <-! rl.question a[i].0 + "[yN]?"
      switch answer.trim!toLowerCase!
      | '' => fallthrough
      | \n => iterate-over a, i + 1
      | \y => a[i].1 -> iterate-over a, i + 1
      |  _ => iterate-over a, i
    iterate-over @prompts, 0

function install
  e, f <-! scanner.scan \.
  die "Error: #e while looking for dot.json files" if e?
  e, data <-! scanner.parse f
  die "Error: #e while parsing dot.json files" if e?
  total-symlinks = [d.symlinks.length for ,d of data].reduce (+)
  total-files = Object.keys data .length
  say "#total-symlinks symlinks spread over #total-files files."
  data = fix-paths data
  target-symlinks = [].concat ...[d.symlinks.map (.target) for ,d of data]
  e, specs <-! scanner.inspect-targets target-symlinks
  die "Error: #e while looking for already installed files" if e?
  installed-files = {[k, v] for [k, v] in specs}
  prompter = new Prompter(target-symlinks.length)
  for d, descr of data
    link <-! descr.symlinks.forEach
    #for link in descr.symlinks
    target-file = installed-files[link.target]
    switch
    case target-file.is-nonexistent?
      make-link link, prompter~mark-done
    case target-file.is-symbolic-link! and
         target-file.link-dest is link.source
      say "#{link.source} already installed."
      prompter.mark-done!
    default
      cb <-! prompter.add-prompt "File #{link.target} exists, overwrite"
      e <-! fs.unlink link.target
      die "Error: #e while overwriting" if e?
      make-link link, cb

function mkdir-p dir, cb
  mode = 8~777 .&. ~process.umask!
  e, stat <-! fs.stat dir
  switch
  case e? and e.code is \ENOENT
    e <-! mkdir-p path.dirname dir
    return cb e if e?
    fs.mkdir dir, mode, cb
  
  | e?                 => cb e
  | stat.is-directory! => cb void
  | otherwise          => cb "file exists"
