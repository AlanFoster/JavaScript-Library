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
        this.chainedFuncs = [];
        this.isExecutingChain = false;
        
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
                // TODO
                eventTypes.split(" ").forEach(function(eventType) {
                   // this.get().removeEventListener(eventType,  );
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
        hasPx :
            Object.freeze({
                "left" : true,
                "top" : true,
                "height" : true,
                "width" : true
            }),
        getRelativeValue :
            function getValue(key, rawValue) {
                if(typeof(rawValue) == "string") {
                    // Relative css, IE "+=100" => "600px", and "100" => "100"
                    // TODO consider opacity etc.
                    if(/([+-])=(.+)/.test(rawValue)) {
                        var convertedValue = 0;
                        var positive = RegExp.$1 == '+';
                        var actualValue = RegExp.$2;
                        convertedValue = this.css(key) + (positive ? parseFloat(actualValue) : -parseFloat(actualValue));

                        return  convertedValue;
                    }
                }
                return rawValue;
            },
        // Converts a value to the appropiate css value. IE "500" to "500px"
        convertValue : 
            function getValue(key, rawValue) {
                switch(typeof(rawValue)) {
                    case "string" : 
                        rawValue = this.getRelativeValue(key, rawValue);
                    case "number" :
                        return (key in this.hasPx) ? rawValue + "px" : rawValue.toString();
                }
                throw new Error("Invalid support for : " + rawValue);
            },
        // f :: [(a, b)] -> ()
        // f :: a -> b
        css :
            function(css){
                if(typeof(css) == "object") {
                    for(var i in css) {
                        this.get().style[i] = this.convertValue(i, css[i]);
                    }
                } else {
                    return parseFloat(window.getComputedStyle(this.get(), null).getPropertyValue(css));
                }
            },
        attribute :
            function(styles){
                for(var i in styles) {
                    this.get().setAttribute(i, styles[i]);
                }
            },
        change :
            function(desiredCSS, speed) {
                var totalNumberOfSteps = speed / 50;
                var startingCSS = {};
                for(var i in desiredCSS) {
                    startingCSS[i] = {};
                    var start = startingCSS[i].start = this.css(i);
                    var end = this.getRelativeValue(i, desiredCSS[i]);
                    startingCSS[i].step = start < end ? (end - start) / totalNumberOfSteps : -((start - end) / totalNumberOfSteps);
                }
                
                function changePerform(elem, desiredCSS, startingCSS, speed, currentTime, steps, callback) {
                    var newCSS = {};
                    
                    for(var i in desiredCSS) {
                        newCSS[i] = startingCSS[i].start + (startingCSS[i].step * steps);
                    }
                    
                    elem.css(newCSS);
                    currentTime += 50;
                    steps++;
                    if(currentTime <= speed) {
                        setTimeout(function() { changePerform(elem, desiredCSS, startingCSS, speed, currentTime, steps, callback); }, 50);
                    } else {
                        if(callback) {
                            callback();
                        }
                    }
                }
      
                this.chain(function () {
                    changePerform(this, desiredCSS, startingCSS, speed, 0, 0, function() { this.isExecutingChain = false; this.executeNextChain(); }.bind(this));
                }.bind(this));
                
                return this;
            },
        chain :
            function(func){
                this.chainedFuncs.push(func);
                this.executeNextChain();
            },
        executeNextChain :
            function() {
                if (!this.isExecutingChain && this.chainedFuncs.length > 0) {
                    this.isExecutingChain = true;
                    var nextFunc = this.chainedFuncs.shift();
                    nextFunc();
                }
            }
    };
	return foo;
})();

