define(['jath'], function(Jath){
	Jath.resolver = function( prefix ) {
            var mappings = { 
                def: "http://www.idpf.org/2007/opf",
                    dc: "http://purl.org/dc/elements/1.1/"
            };
            return mappings[ prefix ];
    }

	var jathTemplate = {

        metadata:  { 
                id: "//def:metadata/dc:identifier",
                epub_version: "//def:package/@version",
                title: "//def:metadata/dc:title",
                author: "//def:metadata/dc:creator",
                publisher: "//def:metadata/dc:publisher",
                description: "//def:metadata/dc:description",
                rights: "//def:metadata/dc:rights",
                language: "//def:metadata/dc:language",
                pubdate: "//def:metadata/dc:date",
                modified_date: "//def:metadata/def:meta[@property='dcterms:modified']",
                layout: "//def:metadata/def:meta[@property='rendition:layout']",
                spread: "//def:metadata/def:meta[@property='rendition:spread']",
                orientation: "//def:metadata/def:meta[@property='rendition:orientation']",
                ncx: "//def:spine/@toc",
                page_prog_dir: "//def:spine/@page-progression-direction",
                active_class: "//def:metadata/def:meta[@property='media:active-class']"
         },

        manifest: [ "//def:item", { 
                id: "@id",
                href: "@href",
                media_type: "@media-type",
                properties: "@properties",
        media_overlay: "@media-overlay"
        } ],
                                                 
        spine: [ "//def:itemref", { idref: "@idref", properties: "@properties", linear: "@linear" } ],

        bindings: ["//def:bindings/def:mediaType", { 
                handler: "@handler",
                media_type: "@media-type"
        } ]
        
	};

	PackageParser = {
		parsePackageDom : function(data){
            var jsonObj = Jath.parse(jathTemplate, data);
            jsonObj = jsonObj.metadata;
            jsonObj.coverHref = PackageParser.getCoverHref(data);
            return jsonObj;
        },
        getCoverHref : function(dom) {
            var manifest; var $imageNode;
            manifest = dom.getElementsByTagName('manifest')[0];

            // epub3 spec for a cover image is like this:
            /*<item properties="cover-image" id="ci" href="cover.svg" media-type="image/svg+xml" />*/
            $imageNode = $('item[properties~="cover-image"]', manifest);
            if($imageNode.length === 1 && $imageNode.attr("href") ) {
                return $imageNode.attr("href");
            }

            // some epub2's cover image is like this:
            /*<meta name="cover" content="cover-image-item-id" />*/
            // PragProg ebooks have two cover entries in meta, both
            // referencing the same cover id from items; metaNode.length
            // does not have to be just 1
            var metaNode = $('meta[name="cover"]', dom);
            var contentAttr = metaNode.attr("content");
            if(metaNode.length >= 1 && contentAttr) {
                $imageNode = $('item[id="'+contentAttr+'"]', manifest);
                if($imageNode.length === 1 && $imageNode.attr("href")) {
                    return $imageNode.attr("href");
                }
            }

            // that didn't seem to work so, it think epub2 just uses item with id=cover
            $imageNode = $('#cover', manifest);
            if($imageNode.length === 1 && $imageNode.attr("href")) {
                return $imageNode.attr("href");
            }

            // seems like there isn't one, thats ok...
            return null;
        },
	}
	return PackageParser;
})