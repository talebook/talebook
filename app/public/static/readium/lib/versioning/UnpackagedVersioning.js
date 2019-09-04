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
			$.get('.git/HEAD', function(data){
				var ref = data.substring(5, data.length - 1);
				$.get('.git/' + ref, function(data){
					var sha = data.substring(0, data.length - 1);
					obj.sha = sha;
					if (obj.version){
						callback(versionInfo)
					}
				})
			});
		}
		
	}
	return UnpackagedVersioning;
});