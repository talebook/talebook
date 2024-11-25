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
            options: {
                mainConfigFile: './require_config.js',
                include: ['../chrome-app/extended-config', 'ReadiumViewer'],
                name: 'thirdparty/almond',
                baseUrl: './lib/',
                optimize: 'none',
                out: 'build/chrome-app/scripts/readium-all.js',
                paths: {
                    'i18n/Strings': '../chrome-app/i18n/Strings',
                    'storage/StorageManager': '../chrome-app/storage/FileSystemStorage',
                    'storage/Settings': '../chrome-app/storage/ChromeSettings',
                    'analytics/Analytics': '../chrome-app/analytics/ExtensionAnalytics',
                    'google-analytics-bundle': '../chrome-app/analytics/google-analytics-bundle',
                    'versioning/Versioning' : 'versioning/PackagedVersioning',
                    'viewer-version' : '../build/version.json'
                },
                shim: {
                    'google-analytics-bundle': {
                        exports: 'analytics'
                    }
                }
            }
        },
        chromeAppWorker: {
            options: {
                mainConfigFile: './require_config.js',
                include: ['../chrome-app/extended-worker-config','workers/EpubLibraryWriter'],
                name: 'thirdparty/almond',
                baseUrl: './lib/',
                optimize: 'none',
                out: 'build/chrome-app/scripts/readium-worker.js',
                paths: {
                    'i18n/Strings': '../chrome-app/i18n/Strings',
                    'storage/StorageManager': '../chrome-app/storage/FileSystemStorage'
                }
            }
        },
        cloudReader: {
            options: {
                mainConfigFile: './require_config.js',
                include: ['ReadiumViewer'],
                name: 'thirdparty/almond',
                baseUrl: './lib/',
                out: 'build/cloud-reader/scripts/readium-all.js',
                paths: {
                    'versioning/Versioning' : 'versioning/PackagedVersioning',
                    'viewer-version' : '../build/version.json'
                }
            }
        }
    };
};
