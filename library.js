var _ = (function (){
	var foo = function(arg, args){
		return new foo.fn(arg, args);
	};
    
	foo.fn = function(arg, args) {
        if(arg == undefined) throw "undefined argument passed into constructor";
        
        if(typeof(arg) == 'function'){
            foo.onDOMLoad(arg);
            return;
        }
        
        if(arg.match(/^<(.*?)>$/)){
			this.nodes = [];
            var newElem = document.createElement(RegExp.$1);            
            this.nodes.push(newElem);
            this.setStyle(args);
		} else {
			this.nodes = document.querySelectorAll ? document.querySelectorAll(arg) : [];
		}
        
        this.onEvents = {};
        
		return this;
	}

	// ----------------------------------------------------------------
	foo.extend = (function(funcs){
		for(var i in funcs){
			foo.fn.prototype[i] = funcs[i];
		}
	});
	
	var foreach = foo.foreach = function(arr, func){
		for(k in arr){
			var result = func(k, arr[k]);
			if(result) {
				return result;
			}
		}
	};

	// ----------------------------------------------------------------
	var onDOMLoadFuncs = [];
    var DOMLoaded = false;
    
    foo.onDOMLoad = function(func){ 
        if(DOMLoaded) {
            func();
        } else {
            onDOMLoadFuncs.push(func);
        }
    };
    
    function fireDOMLoadFuncs(){
        foreach(onDOMLoadFuncs, function(k, v) { v(); });
        onDOMLoadFuncs = [];
    }
    
	document.addEventListener("DOMContentLoaded", function() { DOMLoaded = true; }, true);
	document.addEventListener("DOMContentLoaded", fireDOMLoadFuncs, true);
        
    // TODO rewrite this mess.
    var requiredScripts = 0;
    var requiredScriptLoad = function() {
                requiredScripts--;
                if(requiredScripts == 0){
                    if(DOMLoaded) {
                        fireDOMLoadFuncs();
                    } else {
                        document.addEventListener("DOMContentLoaded", fireDOMLoadFuncs, true);
                    }
                }
    };
    foo.require = function(required) {   
        if(!DOMLoaded) { 
            document.removeEventListener("DOMContentLoaded", fireDOMLoadFuncs, true);
        }
    
        function appendScript(src){
            requiredScripts++
            var elem = _("<script>", {"src" : src, "type" : "text/javascript", onload : requiredScriptLoad}).get();
            var s = document.getElementsByTagName('script')[0];
            s.parentNode.insertBefore(elem, s);
        }
        
        if(required instanceof Array){
            required.forEach(appendScript);
        } else {
            appendScript(required);
        }
    };
    
  	// ----------------------------------------------------------------
	foo.fn.prototype = {
		get :
            function(){
				return this.nodes[0];
			},
        on :
            function(eventType, callback){
                if(!(eventType in this.onEvents)){
                    this.get().addEventListener(eventType, function(e) { this.handleEvent(e) }.bind(this), true);
                    this.onEvents[eventType] = [];
                }
                this.onEvents[eventType].push(callback);
            },
        handleEvent :
            function(event){
                event = event || window.event;
                event.mousePos = {"x" : event.pageX, "y" : event.pageY };
                this.onEvents[event.type].forEach(function(callback) {
                    callback(event);
            });
        },
        append :
            function(children) {
                function getRawElem(obj) {
                    return obj instanceof foo.fn) ? obj.get() : obj;
                }
                
                if(children instanceof Array) {
                    for(var i in children) {
                        this.get().appendChild(getRawElem(children[i]));
                    }
                } else {
                    this.get().appendChild(getRawElem(children));
                }
        },
        html :
            function(html) {
            this.get().innerHTML = html;
        },
        setStyle :
            function(styles){
                for(var i in styles) {
                    this.get().setAttribute(i, styles[i]);
                }
            }
	}

	return foo;
})();