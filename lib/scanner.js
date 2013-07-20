(function(){
  var fs, path, slice$ = [].slice;
  fs = require('fs');
  path = require('path');
  function collectCombine(fun, input, cb){
    var output, error;
    output = [];
    error = void 8;
    if (input.length === 0) {
      return cb(void 8, []);
    }
    return input.forEach(function(inp){
      fun(inp, function(e, outp){
        if (error) {
          return;
        }
        if (e != null) {
          return cb(error = e);
        }
        output.push([inp, outp]);
        if (input.length === output.length) {
          cb(void 8, output);
        }
      });
    });
  }
  function scan(dir, cb){
    return fs.readdir(dir, function(e, files){
      if (e != null) {
        return cb(e);
      }
      collectCombine(fs.stat, files.map(function(it){
        return path.join(dir, it);
      }), function(e, stats){
        var outputFiles, res$, i$, len$, ref$, n, s, outputDirs;
        if (e != null) {
          return cb(e);
        }
        res$ = [];
        for (i$ = 0, len$ = stats.length; i$ < len$; ++i$) {
          ref$ = stats[i$], n = ref$[0], s = ref$[1];
          if (s.isFile() && path.basename(n) === 'dot.json') {
            res$.push(n);
          }
        }
        outputFiles = res$;
        res$ = [];
        for (i$ = 0, len$ = stats.length; i$ < len$; ++i$) {
          ref$ = stats[i$], n = ref$[0], s = ref$[1];
          if (s.isDirectory()) {
            res$.push(n);
          }
        }
        outputDirs = res$;
        checkCallback(collectCombine, scan, outputDirs, function(e, subfiles){
          if (e != null) {
            return cb(e);
          }
          cb(void 8, outputFiles.concat.apply(outputFiles, subfiles.map(function(it){
            return it[1];
          })));
        });
      });
    });
  }
  function parse(filenames, cb){
    return collectCombine(function(file, cb){
      fs.readFile(file, {
        encoding: 'utf8'
      }, function(e, data){
        if (e != null) {
          return cb(e);
        }
        cb(void 8, JSON.parse(data));
      });
    }, filenames, function(e, d){
      var that, k, v;
      if ((that = e) != null) {
        cb(that);
      } else {
        cb(void 8, (function(){
          var i$, ref$, len$, ref1$, results$ = {};
          for (i$ = 0, len$ = (ref$ = d).length; i$ < len$; ++i$) {
            ref1$ = ref$[i$], k = ref1$[0], v = ref1$[1];
            results$[k] = v;
          }
          return results$;
        }()));
      }
    });
  }
  function inspectTargets(paths, cb){
    function inspectLink(path, cb){
      return fs.lstat(path, function(e, stat){
        switch (false) {
        case !(e != null && e.code === 'ENOENT'):
          cb(void 8, {
            isNonexistent: function(){
              return true;
            }
          });
          break;
        case e == null:
          cb(e);
          break;
        case !stat.isSymbolicLink():
          fs.readlink(path, function(e, linkstring){
            if (e != null) {
              return cb(e);
            }
            stat.linkDest = linkstring;
            cb(void 8, stat);
          });
          break;
        default:
          cb(void 8, stat);
        }
      });
    }
    return collectCombine(inspectLink, paths, cb);
  }
  exports.scan = scan;
  exports.parse = parse;
  exports.inspectTargets = inspectTargets;
  function checkCallback(fun){
    var i$, args, cb, timeout;
    args = 1 < (i$ = arguments.length - 1) ? slice$.call(arguments, 1, i$) : (i$ = 1, []), cb = arguments[i$];
    timeout = setTimeout(function(){
      console.log("omg it didn't call anything back");
    }, 1000);
    return fun.apply(null, slice$.call(args).concat([function(){
      clearTimeout(timeout);
      return cb.apply(this, arguments);
    }]));
  }
}).call(this);
