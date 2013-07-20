(function(){
  var scanner, fs, path, util, readline, argv, stderr, stdout, commands, Prompter, slice$ = [].slice;
  scanner = require('./scanner');
  fs = require('fs');
  path = require('path');
  util = require('util');
  readline = require('readline');
  argv = process.argv, stderr = process.stderr, stdout = process.stdout;
  function say(it){
    return process.stdout.write(it + '\n');
  }
  function showHelp(arg$){
    var cmd, k, v;
    cmd = (arg$ != null
      ? arg$
      : [])[0];
    say("Usage: dotfiley command\n");
    switch (false) {
    case !(cmd != null && cmd in commands):
      return say(cmd + ": " + commands[cmd].descr);
    case cmd == null:
      return die("help: unknown command " + cmd);
    default:
      return say("Where command is one of: \n" + (function(){
        var ref$, results$ = [];
        for (k in ref$ = commands) {
          v = ref$[k];
          results$.push("* " + k + ": " + v.descr);
        }
        return results$;
      }()).join('\n') + '\n');
    }
  }
  function die(message, code){
    code == null && (code = 1);
    fs.writeSync(process.stderr.fd, message + '\n');
    return process.exit(code);
  }
  commands = {
    help: {
      descr: "Show this Message",
      command: showHelp
    },
    install: {
      descr: "Install your dotfiles",
      command: install
    },
    info: {
      descr: "Show information about the dotfiles",
      command: info
    }
  };
  (function(){
    var command, args;
    command = argv[2], args = slice$.call(argv, 3);
    switch (false) {
    case command != null:
      showHelp();
      return die("No command specified");
    case !(command in commands):
      return commands[command].command(args);
    default:
      showHelp();
      return die("Unknown command");
    }
  })();
  function parseJsonPath(json_path, relative){
    relative == null && (relative = '.');
    return path.resolve.apply(path, [relative].concat(slice$.call(path.normalize(json_path).replace('~', '$HOME').split(path.sep).map(function(it){
      if (it.indexOf('$') === 0) {
        return process.env[it.slice(1)];
      } else {
        return it;
      }
    }))));
  }
  function fixPaths(data){
    var filename, content, ref$, results$ = {};
    for (filename in data) {
      content = data[filename];
      results$[filename] = {
        symlinks: (ref$ = content.symlinks) != null ? ref$.map(fn$) : void 8
      };
    }
    return results$;
    function fn$(it){
      return {
        source: parseJsonPath(it.source, path.dirname(filename)),
        target: parseJsonPath(it.target, path.dirname(filename))
      };
    }
  }
  function info(){
    say("Looking for dot.json files...");
    return scanner.scan('.', function(e, f){
      if (e != null) {
        die("Error: " + e);
      }
      say("Found files at " + f);
      say("Reading and parsing the files...");
      scanner.parse(f, function(e, data){
        var totalSymlinks, d, totalFiles;
        if (e != null) {
          die("Error: " + e);
        }
        say("Done!");
        totalSymlinks = (function(){
          var i$, ref$, results$ = [];
          for (i$ in ref$ = data) {
            d = ref$[i$];
            results$.push(d.symlinks.length);
          }
          return results$;
        }()).reduce(curry$(function(x$, y$){
          return x$ + y$;
        }));
        totalFiles = Object.keys(data).length;
        say(totalSymlinks + " symlinks spread over " + totalFiles + " files.");
        data = fixPaths(data);
      });
    });
  }
  function makeLink(arg$, cb){
    var source, target;
    source = arg$.source, target = arg$.target;
    cb == null && (cb = function(){});
    return mkdirP(path.dirname(target), function(e){
      if (e != null) {
        die("Error: " + e + " while making dir");
      }
      fs.symlink(source, target, function(e){
        if (e != null) {
          die("Error: " + e + " while linking");
        }
        say("ln -s " + source + " " + target);
        cb();
      });
    });
  }
  Prompter = (function(){
    Prompter.displayName = 'Prompter';
    var prototype = Prompter.prototype, constructor = Prompter;
    function Prompter(amntFiles){
      this.amntFiles = amntFiles;
      this.prompts = [];
    }
    prototype.markDone = function(){
      this.amntFiles -= 1;
      if (this.amntFiles === 0) {
        this.prompt();
      }
    };
    prototype.addPrompt = function(descr, cb){
      this.prompts.push([descr, cb]);
      this.markDone();
    };
    prototype.prompt = function(){
      var rl, iterateOver;
      rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      iterateOver = function(a, i){
        if (i >= a.length) {
          rl.close();
          return;
        }
        rl.question(a[i][0] + "[yN]?", function(answer){
          switch (answer.trim().toLowerCase()) {
          case '':
            // fallthrough
          case 'n':
            iterateOver(a, i + 1);
            break;
          case 'y':
            a[i][1](function(){
              return iterateOver(a, i + 1);
            });
            break;
          default:
            iterateOver(a, i);
          }
        });
      };
      iterateOver(this.prompts, 0);
    };
    return Prompter;
  }());
  function install(){
    return scanner.scan('.', function(e, f){
      if (e != null) {
        die("Error: " + e + " while looking for dot.json files");
      }
      scanner.parse(f, function(e, data){
        var totalSymlinks, d, totalFiles, targetSymlinks, ref$;
        if (e != null) {
          die("Error: " + e + " while parsing dot.json files");
        }
        totalSymlinks = (function(){
          var i$, ref$, results$ = [];
          for (i$ in ref$ = data) {
            d = ref$[i$];
            results$.push(d.symlinks.length);
          }
          return results$;
        }()).reduce(curry$(function(x$, y$){
          return x$ + y$;
        }));
        totalFiles = Object.keys(data).length;
        say(totalSymlinks + " symlinks spread over " + totalFiles + " files.");
        data = fixPaths(data);
        targetSymlinks = (ref$ = []).concat.apply(ref$, (function(){
          var i$, ref$, results$ = [];
          for (i$ in ref$ = data) {
            d = ref$[i$];
            results$.push(d.symlinks.map(fn$));
          }
          return results$;
          function fn$(it){
            return it.target;
          }
        }()));
        scanner.inspectTargets(targetSymlinks, function(e, specs){
          var installedFiles, res$, i$, len$, ref$, k, v, prompter, d, descr;
          if (e != null) {
            die("Error: " + e + " while looking for already installed files");
          }
          res$ = {};
          for (i$ = 0, len$ = specs.length; i$ < len$; ++i$) {
            ref$ = specs[i$], k = ref$[0], v = ref$[1];
            res$[k] = v;
          }
          installedFiles = res$;
          prompter = new Prompter(targetSymlinks.length);
          for (d in ref$ = data) {
            descr = ref$[d];
            descr.symlinks.forEach(fn$);
          }
          function fn$(link){
            var targetFile;
            targetFile = installedFiles[link.target];
            switch (false) {
            case targetFile.isNonexistent == null:
              makeLink(link, bind$(prompter, 'markDone'));
              break;
            case !(targetFile.isSymbolicLink() && targetFile.linkDest === link.source):
              say(link.source + " already installed.");
              prompter.markDone();
              break;
            default:
              prompter.addPrompt("File " + link.target + " exists, overwrite", function(cb){
                fs.unlink(link.target, function(e){
                  if (e != null) {
                    die("Error: " + e + " while overwriting");
                  }
                  makeLink(link, cb);
                });
              });
            }
          }
        });
      });
    });
  }
  function mkdirP(dir, cb){
    var mode;
    mode = 511 & ~process.umask();
    return fs.stat(dir, function(e, stat){
      switch (false) {
      case !(e != null && e.code === 'ENOENT'):
        mkdirP(path.dirname(dir), function(e){
          if (e != null) {
            return cb(e);
          }
          fs.mkdir(dir, mode, cb);
        });
        break;
      case e == null:
        cb(e);
        break;
      case !stat.isDirectory():
        cb(void 8);
        break;
      default:
        cb("file exists");
      }
    });
  }
  function curry$(f, bound){
    var context,
    _curry = function(args) {
      return f.length > 1 ? function(){
        var params = args ? args.concat() : [];
        context = bound ? context || this : this;
        return params.push.apply(params, arguments) <
            f.length && arguments.length ?
          _curry.call(context, params) : f.apply(context, params);
      } : f;
    };
    return _curry();
  }
  function bind$(obj, key, target){
    return function(){ return (target || obj)[key].apply(obj, arguments) };
  }
}).call(this);
