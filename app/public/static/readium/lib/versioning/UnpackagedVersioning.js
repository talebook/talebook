define(['jquery', 'Readium'], function($, Readium){
	var UnpackagedVersioning = {
		getVersioningInfo: function(callback){

			var obj = {
				release: false,
				clean: false,
				devMode: true
			}
			var readiumVersion = Readium.version,
				versionInfo = {};
            versionInfo.viewer = obj;
            versionInfo.readiumJs = readiumVersion.readiumJs;
            versionInfo.readiumSharedJs = readiumVersion.readiumSharedJs;


			$.get('package.json', function(data){
				obj.version = data.version;
				obj.chromeVersion = '2.' + data.version.substring(2);
				
				if (obj.sha){
					callback(versionInfo);
				}
			})
		}
		
	}
	return UnpackagedVersioning;
});
