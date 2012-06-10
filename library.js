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

        // There may be a different topmost superclass beyond this.
        if(arg instanceof HTMLDocument) {
            this.nodes = [arg];
        } else if(typeof(arg) == "string"){
            if( arg.match(/^<(.*?)>$/)){
                this.nodes = [document.createElement(RegExp.$1)];
                this.attribute(args);
            } else {
                this.nodes = document.querySelectorAll ? document.querySelectorAll(arg) : [];
            }
        } else {
            throw new Error("Invalid argument type : " + arg);
        }
            
        this.attribute(args);
        this.onEvents = {};
        
		return this;
	}

	// ----------------------------------------------------------------
	foo.extend = (function(newPrototype, newObject){
        var to = newObject ? {} : foo.fn.prototype;
        
        if(newObject) {
            newObject = {};
            for(var i in foo.fn) {
                to[i] = foo.fn[i];
            }
        } 
        
		for(var i in newPrototype){
			to[i] = newPrototype[i]; 
		}
        
        return to;
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
    
    foo.fn.prototype = {
        constructor : function() { alert(1); },
    	get :
            function(){
				return this.nodes[0];
			},
        on :
            // Called with 
            // f :: eventType -> callback -> ()
            // f :: [(eventType, callback)] -> ()
            function() {
                var onEvents = this.onEvents, elem = this.get();
                
                var manageEvent = function(eventType, callback) {
                    if(!(eventType in onEvents)){
                        elem.addEventListener(eventType, function(e) { this.handleEvent(e) }.bind(this), true);
                        onEvents[eventType] = [];
                    }
                    onEvents[eventType].push(callback);
                }.bind(this);

                if(typeof(arguments[0]) == "object"){
                    for(var eventType in arguments[0]) {
                        manageEvent(eventType, arguments[0][eventType]);
                    }
                } else {
                    manageEvent(arguments[0], arguments[1]);
                }
            },
        clear :
            // TODO currently deletes all events. Explicit function removing needs to be added
            function(eventTypes) {
                eventTypes.split(" ").forEach(function(eventType) {
                    this.get().removeEventListener(eventType, );
                    delete this.onEvents[eventType];
                }.bind(this));
            },
        handleEvent :
            function(oldEvent){
                var newEvent = Object.create(oldEvent || window.event);
                newEvent.target = this;
                newEvent.mousePos = {"x" : newEvent.pageX, "y" : newEvent.pageY };
                newEvent.potato = this;
                this.onEvents[newEvent.type].forEach(function(callback) { callback(newEvent); });
            },
        append :
            function(children) {
                function getRawElem(obj) {
                    // TODO Make this work
                   // return obj instanceof _ ? obj.get() : obj;
                   return "get" in obj ? obj.get() : obj;
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
        // f :: [(a, b)] -> ()
        // f :: a -> b
        css :
            function(css){
                if(typeof(css) == "object") {
                    for(var i in css) {
                        this.get().style[i] = css[i];
                    }
                } else {
                    return parseInt(this.get().style[css]);
                }
            },
        attribute :
            function(styles){
                for(var i in styles) {
                    this.get().setAttribute(i, styles[i]);
                }
            }
    };
    
	return foo;
})();

