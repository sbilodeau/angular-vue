import angular from 'angular';
import vueDirective from './directives/vue';

const ngModule = angular.module('angularVue', []);

vueDirective.register(ngModule);
