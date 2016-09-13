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


require.config({
    //xhtml: true, //document.createElementNS()
    /* http://requirejs.org/docs/api.html#config-waitSeconds */
    waitSeconds: 0,
    baseUrl: base_url,
    paths: {
        'keymaster': 'thirdparty/keymaster',
        'screenfull': 'thirdparty/screenfull',
        'console_shim': 'thirdparty/console_shim',
        'text': 'thirdparty/text/text',
        'hgn': 'thirdparty/hgn',
        'hogan': 'thirdparty/hogan',
        'jath' : 'thirdparty/jath.min',
        'jquery': 'thirdparty/jquery-1.11.0',
        'spin' : 'thirdparty/spin.min',
        'underscore': 'thirdparty/underscore-1.4.4',
        'backbone': 'thirdparty/backbone-0.9.10',
        'bootstrap': 'thirdparty/bootstrap.min',
        'URIjs': 'thirdparty/URIjs/URI',
        'punycode': 'thirdparty/URIjs/punycode',
        'SecondLevelDomains': 'thirdparty/URIjs/SecondLevelDomains',
        'IPv6': 'thirdparty/URIjs/IPv6',
        'remotestorage' : 'thirdparty/remotestorage',
        'jquery_hammer' : 'thirdparty/jquery.hammer',
        'hammer' : 'thirdparty/hammer',
        'Readium': 'Readium',
        'inflate' : 'thirdparty/inflate',
        'zip' : 'thirdparty/zip',
        'zip-fs' : 'thirdparty/zip-fs',
        'zip-ext' : 'thirdparty/zip-ext',
        'crypto-sha1' : 'thirdparty/crypto-sha1',
        'i18n': '../i18n',
        'templates': '../templates',
        'storage/StorageManager' : 'storage/StaticStorageManager',
        'versioning/Versioning' : 'versioning/UnpackagedVersioning',
        'encryptionHandler': '../readium-js/epub-modules/epub-fetch/src/models/encryption_handler'
    },
    hgn : {
        templateExtension : ""
    },
    config : {
        'storage/EpubUnzipper' : {'workerScriptsPath' : '/lib/thirdparty/'},
        'workers/WorkerProxy' : {'workerUrl' : '/scripts/readium-worker.js'}
    },
    shim: {
        screenfull : {
            exports: 'screenfull'
        },
        keymaster : {
            exports: 'key'
        },
        zip : {
            exports: 'zip'
        },
        'zip-fs' : {
            deps: ['zip'],
            exports: 'zip-fs'
        },
        'zip-ext' : {
            deps: ['zip-fs'],
            exports: 'zip-ext'
        },
        underscore: {
            exports: '_'
        },
        jath : {
            exports: 'Jath'
        },
        spin : {
            exports: 'Spinner'
        },
        backbone: {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },

        bootstrap: {
            deps: ['jquery'],
            exports: 'bootstrap'
        },

        Readium: {
            deps: ['backbone', 'zip-ext', 'crypto-sha1'],
            exports:'Readium'
        }
    }
});
