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

    return {
        chromeApp: {
            files: [{
                expand: true,
                cwd: 'chrome-app/',
                src: ['icons/*.*', 'index.html', 'background.js', 'extended-config.js', 'manifest.json'],
                dest: 'build/chrome-app'
            }, {
                expand: true,
                cwd: 'chrome-app/',
                src: 'epubReadingSystem.js',
                dest: 'build/chrome-app/scripts'
            }, {
                expand: true,
                src: 'images/**',
                dest: 'build/chrome-app'
            }, {
                expand: true,
                cwd: 'i18n',
                src: '_locales/**',
                dest: 'build/chrome-app'
            }, {
                expand: true,
                cwd: 'lib/thirdparty/',
                src: ['inflate.js', 'deflate.js'],
                dest: 'build/chrome-app'
            }, {
                expand: true,
                cwd: 'css',
                src: 'annotations.css',
                dest: 'build/chrome-app/css'
            }, {
                expand: true,
                src: 'fonts/**',
                dest: 'build/chrome-app'
            }, {
                expand: true,
                cwd: 'lib',
                src: 'mathjax/**',
                dest: 'build/chrome-app/scripts'
            }]
        },
        chromeAppDevBuild: {
            files: [{
                expand: true,
                cwd: 'chrome-app/icons/devBuild/',
                src: ['*.*'],
                dest: 'build/chrome-app/icons/'
                /* , rename: function(dest, src) { return dest + '/' + src } */
            }]
        },
        cloudReader: {
            files: [{
                expand: true,
                cwd: 'chrome-app/',
                src: 'index.html',
                dest: 'build/cloud-reader'
            }, {
                expand: true,
                src: 'images/**',
                dest: 'build/cloud-reader'
            }, {
                expand: true,
                src: 'fonts/**',
                dest: 'build/cloud-reader'
            }, {
                expand: true,
                cwd: 'css',
                src: 'annotations.css',
                dest: 'build/cloud-reader/css'
            }, {
                expand: true,
                cwd: 'lib',
                src: 'mathjax/**',
                dest: 'build/cloud-reader/scripts'
            } ]
        },
        cloudReaderEpubContent: {
            files: [{
                expand: true,
                src: 'epub_content/**/*.*',
                dest: 'build/cloud-reader'
            }]
        },
        readiumjs: {
            files: [{
                expand: true,
                cwd: 'readium-js/out/',
                src: 'Readium.js',
                dest: 'lib'
            }]
        }
        // prepareChromeAppTests: {
        //     files: [{
        //         expand: true,
        //         cwd: 'tests/',
        //         src: 'manifest.json',
        //         dest: 'build/chrome-app'
        //     },
        //     {
        //         expand: true,
        //         cwd: 'tests/',
        //         src: 'tests.js',
        //         dest: 'build/tests/chrome-app'
        //     },
        //     {
        //         expand: true,
        //         cwd: 'tests/test-configs',
        //         src: 'chromeExtension.js',
        //         dest: 'build/tests/chrome-app',
        //         rename: function(dest, src) {
        //           return dest + '/config.js';
        //         }
        //     }]
        // }
    };
};
