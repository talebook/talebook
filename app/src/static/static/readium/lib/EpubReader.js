
define(['module','jquery', 'bootstrap', 'URIjs', 'Readium', 'Spinner', 'storage/Settings', 'i18n/Strings', 'Dialogs', 'ReaderSettingsDialog', 
        'hgn!templates/about-dialog.html', 'hgn!templates/reader-navbar.html', 'hgn!templates/reader-body.html', 'hgn!templates/reader-body-page-btns.html',
        'analytics/Analytics', 'screenfull', 'Keyboard', 'EpubReaderMediaOverlays', 'EpubReaderBackgroundAudioTrack', 'gestures', 'versioning/Versioning'],
        function (module, $, bootstrap, URI, Readium, spinner, Settings, Strings, Dialogs, SettingsDialog,
                  AboutDialog, ReaderNavbar, ReaderBody, ReaderBodyPageButtons,
                  Analytics, screenfull, Keyboard, EpubReaderMediaOverlays, EpubReaderBackgroundAudioTrack, GesturesHandler, Versioning) {

    var readium, 
        embedded,
        url,
        el = document.documentElement,
        currentDocument,
        gesturesHandler;

    // This function will retrieve a package document and load an EPUB
    var loadEbook = function (packageDocumentURL, readerSettings, openPageRequest) {
        
        readium.openPackageDocument(packageDocumentURL, function(packageDocument, options){
            currentDocument = packageDocument;
            currentDocument.generateTocListDOM(function(dom){
                loadToc(dom)
            });

            wasFixed = readium.reader.isCurrentViewFixedLayout();
            var metadata = options.metadata;

            $('<h2 class="book-title-header"></h2>').appendTo('.navbar').text(metadata.title);

        
            $("#left-page-btn").unbind("click");
            $("#right-page-btn").unbind("click");
            var $pageBtnsContainer = $('#readium-page-btns');
            $pageBtnsContainer.empty();
            var rtl = currentDocument.getPageProgressionDirection() === "rtl"; //_package.spine.isLeftToRight()
            $pageBtnsContainer.append(ReaderBodyPageButtons({strings: Strings, dialogs: Dialogs, keyboard: Keyboard,
                pageProgressionDirectionIsRTL: rtl
            }));
            $("#left-page-btn").on("click", prevPage);
            $("#right-page-btn").on("click", nextPage);

        }, openPageRequest);
    };

    var spin = function()
    {
//console.error("do SPIN: -- WILL: " + spinner.willSpin + " IS:" + spinner.isSpinning + " STOP REQ:" + spinner.stopRequested);
        if (spinner.willSpin || spinner.isSpinning) return;
        
        spinner.willSpin = true;
        
        setTimeout(function()
        {
            if (spinner.stopRequested)
            {
//console.debug("STOP REQUEST: -- WILL: " + spinner.willSpin + " IS:" + spinner.isSpinning + " STOP REQ:" + spinner.stopRequested);
                spinner.willSpin = false;
                spinner.stopRequested = false;
                return;
            }
//console.debug("SPIN: -- WILL: " + spinner.willSpin + " IS:" + spinner.isSpinning + " STOP REQ:" + spinner.stopRequested);
            spinner.isSpinning = true;
            spinner.spin($('#reading-area')[0]);
            
            spinner.willSpin = false;
            
        }, 100);
    };

    var tocShowHideToggle = function(){
        
        $(document.body).removeClass('hide-ui');
        
        var $appContainer = $('#app-container'),
            hide = $appContainer.hasClass('toc-visible');
        var bookmark;
        if (readium.reader.handleViewportResize && !embedded){
            bookmark = JSON.parse(readium.reader.bookmarkCurrentPage());
        }

        if (hide){
            $appContainer.removeClass('toc-visible');

            setTimeout(function(){ $('#tocButt')[0].focus(); }, 100);
        }
        else{
            $appContainer.addClass('toc-visible');

            setTimeout(function(){ $('#readium-toc-body button.close')[0].focus(); }, 100);
        }

        if(embedded){
            hideLoop(null, true);
        }else if (readium.reader.handleViewportResize){

            readium.reader.handleViewportResize();
            
            setTimeout(function()
            {
                readium.reader.openSpineItemElementCfi(bookmark.idref, bookmark.contentCFI, readium.reader);
            }, 90);
        }
    };

    var showScaleDisplay = function(){
        $('.zoom-wrapper').show();
    }
    var setScaleDisplay = function(){
        var scale = readium.reader.getViewScale();
        $('.zoom-wrapper input').val(Math.round(scale) + "%");
    }

    var hideScaleDisplay = function(){
        $('.zoom-wrapper').hide();
    }

    var loadToc = function(dom){
        $('script', dom).remove();

        var tocNav;

        var $navs = $('nav', dom);
        Array.prototype.every.call($navs, function(nav){
            if (nav.getAttributeNS('http://www.idpf.org/2007/ops', 'type') == 'toc'){
                tocNav = nav;
                return false;
            }
            return true;
        });

        var isRTL = false;
        var pparent = tocNav;

        while (pparent && pparent.getAttributeNS)
        {
            var dir = pparent.getAttributeNS("http://www.w3.org/1999/xhtml", "dir") || pparent.getAttribute("dir");

            if (dir && dir === "rtl")
            {
                isRTL = true;
                break;
            }
            pparent = pparent.parentNode;
        }
        
        var toc = (tocNav && $(tocNav).html()) || $('body', dom).html() || $(dom).html();
        var tocUrl = currentDocument.getToc();

        if (toc && toc.length)
        {
            var $toc = $(toc);
            if (false) // button wrap, force-enables tab navigation in Safari (links nav is disabled by default on OSX)
            {
                // $('a', $toc).each(function(index)
                // {
                //     $(this).wrap(function()
                //     {
                //         var $that = $(this);
                //         $that.attr("tabindex", "-1");
                //         $that.attr("aria-hidden", "true");
                //         var href = $that.attr("href");
                //         var title = $that.attr("title");
                //         var text = $that[0].textContent; //.innerText (CSS display sensitive + script + style tags)
                //         var label = text + ((title && title.length) ? " *** " + title : "") + " --- " + href;
                //         return "<button tabindex='60' style='border:0;background:none;padding:0;margin:0;' role='link' aria-label='"+label+"' title='"+label+"'></button>";
                //     });
                // });
                //
                // //toc = $(toc).html();
                // //$('#readium-toc-body').html(toc);
                // $('#readium-toc-body').append($toc);
                //
                // $('#readium-toc-body').on('click', 'button', function(e)
                // {
                //     $("a", $(this)).trigger("click");
                //     return false;
                // });
            }
            else
            {
                //$('#readium-toc-body').html(toc);
                $('#readium-toc-body').append($toc);
            }

            if (isRTL)
            {
                $toc[0].setAttributeNS("http://www.w3.org/1999/xhtml", "dir", "rtl");
                $toc[0].style.direction = "rtl"; // The CSS stylesheet property does not trigger :(
            }
        }

        var _tocLinkActivated = false;
        
        var lastIframe = undefined,
            wasFixed;

        readium.reader.on(ReadiumSDK.Events.FXL_VIEW_RESIZED, setScaleDisplay);
        readium.reader.on(ReadiumSDK.Events.CONTENT_DOCUMENT_LOADED, function ($iframe, spineItem)
        {
            
            var isFixed = readium.reader.isCurrentViewFixedLayout();

            // TODO: fix the pan-zoom feature!
            if (isFixed){
                showScaleDisplay();
            }
            else{
                hideScaleDisplay();
            }

            //TODO not picked-up by all screen readers, so for now this short description will suffice
            $iframe.attr("title", "EPUB");
            $iframe.attr("aria-label", "EPUB");
            
            lastIframe = $iframe[0];
        });
        
        readium.reader.on(ReadiumSDK.Events.PAGINATION_CHANGED, function (pageChangeData)
        {
            savePlace();
            updateUI(pageChangeData);
            

            if (spinner.isSpinning)
            {
//console.debug("!! SPIN: -- WILL: " + spinner.willSpin + " IS:" + spinner.isSpinning + " STOP REQ:" + spinner.stopRequested);
                spinner.stop();
                spinner.isSpinning = false;
            }
            else if (spinner.willSpin)
            {
//console.debug("!! SPIN REQ: -- WILL: " + spinner.willSpin + " IS:" + spinner.isSpinning + " STOP REQ:" + spinner.stopRequested);
                spinner.stopRequested = true;
            }
            
            if (!_tocLinkActivated) return;
            _tocLinkActivated = false;
            
            try
            {
                var iframe = undefined;
                var element = undefined;
                
                var id = pageChangeData.elementId;
                if (!id)
                {
                    var bookmark = JSON.parse(readium.reader.bookmarkCurrentPage());

                    //bookmark.idref; //manifest item
                    if (pageChangeData.spineItem)
                    {
                        element = readium.reader.getElementByCfi(pageChangeData.spineItem, bookmark.contentCFI,
                            ["cfi-marker", "mo-cfi-highlight"],
                            [],
                            ["MathJax_Message"]);
                        element = element[0];
                        
                        if (element)
                        {
                            iframe = $("#epub-reader-frame iframe")[0];
                            var doc = ( iframe.contentWindow || iframe.contentDocument ).document;
                            if (element.ownerDocument !== doc)
                            {
                                iframe = $("#epub-reader-frame iframe")[1];
                                if (iframe)
                                {
                                    doc = ( iframe.contentWindow || iframe.contentDocument ).document;
                                    if (element.ownerDocument !== doc)
                                    {
                                        iframe = undefined;
                                    }
                                }
                            }
                        }
                    }
                }
                else
                {
                    iframe = $("#epub-reader-frame iframe")[0];
                    var doc = ( iframe.contentWindow || iframe.contentDocument ).document;
                    element = doc.getElementById(id);
                    if (!element)
                    {
                        iframe = $("#epub-reader-frame iframe")[1];
                        if (iframe)
                        {
                            doc = ( iframe.contentWindow || iframe.contentDocument ).document;
                            element = doc.getElementById(id);
                            if (!element)
                            {
                                iframe = undefined;
                            }
                        }
                    }
                }

                if (!iframe)
                {
                    iframe = lastIframe;
                }
                
                if (iframe)
                {
                    //var doc = ( iframe.contentWindow || iframe.contentDocument ).document;
                    var toFocus = iframe; //doc.body
                    setTimeout(function(){ toFocus.focus(); }, 50);
                }
            }
            catch (e)
            {
                //
            }
        });

        $('#readium-toc-body').on('click', 'a', function(e)
        {
            spin();
            
            var href = $(this).attr('href');
            href = tocUrl ? new URI(href).absoluteTo(tocUrl).toString() : href; 

            _tocLinkActivated = true;

            readium.reader.openContentUrl(href);
        
            if (embedded){
                $('.toc-visible').removeClass('toc-visible');
                $(document.body).removeClass('hide-ui');
            }
            return false;
        });
        $('#readium-toc-body').prepend('<button tabindex="50" type="button" class="close" data-dismiss="modal" aria-label="'+Strings.i18n_close+' '+Strings.toc+'" title="'+Strings.i18n_close+' '+Strings.toc+'"><span aria-hidden="true">&times;</span></button>');
        $('#readium-toc-body button.close').on('click', function(){
            tocShowHideToggle();
            /*
            var bookmark = JSON.parse(readium.reader.bookmarkCurrentPage());
            $('#app-container').removeClass('toc-visible');
            if (embedded){
                $(document.body).removeClass('hide-ui');
            }else if (readium.reader.handleViewportResize){
                readium.reader.handleViewportResize();
                readium.reader.openSpineItemElementCfi(bookmark.idref, bookmark.contentCFI, readium.reader);
            }
            */
            return false;
        })
    }

    var toggleFullScreen = function(){
        
        if (!screenfull.enabled) return;

        screenfull.toggle();
    }

    screenfull.onchange = function(e){
        var titleText;

        if (screenfull.isFullscreen)
        {
            titleText = Strings.exit_fullscreen+ ' [' + Keyboard.FullScreenToggle + ']';
            $('#buttFullScreenToggle span').removeClass('glyphicon-resize-full');
            $('#buttFullScreenToggle span').addClass('glyphicon-resize-small');
            $('#buttFullScreenToggle').attr('aria-label', titleText);
            $('#buttFullScreenToggle').attr('title', titleText);
        }
        else
        {
            titleText = Strings.enter_fullscreen + ' [' + Keyboard.FullScreenToggle + ']';
            $('#buttFullScreenToggle span').removeClass('glyphicon-resize-small');
            $('#buttFullScreenToggle span').addClass('glyphicon-resize-full'); 
            $('#buttFullScreenToggle').attr('aria-label', titleText);
            $('#buttFullScreenToggle').attr('title', titleText);
        }
    }

    var hideUI = function(){
        hideTimeoutId = null;
        // don't hide it toolbar while toc open in non-embedded mode
        if (!embedded && $('#app-container').hasClass('toc-visible')){
            return;
        }
        
        var navBar = document.getElementById("app-navbar");
        if (document.activeElement) {
            var within = jQuery.contains(navBar, document.activeElement);
            if (within) return;
        }
        
        var $navBar = $(navBar);
        // BROEKN! $navBar.is(':hover')
        var isMouseOver = $navBar.find(':hover').length > 0;
        if (isMouseOver) return;
        
        if ($('#audioplayer').hasClass('expanded-audio')) return;

        $(document.body).addClass('hide-ui');
    }

    var hideTimeoutId;

    var hideLoop = function(e, immediate){

        // if (!embedded){
        //     return;
        // }
        if (hideTimeoutId){
            window.clearTimeout(hideTimeoutId);
            hideTimeoutId = null;
        }
        if (!$('#app-container').hasClass('toc-visible') && $(document.body).hasClass('hide-ui')){
            $(document.body).removeClass('hide-ui');
        }
        if (immediate){
            hideUI();
        }
        else{
            hideTimeoutId = window.setTimeout(hideUI, 4000);
        }
    }

    //TODO: also update "previous/next page" commands status (disabled/enabled), not just button visibility.
    // https://github.com/readium/readium-js-viewer/issues/188
    // See onSwipeLeft() onSwipeRight() in gesturesHandler.
    // See nextPage() prevPage() in this class.
    var updateUI = function(pageChangeData){
        if(pageChangeData.paginationInfo.canGoLeft())
            $("#left-page-btn").show();
        else
            $("#left-page-btn").hide();
        if(pageChangeData.paginationInfo.canGoRight())
            $("#right-page-btn").show();
        else
            $("#right-page-btn").hide();
    }
    
    var savePlace = function(){
        Settings.put(url, readium.reader.bookmarkCurrentPage(), $.noop);
    }

    var nextPage = function () {

        readium.reader.openPageRight();
        return false;
    };

    var prevPage = function () {

        readium.reader.openPageLeft();
        return false;
    };

    var installReaderEventHandlers = function(){
        
        // Set handlers for click events
        $(".icon-annotations").on("click", function () {
            readium.reader.addSelectionHighlight(Math.floor((Math.random()*1000000)), "highlight");
        });

        var isWithinForbiddenNavKeysArea = function()
        {
            return document.activeElement &&
            (
                document.activeElement === document.getElementById('volume-range-slider')
                || document.activeElement === document.getElementById('time-range-slider')
                || document.activeElement === document.getElementById('rate-range-slider')
                || jQuery.contains(document.getElementById("mo-sync-form"), document.activeElement)
                || jQuery.contains(document.getElementById("mo-highlighters"), document.activeElement)
                
                // jQuery.contains(document.getElementById("app-navbar"), document.activeElement)
                // || jQuery.contains(document.getElementById("settings-dialog"), document.activeElement)
                // || jQuery.contains(document.getElementById("about-dialog"), document.activeElement)
            )
            ;
        };

        var hideTB = function(){
            if (!embedded && $('#app-container').hasClass('toc-visible')){
                return;
            }
            $(document.body).addClass('hide-ui');
            if (document.activeElement) document.activeElement.blur();
        };
        $("#buttHideToolBar").on("click", hideTB);
        Keyboard.on(Keyboard.ToolbarHide, 'reader', hideTB);

        var showTB = function(){
            $("#aboutButt1")[0].focus();
            $(document.body).removeClass('hide-ui');
            setTimeout(function(){ $("#aboutButt1")[0].focus(); }, 50);
        };
        $("#buttShowToolBar").on("click", showTB);
        Keyboard.on(Keyboard.ToolbarShow, 'reader', showTB);

        Keyboard.on(Keyboard.PagePrevious, 'reader', function(){
            if (!isWithinForbiddenNavKeysArea()) prevPage();
        });
        
        Keyboard.on(Keyboard.PagePreviousAlt, 'reader', prevPage);
        
        Keyboard.on(Keyboard.PageNextAlt, 'reader', nextPage);
        
        Keyboard.on(Keyboard.PageNext, 'reader', function(){
            if (!isWithinForbiddenNavKeysArea()) nextPage();
        });
        
        Keyboard.on(Keyboard.FullScreenToggle, 'reader', toggleFullScreen);
        
        $('#buttFullScreenToggle').on('click', toggleFullScreen);

        var loadlibrary = function()
        {
            $("html").attr("data-theme", "library");
            
            $(window).trigger('loadlibrary');
        };

        Keyboard.on(Keyboard.SwitchToLibrary, 'reader', loadlibrary /* function(){setTimeout(, 30);} */ );
        
        $('.icon-library').on('click', function(){
            loadlibrary();
            return false;
        });

        $('.zoom-wrapper input').on('click', function(){
            if (!this.disabled){
                this.focus();
                return false;
            }
        });

        Keyboard.on(Keyboard.TocShowHideToggle, 'reader', function()
        {
            var visible = $('#app-container').hasClass('toc-visible');
            if (!visible)
            {
                tocShowHideToggle();
            }
            else
            {
                setTimeout(function(){ $('#readium-toc-body button.close')[0].focus(); }, 100);
            }
        });
        
        $('.icon-toc').on('click', tocShowHideToggle);

        var setTocSize = function(){
            var appHeight = $(document.body).height() - $('#app-container')[0].offsetTop;
            $('#app-container').height(appHeight);
            $('#readium-toc-body').height(appHeight);
        };

        Keyboard.on(Keyboard.ShowSettingsModal, 'reader', function(){$('#settings-dialog').modal("show")});

        $(window).on('mousemove', hideLoop);
        $(window).on('resize', setTocSize);
        setTocSize();
        hideLoop();

        // captures all clicks on the document on the capture phase. Not sure if it's possible with jquery
        // so I'm using DOM api directly
        document.addEventListener('click', hideLoop, true);
    };

    var setFitScreen = function(e){
        readium.reader.setZoom({style: 'fit-screen'});
        $('.active-zoom').removeClass('active-zoom');
        $('#zoom-fit-screen').addClass('active-zoom');
        $('.zoom-wrapper input').prop('disabled', true);
        $('.zoom-wrapper>a').dropdown('toggle');
        return false;
    }

    var setFitWidth = function(e){
        readium.reader.setZoom({style: 'fit-width'});
        $('.active-zoom').removeClass('active-zoom');
        $('#zoom-fit-width').addClass('active-zoom');
        $('.zoom-wrapper input').prop('disabled', true);
         $('.zoom-wrapper>a').dropdown('toggle');
        return false;
    }

    var enableCustom = function(e){
        $('.zoom-wrapper input').prop('disabled', false).focus();
        $('.active-zoom').removeClass('active-zoom');
        $('#zoom-custom').addClass('active-zoom');
         $('.zoom-wrapper>a').dropdown('toggle');
        return false;
    }

    var zoomRegex = /^\s*(\d+)%?\s*$/;
    var setCustom = function(e){
        var percent = $('.zoom-wrapper input').val();
        var matches = zoomRegex.exec(percent);
        if (matches){
            var percentVal = Number(matches[1])/100;
            readium.reader.setZoom({style: 'user', scale: percentVal});
        }
        else{
            setScaleDisplay();
        }
    }

    var loadReaderUIPrivate = function(){
        $('.modal-backdrop').remove();
        var $appContainer = $('#app-container');
        $appContainer.empty();
        $appContainer.append(ReaderBody({strings: Strings, dialogs: Dialogs, keyboard: Keyboard}));
        $('nav').empty();
        $('nav').attr("aria-label", Strings.i18n_toolbar);
        $('nav').append(ReaderNavbar({strings: Strings, dialogs: Dialogs, keyboard: Keyboard}));
        installReaderEventHandlers();
        document.title = "Readium";
        $('#zoom-fit-width a').on('click', setFitWidth);
        $('#zoom-fit-screen a').on('click', setFitScreen);
        $('#zoom-custom a').on('click', enableCustom);
        $('.zoom-wrapper input').on('change', setCustom);
        
        spin();
    }
    
    var loadReaderUI = function (data) {
        
        Keyboard.scope('reader');
        
        url = data.epub;
        Analytics.trackView('/reader');
        embedded = data.embedded;

        loadReaderUIPrivate();
        
        //because we reinitialize the reader we have to unsubscribe to all events for the previews reader instance
        if(readium && readium.reader) {
            readium.reader.off();
        }
        
        setTimeout(function()
        {
            initReadium(); //async
        }, 0);
    };

    var initReadium = function(){

        Settings.getMultiple(['reader', url], function(settings){

            var prefix = (self.location && self.location.origin && self.location.pathname) ? (self.location.origin + self.location.pathname + "/..") : "";
            var readerOptions =  {
                el: "#epub-reader-frame", 
                annotationCSSUrl: module.config().annotationCssUrl || (prefix + "/css/annotations.css")
            };

            var readiumOptions = {
                jsLibRoot: module.config().jsLibRoot || './lib/thirdparty/',
                openBookOptions: {}
            };

            if (module.config().useSimpleLoader){
                readiumOptions.useSimpleLoader = true;
            }

            var openPageRequest;
            if (settings[url]){
                var bookmark = JSON.parse(JSON.parse(settings[url]));
                openPageRequest = {idref: bookmark.idref, elementCfi: bookmark.contentCFI};
            }

            readium = new Readium(readiumOptions, readerOptions);

            //setup gestures support with hummer
            gesturesHandler = new GesturesHandler(readium.reader, readerOptions.el);
            gesturesHandler.initialize();

            //epubReadingSystem

            Versioning.getVersioningInfo(function(version){

                $('#app-container').append(AboutDialog({strings: Strings, viewer: version.viewer, readium: version.readiumJs, sharedJs: version.readiumSharedJs}));
                window.navigator.epubReadingSystem.name = "readium-js-viewer";
                window.navigator.epubReadingSystem.version = version.viewer.version;
            })
            

            $(window).on('keyup', function(e)
            {
                if (e.keyCode === 9 || e.which === 9)
                {
                    $(document.body).removeClass('hide-ui');
                }
            });

            readium.reader.addIFrameEventListener('mousemove', function() {
                hideLoop();
            });
            
            readium.reader.addIFrameEventListener('keydown', function(e) {
                Keyboard.dispatch(document.documentElement, e.originalEvent);
            });
            
            readium.reader.addIFrameEventListener('keyup', function(e) {
                Keyboard.dispatch(document.documentElement, e.originalEvent);
            });
            
            readium.reader.addIFrameEventListener('focus', function(e) {
                $(window).trigger("focus");
            });

            SettingsDialog.initDialog(readium.reader);

            $('#settings-dialog').on('hidden.bs.modal', function () {

                Keyboard.scope('reader');

                $(document.body).removeClass('hide-ui');
                setTimeout(function(){ $("#settbutt1").focus(); }, 50);
    
                $("#buttSave").removeAttr("accesskey");
                $("#buttClose").removeAttr("accesskey");
            });
            $('#settings-dialog').on('shown.bs.modal', function () {

                Keyboard.scope('settings');
    
                $("#buttSave").attr("accesskey", Keyboard.accesskeys.SettingsModalSave);
                $("#buttClose").attr("accesskey", Keyboard.accesskeys.SettingsModalClose);
            });


            $('#about-dialog').on('hidden.bs.modal', function () {
                Keyboard.scope('reader');

                $(document.body).removeClass('hide-ui');
                setTimeout(function(){ $("#aboutButt1").focus(); }, 50);
            });
    		$('#about-dialog').on('shown.bs.modal', function(){
                Keyboard.scope('about');
    		});
    
            var readerSettings;
            if (settings.reader){
                readerSettings = JSON.parse(settings.reader);
            }
            if (!embedded){
                readerSettings = readerSettings || SettingsDialog.defaultSettings;
                SettingsDialog.updateReader(readium.reader, readerSettings);
            }
            else{
                readium.reader.updateSettings({
                    syntheticSpread:  "auto",
                    scroll: "auto"
                });
            }
            

            var toggleNightTheme = function(){

                if (!embedded){
            
                    Settings.get('reader', function(json)
                    {
                        if (!json)
                        {
                            json = {};
                        }

                        var isNight = json.theme === "night-theme";
                        json.theme = isNight ? "author-theme" : "night-theme";
                        
                        Settings.put('reader', json);

                        SettingsDialog.updateReader(readium.reader, json);
                    });
                }
            };
            $("#buttNightTheme").on("click", toggleNightTheme);
            Keyboard.on(Keyboard.NightTheme, 'reader', toggleNightTheme);

            readium.reader.on(ReadiumSDK.Events.CONTENT_DOCUMENT_LOAD_START, function($iframe, spineItem) {
                spin();
            });
            
            EpubReaderMediaOverlays.init(readium);
            
            EpubReaderBackgroundAudioTrack.init(readium);
            
            loadEbook(url, readerSettings, openPageRequest);

            readium.reader.on("annotationClicked", function(type, idref, cfi, id) {
                readium.reader.removeHighlight(id);
            });
        });
    }

    var unloadReaderUI = function(){

        // needed only if access keys can potentially be used to open a book while a dialog is opened, because keyboard.scope() is not accounted for with HTML access keys :(
        // for example: settings dialogs is open => SHIFT CTRL [B] access key => library view opens with transparent black overlay!
        Dialogs.closeModal();
        Dialogs.reset();
        $('#settings-dialog').modal('hide');
        $('#about-dialog').modal('hide');
        $('.modal-backdrop').remove();
        
        
        Keyboard.off('reader');
        Keyboard.off('settings');

        $('#settings-dialog').off('hidden.bs.modal');
        $('#settings-dialog').off('shown.bs.modal');

        $('#about-dialog').off('hidden.bs.modal');
        $('#about-dialog').off('shown.bs.modal');

        // visibility check fails because iframe is unloaded
        //if (readium.reader.isMediaOverlayAvailable())
        if (readium && readium.reader) // window.push/popstate
            readium.reader.pauseMediaOverlay();
        
        $(window).off('resize');
        $(window).off('mousemove');
        $(window).off('keyup');
        $(window).off('message');
        window.clearTimeout(hideTimeoutId);
        $(document.body).removeClass('embedded');
        document.removeEventListener('click', hideLoop, true);
        $('.book-title-header').remove();

        $(document.body).removeClass('hide-ui');
    }
    
    var applyKeyboardSettingsAndLoadUi = function(data)
    {
        // override current scheme with user options
        Settings.get('reader', function(json)
        {
           Keyboard.applySettings(json);
           
           loadReaderUI(data);
        });
    };
    
    return {
		loadUI : applyKeyboardSettingsAndLoadUi,
        unloadUI : unloadReaderUI
    };
    
});
