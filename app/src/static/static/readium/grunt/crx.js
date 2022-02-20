'use strict';

module.exports = function(grunt) {
	return {
		chromeApp : {
			 "src": "build/chrome-app",
      		 "dest": "build/Readium.crx",
      		 privateKey: 'tests/test.pem'
		}
	}
}