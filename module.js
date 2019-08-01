// 源码地址： https://github.com/nodejs/node-v0.x-archive/blob/master/lib/module.js
/**
 * 
 * @author TyrionJYQ
 * 
 * 本文从宏观上讨论NodeJS中module是如何实现的，不纠结于具体的细节。
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */ 

// 引入的依赖
var NativeModule = require('native_module');
var util = require('util');
var runInThisContext = require('vm').runInThisContext;
var runInNewContext = require('vm').runInNewContext;
var assert = require('assert').ok;
var fs = require('fs');

// 下面逐个分析依赖


/**
 * NativeModule
 */



/**
 * util
 * 
 * util 模块主要用于支持 Node.js 内部 API 的需求。大部分实用工具也可用于应用程序与模块开发者
 * http://nodejs.cn/api/util.html#util_util
 */

/**
 * vm: 虚拟机
 * 
 * vm 模块提供了在 V8 虚拟机上下文中编译和运行代码的一系列 API
 * 
 * http://nodejs.cn/api/vm.html#vm_vm_executing_javascript
 */

/**
 * asset：断言
 * 
 * assert 模块提供了一组简单的断言测试，可用于测试不变量，严格模式 || 遗留模式
 * 
 */


/**
 * fs： 常用的文件模块
 */



/**
 * 
 * 分析a.js文件中引入b.js文件发生了什么
 * 
 * 
 * 
 * 
 */


// a.js code below

const b =require('./b');
console.log('module is:', module);
console.log('module.__proto__ is ', module.__proto__);


// a.js中可以获取当前模块a.js文件的模块实例,module


/*
module.__proto__ is  Module { load: [Function], require: [Function], _compile: [Function] }
module is: Module {
  id: '.',
  exports: {},
  parent: null,
  filename:
   'E:\\workspace\\git\\Node.js-module-source-code-learning\\a.js',
  loaded: false,
  children:
   [ Module {
       id:
        'E:\\workspace\\git\\Node.js-module-source-code-learning\\b.js',
       exports: {},
       parent: [Circular],
       filename:
        'E:\\workspace\\git\\Node.js-module-source-code-learning\\b.js',
       loaded: true,
       children: [Array],
       paths: [Array] } ],
  paths:
   [ 'E:\\workspace\\git\\Node.js-module-source-code-learning\\node_modules',
     'E:\\workspace\\git\\node_modules',
     'E:\\workspace\\node_modules',
     'E:\\node_modules' ] }

*/

// 从打印出的内容可以看到module实例的require() 方法是继承自原型对象上的。
// a.js模块实例调用其原型对象上的require方法



// require方法源码
// Loads a module at the given file path. Returns that module's
// `exports` property.
Module.prototype.require = function(path) {
  assert(path, 'missing path');
  assert(util.isString(path), 'path must be a string');
  return Module._load(path, this);
};

// require方法最终调用Module函数的_load方法



// Module._load
Module._load = function(request, parent, isMain) {
  if (parent) {
    debug('Module._load REQUEST  ' + (request) + ' parent: ' + parent.id);
  }

  var filename = Module._resolveFilename(request, parent);

  var cachedModule = Module._cache[filename];
  if (cachedModule) {
    return cachedModule.exports;
  }

  if (NativeModule.exists(filename)) {
    // REPL is a special case, because it needs the real require.
    if (filename == 'repl') {
      var replModule = new Module('repl');
      replModule._compile(NativeModule.getSource('repl'), 'repl.js');
      NativeModule._cache.repl = replModule;
      return replModule.exports;
    }

    debug('load native module ' + request);
    return NativeModule.require(filename);
  }

  var module = new Module(filename, parent);

  if (isMain) {
    process.mainModule = module;
    module.id = '.';
  }

  Module._cache[filename] = module;

  var hadException = true;

  try {
    module.load(filename);
    hadException = false;
  } finally {
    if (hadException) {
      delete Module._cache[filename];
    }
  }

  return module.exports;
};
// _load方法中对传入的模块表示符

