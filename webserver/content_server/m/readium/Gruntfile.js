//  Copyright (c) 2014 Readium Foundation and/or its licensees. All rights reserved.
//  
//  Redistribution and use in source and binary forms, with or without modification, 
//  are permitted provided that the following conditions are met:
//  1. Redistributions of source code must retain the above copyright notice, this 
//  list of conditions and the following disclaimer.
//  2. Redistributions in binary form must reproduce the above copyright notice, 
//  this list of conditions and the following disclaimer in the documentation and/or 
//  other materials provided with the distribution.
//  3. Neither the name of the organization nor the names of its contributors may be 
//  used to endorse or promote products derived from this software without specific 
//  prior written permission.

'use strict';

module.exports = function(grunt) {

    var config = {
        // top-level task options, if needed.
    };
    
    grunt.loadNpmTasks('grunt-express');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-run-grunt');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks('load-grunt-config');
    grunt.loadNpmTasks('grunt-selenium-webdriver');
    grunt.loadNpmTasks('grunt-env');
    grunt.loadNpmTasks('grunt-crx');

    var path = require('path');
    var configs = require('load-grunt-config')(grunt, {
        configPath: path.join(process.cwd(), 'grunt'),
        init: false
        //loadGruntTasks: false
    });
    //grunt.loadTasks('grunt');

    // console.log(JSON.stringify(subConfig));
    // console.log('');
    
    //grunt.util._.extend({}, configs)
    grunt.util._.merge(config, configs);

    // console.log(JSON.stringify(config));
    // console.log('');

    grunt.initConfig(config);
};
