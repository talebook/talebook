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

define(['jquery','jquery_hammer','hammer'], function($,jqueryHammer,Hammer) {

    var gesturesHandler = function(reader, viewport){

        var onSwipeLeft = function(){
            reader.openPageRight();
        };

        var onSwipeRight = function(){
            reader.openPageLeft();
        };

        var isGestureHandled = function() {
            var viewType = reader.getCurrentViewType();

            return viewType === ReadiumSDK.Views.ReaderView.VIEW_TYPE_FIXED || viewType == ReadiumSDK.Views.ReaderView.VIEW_TYPE_COLUMNIZED;
        };

        this.initialize= function(){

            reader.on(ReadiumSDK.Events.CONTENT_DOCUMENT_LOADED, function(iframe,s) {
                //set hammer's document root
                Hammer.DOCUMENT = iframe.contents();
                //hammer's internal touch events need to be redefined? (doesn't work without)
                Hammer.event.onTouch(Hammer.DOCUMENT, Hammer.EVENT_MOVE, Hammer.detection.detect);
                Hammer.event.onTouch(Hammer.DOCUMENT, Hammer.EVENT_END, Hammer.detection.detect);

                //set up the hammer gesture events
                //swiping handlers
                var swipingOptions = {prevent_mouseevents: true};
                Hammer(Hammer.DOCUMENT,swipingOptions).on("swipeleft", function() {
                    onSwipeLeft();
                });
                Hammer(Hammer.DOCUMENT,swipingOptions).on("swiperight", function() {
                    onSwipeRight();
                });

                //remove stupid ipad safari elastic scrolling
                //TODO: test this with reader ScrollView and FixedView
                $(Hammer.DOCUMENT).on(
                    'touchmove',
                    function(e) {
                        //hack: check if we are not dealing with a scrollview
                        if(isGestureHandled()){
                            e.preventDefault();
                        }
                    }
                );
            });

            //remove stupid ipad safari elastic scrolling (improves UX for gestures)
            //TODO: test this with reader ScrollView and FixedView
            $(viewport).on(
                'touchmove',
                function(e) {
                    if(isGestureHandled()) {
                        e.preventDefault();
                    }
                }
            );

            //handlers on viewport
            $(viewport).hammer().on("swipeleft", function() {
                onSwipeLeft();
            });
            $(viewport).hammer().on("swiperight", function() {
                onSwipeRight();
            });
        };

    };
    return gesturesHandler;
});