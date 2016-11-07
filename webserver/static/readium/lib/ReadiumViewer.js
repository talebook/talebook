require(['jquery', 'EpubLibrary', 'EpubReader'], function($, EpubLibrary, EpubReader){
	
	var getEpubQueryParam = function(){
        var query = window.location.search;
        if (query && query.length){
            query = query.substring(1);
        }
        if (query.length){
            var keyParams = query.split('&');
            for (var x = 0; x < keyParams.length; x++)
            {
                var keyVal = keyParams[x].split('=');
                if (keyVal[0] == 'epub' && keyVal.length == 2){
                    return keyVal[1];
                }
            }

        }
        return null;
    }

	var initialLoad = function(){
		var epubUrl = getEpubQueryParam();
		if (epubUrl){
			EpubReader.loadUI({epub: decodeURIComponent(epubUrl)});
		}
		else{
			EpubLibrary.loadUI();
		}

		$(document.body).on('click', function()
        {
            $(document.body).removeClass("keyboard");
        });

		$(document).on('keyup', function(e)
        {
            $(document.body).addClass("keyboard");
        });
	}

	$(initialLoad);
	
	var pushState = $.noop;
	if (window.history && window.history.pushState){
		$(window).on('popstate', function(){
			var state = history.state;
			if (state && state.epub){
				readerView(state.epub);
			}
			else{
				libraryView();
			}
		});
		pushState = function(data, title, url){
			history.pushState(data, title, url);
		};
	}


	var tooltipSelector = 'nav *[title]';
	var libraryView = function(){
		$(tooltipSelector).tooltip('destroy');
		EpubReader.unloadUI();
		EpubLibrary.loadUI();
	}

	var readerView = function(url){
		$(tooltipSelector).tooltip('destroy');
		EpubLibrary.unloadUI();
		EpubReader.loadUI({epub: url});
	}

	$(window).on('readepub', function(e, url){
		readerView(url);
		pushState({epub: url}, "Readium Viewer", '?epub=' + encodeURIComponent(url));
	});

	$(window).on('loadlibrary', function(e){
		libraryView();
		pushState(null, "Readium Library", 'index.html');
	});

	$(document.body).tooltip({
		selector : tooltipSelector,
		placement: 'auto',
		container: 'body' // do this to prevent weird navbar re-sizing issue when the tooltip is inserted 
	}).on('show.bs.tooltip', function(e){
		$(tooltipSelector).not(e.target).tooltip('destroy');
	});

});