//  Module._resolveFilename调用Module._resolveFilename(request)方法获取filename here request === './b.js'
// _resolveFilename方法最终返回filename
// 在_load方法中拿到filename后首先判断filename对于的模块是否存在缓存Module._cache中
// 如果缓存中已有说明该方法被其他模块引用过，这时直接返回缓存的模块对象的exports属性，这里a.js就能使用拿到的exports的相关属性和方法
// 缓存Module.cache中不存在引用的模块，判断是否是核心模块，是就返回核心模块
// 不是核心模块，调用Module构造函数得到module实例，将得到的实例存入缓存 Module._cache中
//调用module.load方法，该方法继承自Module.prototype（module.__proto__）
// Module.prototype.load方法中，获取文件后缀名，以.js为例。
// 这里b.js实例化后的module实例对象的filename为控，paths没有定义
/*
function Module(id, parent) {
  this.id = id;
  this.exports = {};
  this.parent = parent;
  if (parent && parent.children) {
    parent.children.push(this);
  }

  this.filename = null;
  this.loaded = false;
  this.children = [];
}

*/
// 在module.load方法中获取filename，添加children属性，如果是.js拓展名，则调用 Module._extensions[.js](this, filename) 
/*
Module._extensions['.js'] = function(module, filename) {
  var content = fs.readFileSync(filename, 'utf8');
  module._compile(stripBOM(content), filename);
};
*/
// 这里的this是指b.js模块实例
// Module._extensions['.js'] 调用module._compile方法
// module._compile编译不成功抛出异常则hadException为true说明编译因为各种原因（比如文件不存在）没有成功
// 此时从缓存中删除缓存的相应的module实例
// load方法执行没有抛出错误，最终返回exports对象。

//从上述分析可以得到以下结论
// node.js一个模块被引用后会被放入缓存Module._cache对象中
// 加载速度：缓存的模块 > 核心模块 > 未被缓存的第三方模块




Module.prototype._compile = function(content, filename) {
  var self = this;
  // remove shebang
  content = content.replace(/^\#\!.*/, '');

  function require(path) {
    return self.require(path);
  }

  require.resolve = function(request) {
    return Module._resolveFilename(request, self);
  };

  Object.defineProperty(require, 'paths', { get: function() {
    throw new Error('require.paths is removed. Use ' +
                    'node_modules folders, or the NODE_PATH ' +
                    'environment variable instead.');
  }});

  require.main = process.mainModule;

  // Enable support to add extra extension types
  require.extensions = Module._extensions;
  require.registerExtension = function() {
    throw new Error('require.registerExtension() removed. Use ' +
                    'require.extensions instead.');
  };

  require.cache = Module._cache;

  var dirname = path.dirname(filename);

  if (Module._contextLoad) {
    if (self.id !== '.') {
      debug('load submodule');
      // not root module
      var sandbox = {};
      for (var k in global) {
        sandbox[k] = global[k];
      }
      sandbox.require = require;
      sandbox.exports = self.exports;
      sandbox.__filename = filename;
      sandbox.__dirname = dirname;
      sandbox.module = self;
      sandbox.global = sandbox;
      sandbox.root = root;

      return runInNewContext(content, sandbox, { filename: filename });
    }

    debug('load root module');
    // root module
    global.require = require;
    global.exports = self.exports;
    global.__filename = filename;
    global.__dirname = dirname;
    global.module = self;

    return runInThisContext(content, { filename: filename });
  }

  // create wrapper function
  var wrapper = Module.wrap(content);

  var compiledWrapper = runInThisContext(wrapper, { filename: filename });
  if (global.v8debug) {
    if (!resolvedArgv) {
      // we enter the repl if we're not given a filename argument.
      if (process.argv[1]) {
        resolvedArgv = Module._resolveFilename(process.argv[1], null);
      } else {
        resolvedArgv = 'repl';
      }
    }

    // Set breakpoint on module start
    if (filename === resolvedArgv) {
      global.v8debug.Debug.setBreakPoint(compiledWrapper, 0, 0);
    }
  }
  var args = [self.exports, require, self, filename, dirname];
  return compiledWrapper.apply(self.exports, args);
};






Module._resolveFilename = function(request, parent) {
  if (NativeModule.exists(request)) {   // 判断是否是核心模块比如'path' 是直接返回'path'
    return request;
  }

  var resolvedModule = Module._resolveLookupPaths(request, parent);   // 如果不是核心模块则调用Module._resolveLookupPaths()方法
  var id = resolvedModule[0];
  var paths = resolvedModule[1];

  // look up the filename first, since that's the cache key.
  debug('looking for ' + JSON.stringify(id) +
        ' in ' + JSON.stringify(paths));

  var filename = Module._findPath(request, paths);
  if (!filename) {
    var err = new Error("Cannot find module '" + request + "'");
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  }
  return filename;
};



// Module.prototype.load
Module.prototype.load = function(filename) {
  debug('load ' + JSON.stringify(filename) +
        ' for module ' + JSON.stringify(this.id));

  assert(!this.loaded);
  this.filename = filename;
  this.paths = Module._nodeModulePaths(path.dirname(filename));

  var extension = path.extname(filename) || '.js';
  if (!Module._extensions[extension]) extension = '.js';
  Module._extensions[extension](this, filename);
  this.loaded = true;
};
