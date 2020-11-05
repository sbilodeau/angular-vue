(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('lodash')) :
  typeof define === 'function' && define.amd ? define(['lodash'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global._));
}(this, (function (_) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var ___default = /*#__PURE__*/_interopDefaultLegacy(_);

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _createForOfIteratorHelper(o, allowArrayLike) {
    var it;

    if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;

        var F = function () {};

        return {
          s: F,
          n: function () {
            if (i >= o.length) return {
              done: true
            };
            return {
              done: false,
              value: o[i++]
            };
          },
          e: function (e) {
            throw e;
          },
          f: F
        };
      }

      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    var normalCompletion = true,
        didErr = false,
        err;
    return {
      s: function () {
        it = o[Symbol.iterator]();
      },
      n: function () {
        var step = it.next();
        normalCompletion = step.done;
        return step;
      },
      e: function (e) {
        didErr = true;
        err = e;
      },
      f: function () {
        try {
          if (!normalCompletion && it.return != null) it.return();
        } finally {
          if (didErr) throw err;
        }
      }
    };
  }

  var vueDirectiveDefinition = [function () {
    return {
      restrict: 'A',
      terminal: true,
      //any directive with lower priority will be ignored
      priority: 1001,
      // 1 more than ngNonBindable => disable angular interpolation!
      link: function link(scope, element, attrs) {
        var ngDelegates = loadExposedDelegates(attrs);
        var ngProperties = loadExposedProperties(attrs);
        var syncedPropertiesMapping = loadSyncedPropertiesMapping(attrs); // test declarations

        ngProperties.forEach(function (prop) {
          return testDefined(scope, prop);
        });
        ngDelegates.forEach(function (prop) {
          return testDefined(scope, prop);
        });
        var vueData = ngProperties.filter(isRootPath).reduce(function (data, ngProp) {
          var vueProp = ngProp;
          data[vueProp] = scope.$eval(ngProp); // set initial value

          return data;
        }, {});
        var vueMethods = ngDelegates.reduce(function (methods, ngDelegate) {
          methods[ngDelegate] = function () {
            var _arguments = arguments;
            console.log("Calling ng delegate: ".concat(ngDelegate, "()"));
            scope.$apply(function () {
              return scope.$eval(ngDelegate).apply(scope, _arguments);
            });
          };

          return methods;
        }, {}); //Create root component;

        var vm = new Vue({
          components: scope.$vueComponents,
          data: vueData,
          methods: vueMethods
        }).$mount(element[0]); // Watch changes 

        var _iterator = _createForOfIteratorHelper(ngProperties),
            _step;

        try {
          var _loop2 = function _loop2() {
            var prop = _step.value;
            var ngProp = prop;
            var vueProp = prop;
            scope.$watch(ngProp, function (value) {
              console.log("ng(".concat(ngProp, ") => vue(").concat(vueProp, ") ="), value);
              var target = vm;
              var prop = vueProp;

              if (!isRootPath(prop)) {
                target = ___default['default'].get(vm, parentPath(prop));
                prop = leafPath(prop);
              }

              Vue.set(target, prop, value);
            });
          };

          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            _loop2();
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        var _loop = function _loop(vueProp) {
          // .sync
          var ngProp = syncedPropertiesMapping[vueProp];
          vm.$children.forEach(function (c) {
            return c.$on("update:".concat(vueProp), function (value) {
              console.log("vue(".concat(vueProp, ") => ng(").concat(ngProp, ") ="), value);
              scope.$apply(function () {
                return ___default['default'].set(scope, ngProp, value);
              });
            });
          });
        };

        for (var vueProp in syncedPropertiesMapping) {
          _loop(vueProp);
        }
      }
    };

    function loadExposedProperties(attrs) {
      var _attrs$vueExpose;

      var vDirectives = /^(?:v-model|v-html|v-text|v-show|v-class|v-attr|v-style|v-if)(?:\.[a-z0-9]+)*$/i;
      var vBind = /^(?:v-bind)?:[a-z\-]+(\.[a-z]+)*$/i;
      var vBindValue = /^[a-z\$_][a-z0-9\$_]*(\.[a-z\$_][a-z0-9\$_]*)*$/i;
      var properties = ((_attrs$vueExpose = attrs.vueExpose) !== null && _attrs$vueExpose !== void 0 ? _attrs$vueExpose : "").split(',').map(function (o) {
        return o.trim();
      }).filter(function (o) {
        return vBindValue.test(o);
      }); // autodetect simple binding on props detect 

      var attributes = remapAttributes(attrs);

      for (var name in attributes) {
        var value = attributes[name];
        var validName = vBind.test(name) || vDirectives.test(name);

        if (validName && vBindValue.test(value)) {
          properties.push(value);
        }
      } // Add parent properties


      var i = properties.length;

      while (i--) {
        var path = parentPath(properties[i]);

        while (path) {
          properties.push(path);
          path = parentPath(path);
        }
      }

      return ___default['default'].uniq(properties);
    }

    function loadSyncedPropertiesMapping(attrs) {
      // autodetect simple binding on props detect 
      var vModel = /^(?:v-model)$/i;
      var vBind = /^(?:v-bind)?:([a-z\-]+)\.sync*$/i;
      var vBindValue = /^[a-z\$_][a-z0-9\$_]*(\.[a-z\$_][a-z0-9\$_]*)*$/i;
      var mapping = {};
      var attributes = remapAttributes(attrs);

      for (var name in attributes) {
        var value = attributes[name];

        if (vModel.test(name)) {
          var vueProp = 'value';
          if (!vBindValue.test(value)) throw Error("Unsupported v-model binding value: ".concat(value));
          mapping[vueProp] = value;
        }

        if (vBind.test(name)) {
          var _vueProp = name.replace(vBind, "$1") // Keep only property name
          .replace(/-[a-z]/g, function (m) {
            return m[1].toUpperCase();
          }).replace(/^[A-Z]/, function (m) {
            return m[1].toLowerCase();
          }); // convert to camel-case


          if (!vBindValue.test(value)) throw Error("Unsupported v-bind:".concat(_vueProp, ".sync binding value: ").concat(value));
          mapping[_vueProp] = value;
        }
      }

      return mapping;
    }

    function loadExposedDelegates(attrs) {
      var _attrs$vueExpose2;

      var ngVueDeclaredRe = /^&([a-z\$_][a-z0-9\$_]*)$/i;
      var ngDelegates = ((_attrs$vueExpose2 = attrs.vueExpose) !== null && _attrs$vueExpose2 !== void 0 ? _attrs$vueExpose2 : "").split(',').map(function (o) {
        return o.trim();
      }).filter(function (o) {
        return ngVueDeclaredRe.test(o);
      }).map(function (o) {
        return o.replace(ngVueDeclaredRe, "$1");
      }); // autodetect simple delegate call with empty ()
      // eg: call_function()

      var vOnRe = /^(?:v-on:|@)[a-z\-]+(\:[a-z0-9-]+)?(\.[a-z0-9-]+)*/i;
      var vOnDelegateRe = /^([a-z_$][a-z0-9_$]*)(?:\(\))?$/i;

      for (var key in attrs.$attr) {
        var name = attrs.$attr[key];
        var value = attrs[key];
        var validName = vOnRe.test(name);

        if (validName && vOnDelegateRe.test(value)) {
          ngDelegates.push(value.replace(vOnDelegateRe, "$1"));
        }
      }

      return ngDelegates;
    }

    function parentPath(path) {
      var parts = path.split('.');
      parts.pop();
      return parts.join('.');
    }

    function leafPath(path) {
      var parts = path.split('.');
      return parts.pop();
    }

    function isRootPath(path) {
      var parts = path.split('.');
      return parts.length == 1;
    }

    function remapAttributes(attrs) {
      var attributes = {};

      for (var key in attrs.$attr) {
        var name = attrs.$attr[key];
        var value = attrs[key];
        attributes[name] = value;
      }

      return attributes;
    }

    function testDefined(scope, expression) {
      if (scope.$eval(expression) === undefined) {
        throw Error("\"".concat(expression, "\" is not defined on parent scope"));
      }
    }
  }];

  angular.module("angularVue", []).directive("vue", vueDirectiveDefinition);

})));
//# sourceMappingURL=angular-vue.js.map
