
// TODO: eliminate this global
RJSDemoApp = {};

require(['require', 'jquery', 'underscore', 'bootstrap', 'Readium'],
    function (require, $, _, bootstrap, Readium) {

        debugger;
    var _readium;

    

    RJSDemoApp.lastAnnotationId = 0;

    RJSDemoApp.currentSpineIndex = -1;

    RJSDemoApp.getInputValue = function (inputId) {
        return $("#" + inputId).val();
    };

    RJSDemoApp.addLibraryList = function ($ulElementContainer, libraryJson) {

        _.each(libraryJson.library_epubs, function (currEpub) {

            var $currLi = $('<li><a id="' + currEpub.url_to_package_doc + '" href="#">' + currEpub.title + '</a></li>');
            $currLi.on("click", function () {
                RJSDemoApp.loadAndRenderEpub(currEpub.url_to_package_doc);
            });
            $ulElementContainer.append($currLi);
        });
    };

    // This function will retrieve a package document and load an EPUB
    RJSDemoApp.loadAndRenderEpub = function (packageDocumentURL) {
        _readium.openPackageDocument(packageDocumentURL);

    };

    // When the document is ready, choose an EPUB to show.
    $(document).ready(function () {

/*
        RJSDemoApp.readium = new Readium(elementToBindReaderTo, packageDocumentURL, jsLibDir, function (epubViewer) {
            RJSDemoApp.epubViewer = epubViewer;
            RJSDemoApp.epubViewer.openBook();

            ReadiumSDK.reader.on(ReadiumSDK.Events.PAGINATION_CHANGED, function (args) {
                var newSpineIndex = args.paginationInfo.openPages[0].spineItemIndex;
                if (newSpineIndex !== RJSDemoApp.currentSpineIndex) {
                    RJSDemoApp.resetAnnotations();
                    RJSDemoApp.currentSpineIndex = newSpineIndex;
                }
                console.log("PAGINATION_CHANGED: Current spine=" + newSpineIndex);
            });


            ReadiumSDK.reader.on("textSelectionEvent", function () {
                console.log("Selection event:"  + arguments);
            });





        }); */
        // Generate the library
        $.getJSON('epub_content/epub_library.json', function (data) {

            $(".show-on-load").hide();
            $("#library-list").html("");
            RJSDemoApp.addLibraryList($("#library-list"), data);
            $(".show-on-load").show();

        }).fail(function (result) {
                console.log("The library could not be loaded");
            });

        _readium = new Readium("#epub-reader-container", './lib/');

        RJSDemoApp.reader = _readium.reader;
        RJSDemoApp.epubViewer = _readium.reader;

        _readium.reader.on(ReadiumSDK.Events.PAGINATION_CHANGED, function() {
            if (RJSDemoApp.currentSpineIndex < 0) {
                console.log("Reader ready!");
                RJSDemoApp.currentSpineIndex = 0;
                RJSDemoApp.reader = _readium.reader;
            } else {
                var args = arguments[0];
                var newSpineIndex = args.paginationInfo.openPages[0].spineItemIndex;
                if (newSpineIndex !== RJSDemoApp.currentSpineIndex) {
                    RJSDemoApp.resetAnnotations();
                    RJSDemoApp.currentSpineIndex = newSpineIndex;
                }
                console.log("PAGINATION_CHANGED: Current spine=" + newSpineIndex);
            }
        });


        _readium.reader.on("annotationClicked", function (type, CFI, annotationId) {
            console.log("Annotation clicked:"  + arguments);
            _readium.reader.removeHighlight(annotationId);
        });


        // These are application specific handlers that wire the HTML to the SimpleReadiumJs module API

        // Set handlers for click events
        $("#previous-page-btn").on("click", function () {
            _readium.reader.openPageLeft();
        });

        $("#next-page-btn").on("click", function () {
            _readium.reader.openPageRight();
        });

        var fontSize = 100;

        $("#increase-font-size-btn").on("click", function () {
            fontSize = fontSize + 10;
            _readium.reader.updateSettings({ "fontSize" : fontSize });
        });

        $("#decrease-font-size-btn").on("click", function () {
            fontSize = fontSize - 10;
            _readium.reader.updateSettings({ "fontSize" : fontSize });
        });

        $("#annotations-highlight").on("click", function () {
            RJSDemoApp.epubViewer.addSelectionHighlight(RJSDemoApp.lastAnnotationId, "highlight");
            RJSDemoApp.lastAnnotationId++;
        });

        $("#annotations-underline").on("click", function () {
            RJSDemoApp.epubViewer.addSelectionHighlight(RJSDemoApp.lastAnnotationId, "underline");
            RJSDemoApp.lastAnnotationId++;
        });

        $("#annotations-image-highlight").on("click", function () {
            RJSDemoApp.epubViewer.addSelectionImageAnnotation(RJSDemoApp.lastAnnotationId, "highlight");
            RJSDemoApp.lastAnnotationId++;
        });






    });

    // When the document is ready, choose an EPUB to show.
    $(document).ready(function () {

        // "epub_content/moby_dick/OPS/package.opf"

        // Load Moby Dick by default
//        RJSDemoApp.loadAndRenderEpub("epub_content/moby_dick/OPS/package.opf");
        RJSDemoApp.loadAndRenderEpub("epub_content/moby_dick");


    });

    RJSDemoApp.resetAnnotations = function() {
        console.log("Resetting annotations");
//        RJSDemoApp.epubViewer.addHighlight("epubcfi(/6/2!/4/2,/3:5,/3:23)",1, "underline");
//        RJSDemoApp.epubViewer.addHighlight("epubcfi(/6/12!/4/2/6,/1:656,/1:669)",2, "highlight");
    };

});
