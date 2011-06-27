window.$fx = (function () {

	var units = {
		'left|top|right|bottom|width|height|margin|padding|spacing|backgroundx|backgroundy': 'px',
		'font': 'pt',
		'opacity': ''
	};
	
	var isIE = !!navigator.userAgent.match(/MSIE/ig);
	
	var required = { delay:100, step:5, unit:'' };

	var handlers = {
		opacity: function (val,unit) {
			val = parseInt(val); 
			if (isNaN(val)) {
				if (isIE) {
					var matches = (new RegExp('alpha\\s*\\(opacity\\s*=\\s*(\\d+)\\)')).exec(this.elm.style.filter+'');
					if (matches)
						return parseInt(matches[1]);
					else
						return 1;
				}
				else {
					return Math.round((this.elm.style.opacity ? parseFloat(this.elm.style.opacity) : 1) * 100);
				}
			}
			else {
				val = Math.min(100, Math.max(0, val));
				if (isIE) {
					this.elm.style.zoom = 1;
					this.elm.style.filter = 'alpha(opacity='+val+');';
				}
				else {
					this.elm.style.opacity = val/100;
				}
			}
		},
		'backgroundx': function (val,unit) {
			val = parseInt(val);
			var x = 0, y = 0;
			var matches = (new RegExp('^(-?\\d+)[^\\d\\-]+(-?\\d+)')).exec(this.elm.style.backgroundPosition+'');
			if (matches) {
				x = parseInt(matches[1]);
				y = parseInt(matches[2]);
			}
			if (isNaN(val))
				return x;
			else {
				this.elm.style.backgroundPosition = val+unit+' '+y+unit;  
			}
		},
		'backgroundy': function (val,unit) {
			val = parseInt(val);
			var x = 0, y = 0;
			var matches = (new RegExp('^(-?\\d+)[^\\d\\-]+(-?\\d+)')).exec(this.elm.style.backgroundPosition+'');
			if (matches) {
				x = parseInt(matches[1]);
				y = parseInt(matches[2]);
			}
			if (isNaN(val))
				return y;
			else {
				this.elm.style.backgroundPosition = x+unit+' '+val+unit;  
			}
		}
	};
	
	var defaults = {
		width: function (elm) {
			return parseInt(elm.offsetWidth)
		},
		height: function (elm) {
			return parseInt(elm.offsetHeight)
		},
		left: function (elm) {
			var left = 0;
			for (var el=elm; el; el=el.offsetParent) left+=parseInt(el.offsetLeft);
			return left;
		},
		top: function (elm) {
			var top = 0;
			for (var el=elm; el; el=el.offsetParent) top += parseInt(el.offsetTop);
			return top;
		}
	};
	
	var fxFn = {};
	// ----
	fxFn.fxAddSet = function () {
		this._fx._addSet();
		return this;
	};
	
	// ----
	fxFn.fxHold = function (time, set) {
		if(elm._fx.sets[this._fx._currSet]._isrunning)
			return this;
			
		var set = parseInt(set);
		this._fx.sets[isNaN(set) ? this._fx._currSet : set]._holdTime = time;
		return this; 
	};
	
	// ----
	fxFn.fxAdd = function (params) {
		var currSet = this._fx._currSet;

		if(this._fx.sets[currSet]._isrunning)
			return this;
		
		for(var p in required){
			if(!params[p])
				params[p] = required[p]
		};
		if(!params.unit){
			for(var mask in units)
				if((new RegExp(mask,'i').test(params.type))){
					params.unit = units[mask];
					break;
				}
		};
		
		params.onstart = (params.onstart && params.onstart.call) ? params.onstart : function(){}; 
		params.onfinish = (params.onfinish && params.onfinish.call) ? params.onfinish : function(){}; 
		
		if(!this._fx[params.type]){
			if(handlers[params.type])
				this._fx[params.type] = handlers[params.type];
			else{
				var elm = this;
				this._fx[params.type] = function (val,unit) {
					if(typeof(val)=='undefined')
						return parseInt(elm.style[params.type]);
					else
						elm.style[params.type] = parseInt(val) + unit;
				}
			}
		};
		if(isNaN(params.from)){
			if(isNaN(this._fx[params.type]()))
				if(defaults[params.type])
					params.from = defaults[params.type](this);
				else
					params.from = 0;
			else
				params.from = this._fx[params.type]();
		}
		params._initial = params.from;
		this._fx[params.type](params.from, params.unit);
		this._fx.sets[currSet]._queue.push(params);
		return this;
	};
	
	// ----
	fxFn.fxRun = function(finalCallback, loops, loopCallback){
		var currSet = this._fx._currSet;
		
		if(this._fx.sets[currSet]._isrunning){
			return this;
		}
		
		var elm = this;
		setTimeout(function () {
			if(elm._fx.sets[currSet]._isrunning)
				return elm;
			elm._fx.sets[currSet]._isrunning = true;
			
			if(elm._fx.sets[currSet]._effectsDone > 0)
				return elm;
			elm._fx.sets[currSet]._onfinal = (finalCallback && finalCallback.call) ? finalCallback : function(){};
			elm._fx.sets[currSet]._onloop = (loopCallback && loopCallback.call) ? loopCallback : function(){};
			if(!isNaN(loops))
				elm._fx.sets[currSet]._loops = loops;
			 		
			for(var i=0; i<elm._fx.sets[currSet]._queue.length; i++){
				elm._fx.sets[currSet]._queue[i].onstart.call(elm);
				elm._fx._process(currSet, i);
			}
		}, elm._fx.sets[currSet]._holdTime);
		
		return this;
	};
	
	// ----
	fxFn.fxPause = function(status, setNum){
		this._fx.sets[!isNaN(setNum) ? setNum : this._fx._currSet]._paused = status;
		return this;
	};
	
	// ----
	fxFn.fxStop = function(setNum){
		this._fx.sets[!isNaN(setNum) ? setNum : this._fx._currSet]._stoped = true;
		return this;
	};
	
	// ----
	fxFn.fxReset = function(){
			for(var i=0; i<this._fx.sets.length; i++){
				for(var j=0; j<this._fx.sets[i]._queue.length; j++){
					var params = this._fx.sets[i]._queue[j];
					if(isNaN(params._initial))
						this._fx[params.type]('','');
					else
						this._fx[params.type](params._initial, params.unit);
				}
			}
			var del = ['_fx','fxHold','fxAdd','fxAddSet','fxRun','fxPause','fxStop','fxReset'];
			for(var i=0; i<del.length; i++)
				try{delete this[del[i]]}catch(err){this[del[i]] = null}
			this._fxTerminated = true;
	};

	// ----
	var _fx_addSet = function () {
		var currSet = this.sets.length;
		this._currSet = currSet;
		this.sets[currSet] = {};
		this.sets[currSet]._loops = 1;
		this.sets[currSet]._stoped = false;
		this.sets[currSet]._queue = [];
		this.sets[currSet]._effectsDone = 0;
		this.sets[currSet]._loopsDone = 0;
		this.sets[currSet]._holdTime = 0;
		this.sets[currSet]._paused = false;
		this.sets[currSet]._isrunning = false;
		this.sets[currSet]._onfinal = function(){};
		
		return this;
	};

	// --
	var _fx_process = function (setNum,effectNum) {
		if(!this.sets[setNum] || this.sets[setNum]._stoped || this._fxTerminated)
			return;
		var ef = this.sets[setNum]._queue[effectNum];
		var param = this[ef.type]();
		
		if((ef.step > 0 && param + ef.step <= ef.to) || (ef.step < 0 && param + ef.step >= ef.to)){
			if(!this.sets[setNum]._paused)
				this[ef.type](param + ef.step, ef.unit);
			var inst = this;
			setTimeout(function(){if(inst._process) inst._process(setNum, effectNum)}, ef.delay);
		}else{
			this[ef.type](ef.to, ef.unit);
			this.sets[setNum]._effectsDone++;
			ef.onfinish.call(this);
			if(this.sets[setNum]._queue.length == this.sets[setNum]._effectsDone){
				this.sets[setNum]._effectsDone = 0;
				this.sets[setNum]._loopsDone++;
				this.sets[setNum]._onloop.call(this, this.sets[setNum]._loopsDone);
				if(this.sets[setNum]._loopsDone < this.sets[setNum]._loops || this.sets[setNum]._loops == -1){
					for(var i=0; i < this.sets[setNum]._queue.length; i++){
						this[ef.type](ef.from, this.sets[setNum]._queue[i].unit);
						this.sets[setNum]._queue[i].onstart.call(this, this.sets[setNum]._loopsDone);
						this._process(setNum, i);
					}
				}else{
					this.sets[setNum]._onfinal.call(this);
				}
			}
		}
	};


	// the "exported" object
	var $fx = function (initElm) {
		if (initElm.nodeType && initElm.nodeType==1)
			var elm = initElm;
		else if (String(initElm).match(/^#([^$]+)$/i)) {
			var elm = document.getElementById(RegExp.$1+'');
			if (!elm) return null;
		}
		else return null;

		if (typeof(elm._fx) != 'undefined' && elm._fx) {
			elm._fx._addSet();
			return elm;
		};

		elm.fxVersion = 0.1;
		elm._fx = {
			elm: elm,
			sets: [],
			_currSet: 0,
			_addSet: _fx_addSet,
			_process: _fx_process
		};
		
		if (typeof(elm._fxTerminated) != 'undefined')
			try { delete elm._fxTerminated } catch (err) { elm._fxTerminated = null }
		
		// extend the element
		for (var fnName in fxFn) {
			elm[fnName] = fxFn[fnName];
		}

		elm._fx._addSet();
			return elm;
	};

	// Allow extension of the fx methods.
	// yeah it's not jquery quality, but it's good enough.
	$fx.extend = function (fns) {
		for (var fnName in fns) {
			fxFn[fnName] = fns[fnName];
		}
	};

	return $fx;

})();
