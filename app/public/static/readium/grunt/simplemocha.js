'use strict';

module.exports = function(grunt) {
	return {
		options: {
	      timeout: 180000,
	      ui: 'bdd'
	    },

	    all: { src: ['tests/tests.js'] }
	}
}