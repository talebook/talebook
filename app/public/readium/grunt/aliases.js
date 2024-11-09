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

module.exports = function(grunt) {
    return {
        "default": 'concurrent:serverwatch',

        "runserver": ['express:dev', 'express-keepalive'],

        "update-readium": ['run_grunt:readiumjs', 'copy:readiumjs'],

        "chromeApp": ['clean:chromeApp', 'copy:chromeApp', 'cssmin:chromeApp', 'versioning', 'requirejs:chromeApp', 'requirejs:chromeAppWorker', 'updateChromeManifest'],
        //"chromeAppDevBuild": ['chromeApp', 'copy:chromeAppDevBuild', 'chromeAppDevBuildManifest'],

        "cloudReader": ['clean:cloudReader', 'copy:cloudReader', 'cssmin:cloudReader', 'versioning', 'requirejs:cloudReader'],
        "cloudReaderWithEpub": ['clean:cloudReader', 'copy:cloudReader', 'copy:cloudReaderEpubContent', 'cssmin:cloudReader', 'versioning', 'requirejs:cloudReader'],

        //"test": ['selenium_start', 'chromeApp', 'copy:prepareChromeAppTests', 'nodeunit:chromeApp'],
        "test_chromeApp" : ['chromeApp', 'env:chromeApp', 'simplemocha'],

        "test_firefox" : ['selenium_start', 'cloudReaderWithEpub', 'express:test','env:ff', 'simplemocha'],

        "test" : ['selenium_start', "test_chromeApp"],

        "test_sauce" : ['env:sauce', 'chromeApp', 'crx', 'env:chromeApp', 'simplemocha'],

        "test_travis" : ['cloudReaderWithEpub', 'chromeApp', 'crx', 'express:test', 'simplemocha'],

        "epubReadingSystem": ['epubReadingSystem_readJSON', 'epubReadingSystem_processModules', 'epubReadingSystem_writeJSON']
    };
};
