require(['jquery', 'EpubReader'], function($, EpubReader){
	var getQueryParamData = function(){
        var query = window.location.search;
        if (query && query.length){
            query = query.substring(1);
        }
        data = {};
        if (query.length){
            var keyParams = query.split('&');
            for (var x = 0; x < keyParams.length; x++)
            {
                var keyVal = keyParams[x].split('=');
                if(keyVal.length > 1){
                    data[keyVal[0]] = keyVal[1];
                }
                
            }

        }
        return data;
    }

    $(function(){
    	//var epubUrl = getQueryParamData();
    	//EpubReader.loadUI(data);
    });
});
