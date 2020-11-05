import _ from 'lodash';
import Vue from 'Vue';
import paths from '../libs/paths';

export default { register };

function register(ngModule) {
  ngModule.directive('vue', [ function () {
    return {
      restrict: 'A',
      terminal: true, // any directive with lower priority will be ignored
      priority: 1001, // 1 more than ngNonBindable => disable angular interpolation!
      link(scope, element, attrs) {
        const ngDelegates             = loadExposedDelegates(attrs);
        const ngProperties            = loadExposedProperties(attrs);
        const syncedPropertiesMapping = loadSyncedPropertiesMapping(attrs);

        // test declarations

        ngProperties.forEach((prop) => testDefined(scope, prop));
        ngDelegates.forEach((prop) => testDefined(scope, prop));

        const vueData    = {};
        const vueMethods = {};

        ngProperties.filter(paths.isRoot).forEach((ngProp) => {
          const vueProp    = ngProp;
          vueData[vueProp] = scope.$eval(ngProp); // set initial value
        });

        ngDelegates.forEach((ngDelegate) => {
          vueMethods[ngDelegate] = (...args) => {
            console.log(`Calling ng delegate: ${ngDelegate}()`);
            scope.$apply(() => scope.$eval(ngDelegate).apply(scope, args));
          };
        });

        // Create root component;

        const vm = new Vue({
          components: scope.$vueComponents,
          data      : vueData,
          methods   : vueMethods,
        }).$mount(element[0]);

        // Watch changes

        ngProperties.forEach((ngProp) => {
          const vueProp = ngProp;

          scope.$watch(ngProp, (value) => {
            console.log(`ng(${ngProp}) => vue(${vueProp}) =`, value);

            let target = vm;
            let prop   = vueProp;

            if (!paths.isRoot(prop)) {
              target = _.get(vm, paths.parent(prop));
              prop   = paths.leaf(prop);
            }

            Vue.set(target, prop, value);
          });
        });

        _.forEach(syncedPropertiesMapping, (ngProp, vueProp) => { // .sync
          vm.$children.forEach((c) => c.$on(`update:${vueProp}`, (value) => {
            console.log(`vue(${vueProp}) => ng(${ngProp}) =`, value);
            scope.$apply(() => _.set(scope, ngProp, value));
          }));
        });
      },
    };

    function loadExposedProperties(attrs) {
      const vDirectives = /^(?:v-model|v-html|v-text|v-show|v-class|v-attr|v-style|v-if)(?:\.[a-z0-9]+)*$/i;
      const vBind       = /^(?:v-bind)?:[a-z-]+(\.[a-z]+)*$/i;
      const vBindValue  = /^[a-z$_][a-z0-9$_]*(\.[a-z$_][a-z0-9$_]*)*$/i;

      const properties = (attrs.vueExpose ?? '').split(',').map((o) => o.trim()).filter((o) => vBindValue.test(o));

      // autodetect simple binding on props detect

      const attributes = remapAttributes(attrs);

      _.forEach(attributes, (value, name) => {
        const validName =  vBind.test(name)
                            || vDirectives.test(name);

        if (validName && vBindValue.test(value)) {
          properties.push(value);
        }
      });

      // Add parent properties

      let allProperties = [ ...properties ];

      properties.forEach((prop) => {
        allProperties =  _.union(allProperties, paths.parents(prop));
      });

      return _(allProperties).uniq().sort().value();
    }

    function loadSyncedPropertiesMapping(attrs) {
      // autodetect simple binding on props detect

      const vModel     = /^(?:v-model)$/i;
      const vBind      = /^(?:v-bind)?:([a-z-]+)\.sync*$/i;
      const vBindValue = /^[a-z$_][a-z0-9$_]*(\.[a-z$_][a-z0-9$_]*)*$/i;

      const mapping    = {};
      const attributes = remapAttributes(attrs);

      _.forEach(attributes, (value, name) => {
        if (vModel.test(name)) {
          const vueProp = 'value';

          if (!vBindValue.test(value)) throw Error(`Unsupported v-model binding value: ${value}`);

          mapping[vueProp] = value;
        }

        if (vBind.test(name)) {
          const vueProp = name.replace(vBind, '$1') // Keep only property name
            .replace(/-[a-z]/g, (m) => m[1].toUpperCase()).replace(/^[A-Z]/, (m) => m[1].toLowerCase()); // convert to camel-case

          if (!vBindValue.test(value)) throw Error(`Unsupported v-bind:${vueProp}.sync binding value: ${value}`);

          mapping[vueProp] = value;
        }
      });

      return mapping;
    }

    function loadExposedDelegates(attrs) {
      const ngVueDeclaredRe = /^&([a-z$_][a-z0-9$_]*)$/i;
      const ngDelegates     = (attrs.vueExpose ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter((o) => ngVueDeclaredRe.test(o))
        .map((o) => o.replace(ngVueDeclaredRe, '$1'));

      // autodetect simple delegate call with empty ()
      // eg: call_function()

      const vOnRe         = /^(?:v-on:|@)[a-z-]+(:[a-z0-9-]+)?(\.[a-z0-9-]+)*/i;
      const vOnDelegateRe = /^([a-z_$][a-z0-9_$]*)(?:\(\))?$/i;

      const attributes = remapAttributes(attrs);

      _.forEach(attributes, (value, name) => {
        const validName = vOnRe.test(name);

        if (validName && vOnDelegateRe.test(value)) {
          ngDelegates.push(value.replace(vOnDelegateRe, '$1'));
        }
      });

      return ngDelegates;
    }

    function remapAttributes(attrs) {
      const attributes = {};

      _.forEach(attrs.$attr, (name, key) => {
        const value      = attrs[key];
        attributes[name] = value;
      });

      return attributes;
    }

    function testDefined(scope, expression) {
      if (scope.$eval(expression) === undefined) {
        throw Error(`"${expression}" is not defined on parent scope`);
      }
    }
  } ]);
}
