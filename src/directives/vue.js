import _get from "lodash/get"
import _set from "lodash/set"
import _uniq from "lodash/uniq"

export default [function() {
    return {
        restrict: 'A',
        terminal: true,//any directive with lower priority will be ignored
        priority: 1001,// 1 more than ngNonBindable => disable angular interpolation!
        link: function(scope, element, attrs) {

            const ngDelegates             = loadExposedDelegates (attrs)
            const ngProperties            = loadExposedProperties(attrs)
            const syncedPropertiesMapping = loadSyncedPropertiesMapping(attrs)

            // test declarations

            ngProperties.forEach((prop) => testDefined(scope, prop));
            ngDelegates .forEach((prop) => testDefined(scope, prop));

            const vueData = ngProperties.filter(isRootPath).reduce((data, ngProp) => {
                const vueProp = ngProp;
                data[vueProp] = scope.$eval(ngProp); // set initial value
                return data
            }, {});

            const vueMethods = ngDelegates.reduce((methods, ngDelegate) => {
                methods[ngDelegate] = function() { 
                    console.log(`Calling ng delegate: ${ngDelegate}()`)
                    scope.$apply(()=>scope.$eval(ngDelegate).apply(scope, arguments));
                }
                return methods
            }, {});

            //Create root component;

            var vm = new Vue({
                components : scope.$vueComponents,
                data: vueData,
                methods : vueMethods,
            }).$mount(element[0]);

            // Watch changes 

            for(const prop of ngProperties) {

                const ngProp  = prop
                const vueProp = prop;

                scope.$watch(ngProp, function(value) { 
                    console.log(`ng(${ngProp}) => vue(${vueProp}) =`, value);

                    let target = vm;
                    let prop   = vueProp;

                    if(!isRootPath(prop)) {
                        target = _get(vm, parentPath(prop));
                        prop   = leafPath(prop);
                    }

                    Vue.set(target, prop, value); 
                });
            }

            for(const vueProp in syncedPropertiesMapping) { // .sync
                const ngProp = syncedPropertiesMapping[vueProp];

                vm.$children.forEach(c=>c.$on(`update:${vueProp}`, (value) => {
                    console.log(`vue(${vueProp}) => ng(${ngProp}) =`, value);
                    scope.$apply(()=>_set(scope, ngProp, value));
                }));
            }
        }
    };

    function loadExposedProperties(attrs) {

        const vDirectives = /^(?:v-model|v-html|v-text|v-show|v-class|v-attr|v-style|v-if)(?:\.[a-z0-9]+)*$/i;
        const vBind       = /^(?:v-bind)?:[a-z\-]+(\.[a-z]+)*$/i;
        const vBindValue  = /^[a-z\$_][a-z0-9\$_]*(\.[a-z\$_][a-z0-9\$_]*)*$/i;

        const properties = (attrs.vueExpose??"").split(',').map(o => o.trim()).filter(o => vBindValue.test(o) );

        // autodetect simple binding on props detect 

        const attributes = remapAttributes(attrs);

        for(const name in attributes) {
            const value = attributes[name];

            const validName =  vBind      .test(name)
                            || vDirectives.test(name);

            if(validName && vBindValue.test(value)) {
                properties.push(value);
            }
        }

        // Add parent properties

        var i = properties.length;

        while(i--) {

            var path = parentPath(properties[i])

            while(path) {
                properties.push(path);
                path = parentPath(path)
            }
        }

        return _uniq(properties);
    }

    function loadSyncedPropertiesMapping(attrs) {

        // autodetect simple binding on props detect 

        const vModel      = /^(?:v-model)$/i;
        const vBind       = /^(?:v-bind)?:([a-z\-]+)\.sync*$/i;
        const vBindValue  = /^[a-z\$_][a-z0-9\$_]*(\.[a-z\$_][a-z0-9\$_]*)*$/i;

        const mapping = {};
        const attributes = remapAttributes(attrs);

        for(const name in attributes) {
            const value = attributes[name];

            if(vModel.test(name)) {

                const vueProp = 'value';

                if(!vBindValue.test(value)) 
                    throw Error(`Unsupported v-model binding value: ${value}`);

                    mapping[vueProp] = value;
            }

            if(vBind.test(name)) {

                const vueProp = name.replace(vBind, "$1") // Keep only property name
                                    .replace(/-[a-z]/g, (m)=>m[1].toUpperCase()).replace(/^[A-Z]/, (m)=>m[1].toLowerCase()) // convert to camel-case

                if(!vBindValue.test(value)) 
                    throw Error(`Unsupported v-bind:${vueProp}.sync binding value: ${value}`);

                    mapping[vueProp] = value;
            }
        }

        return mapping;
    }            

    function loadExposedDelegates(attrs) {

        const ngVueDeclaredRe = /^&([a-z\$_][a-z0-9\$_]*)$/i;
        const ngDelegates     = (attrs.vueExpose??"")
            .split(',')
            .map(o=>o.trim())
            .filter(o=>ngVueDeclaredRe.test(o))
            .map(o=>o.replace(ngVueDeclaredRe,"$1"));

        // autodetect simple delegate call with empty ()
        // eg: call_function()

        const vOnRe         = /^(?:v-on:|@)[a-z\-]+(\:[a-z0-9-]+)?(\.[a-z0-9-]+)*/i;
        const vOnDelegateRe = /^([a-z_$][a-z0-9_$]*)(?:\(\))?$/i;

        for(var key in attrs.$attr) {
            const name  = attrs.$attr[key];
            const value = attrs[key];

            const validName = vOnRe.test(name)

            if(validName && vOnDelegateRe.test(value)) {
                ngDelegates.push(value.replace(vOnDelegateRe, "$1"));
            }
        }

        return ngDelegates;
    }

    function parentPath(path) {
        const parts = path.split('.');
        parts.pop();
        return parts.join('.');
    }

    function leafPath(path) {
        const parts = path.split('.');
        return parts.pop();
    }

    function isRootPath(path) {
        const parts = path.split('.');
        return parts.length==1;
    }

    function remapAttributes(attrs) {

        const attributes = {}

        for(var key in attrs.$attr) {
            const name  = attrs.$attr[key];
            const value = attrs[key];


            attributes[name] = value;
        }

        return attributes;

    }

    function testDefined(scope, expression) {
        if(scope.$eval(expression)===undefined) {
            throw Error(`"${expression}" is not defined on parent scope`);
        }
    }

}]