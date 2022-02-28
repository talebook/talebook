define(['text!viewer-version', 'Readium'], function(versionTxt, Readium){
	var version = JSON.parse(versionTxt);

	var PackagedVersioning = {
		getVersioningInfo : function(callback){
			var versionInfo = {};
			var readiumVersion = Readium.version;
            versionInfo.viewer = version
            versionInfo.readiumJs = readiumVersion.readiumJs;
            versionInfo.readiumSharedJs = readiumVersion.readiumSharedJs
			callback(versionInfo);
		}

	}
	return PackagedVersioning;
});