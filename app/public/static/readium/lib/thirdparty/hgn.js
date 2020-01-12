/**@license
 * RequireJS Hogan Plugin | v0.2.1 (2013/02/08)
 * Author: Miller Medeiros | MIT License
 */
define(['hogan', 'text'], function (hogan, text) {

    var DEFAULT_EXTENSION = '.mustache';

    var _buildMap = {};
    var _buildTemplateText = 'define("{{pluginName}}!{{moduleName}}", ["hogan"], function(hogan){'+
                             '  var tmpl = new hogan.Template({{{fn}}}, "", hogan);'+
                             // need to use apply to bind the proper scope.
                             '  function render(){ return tmpl.render.apply(tmpl, arguments); } render.template = tmpl; return render;'+
                             '});\n';
    var _buildTemplate;


    function load(name, req, onLoad, config){
        var hgnConfig = config.hgn || {};
        var fileName = name;
        fileName += hgnConfig && hgnConfig.templateExtension != null? hgnConfig.templateExtension : DEFAULT_EXTENSION;

        // load text files with text plugin
        text.get(req.toUrl(fileName), function(data){
            var compilationOptions = hgnConfig.compilationOptions? mixIn({}, hgnConfig.compilationOptions) : {};

            if (config.isBuild) {
                // store compiled function if build
                // and should always be a string
                compilationOptions.asString = true;
                _buildMap[name] = hogan.compile(data, compilationOptions);
            }

            // maybe it's required by some other plugin during build
            // so return the compiled template even during build
            var template = hogan.compile(data, compilationOptions);
            var render = bind(template.render, template);
            // add text property for debugging if needed.
            // it's important to notice that this value won't be available
            // after build.
            render.text = template.text;
            render.template = template;
            // return just the render method so it's easier to use
            onLoad( render );
        });
    }

    function bind(fn, context) {
        return function(){
            return fn.apply(context, arguments);
        };
    }

    function mixIn(target, source) {
        var key;
        for (key in source){
            if ( Object.prototype.hasOwnProperty.call(source, key) ) {
                target[key] = source[key];
            }
        }
        return target;
    }

    function write(pluginName, moduleName, writeModule){
        if(moduleName in _buildMap){
            if (! _buildTemplate) {
                // using templates to generate compiled templates, so meta :P
                _buildTemplate = hogan.compile( _buildTemplateText );
            }
            var fn = _buildMap[moduleName];
            writeModule( _buildTemplate.render({
                pluginName : pluginName,
                moduleName : moduleName,
                fn : fn
            }) );
        }
    }

    return {
        load : load,
        write : write
    };

});