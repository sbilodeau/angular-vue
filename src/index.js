import angular from "angular";
import vueDirective from "./directives/vue";

var ngModule = angular.module("angularVue",[]);

vueDirective.register(ngModule);
