/**
 * Stack.js
 * 
 * Depends on http://dynamicsjs.com/
 */
;(function(window) { 
    
    'use strict';

    var support, animEndEventNames, animEndEventName, onEndAnimation, CSS;

    CSS = {
        currentStackItem: 'stack__item--current',
        acceptStackItem: 'stack__item--accept',
        rejectStackItem: 'stack__item--reject',
        skipStackItem: 'stack__item--skip',
    };

    support = {
        animations: Modernizr.cssanimations
    };    

    animEndEventNames = { 
        'WebkitAnimation' : 'webkitAnimationEnd', 
        'OAnimation' : 'oAnimationEnd', 
        'msAnimation' : 'MSAnimationEnd', 
        'animation' : 'animationend'
    };

    animEndEventName = animEndEventNames[ Modernizr.prefixed('animation') ];

    onEndAnimation = function onEndAnimationHandler (el, callback) {
        var onEndCallbackFn = function onEndCallbackFnHandler (ev) {
            if (support.animations) {
                if (ev.target !== this) {
                    return;
                }
                this.removeEventListener(animEndEventName, onEndCallbackFn);
            }

            if (callback && typeof callback === 'function') {
                callback.call();
            }
        };

        if (support.animations) {
            el.addEventListener( animEndEventName, onEndCallbackFn);
        } else {
            onEndCallbackFn();
        }
    };

	function extend( a, b ) {
		for( var key in b ) { 
			if( b.hasOwnProperty( key ) ) {
				a[key] = b[key];
			}
		}
		return a;
	}

    //
    function classReg (className) {
        return new RegExp("(^|\\s+)" + className + "(\\s+|$)");

    }

    function hasClass (el, c) {
        return classReg(c).test(el.className);
    }

    function addClass ( el, c) {
        if (!hasClass(el, c)) {
            el.className = el.className + ' ' + c;
        }
    }

    function removeClass( el, c ) {
        el.className = el.className.replace(classReg( c ), ' ');
    }
    //

    function setStackItemStyle(item, visible, index) {
        if( index < visible ) {
            item.style.opacity = 1;
            item.style.pointerEvents = 'auto';
            item.style.zIndex = index === 0 ? parseInt(visible + 1) : parseInt(visible - index);
            item.style.WebkitTransform = item.style.transform = 'translate3d(0px, 0px, ' + parseInt(-1 * 50 * index) + 'px)';
        }
        else {
            item.style.opacity = 0;
            item.style.pointerEvents = 'none';
            item.style.zIndex = -1;
            item.style.WebkitTransform = item.style.transform = 'translate3d(0,0,-' + parseInt(visible * 50) + 'px)';
        }
    }

    function Stack (el, options) {
        /**
         * @class Stack
         * @param {Object} el The stack element container.
         * @param {Object} [options] The options object. 
         */
        this.el = el;
        this.options = extend( {}, this.options);
        extend(this.options, options);

        this.items = [].slice.call(this.el.children); // --> Maybe we could set an item selector via options object.
        this.itemsTotal = this.items.length;

        if( this.options.infinite && this.options.visible >= this.itemsTotal ||
            !this.options.infinite && this.options.visible > this.itemsTotal ||
            this.options.visible <=0 ) {
			
            this.options.visible = 1;
		}

        this.current = 0;

        this._init();
    }

    Stack.prototype = {
        options: {
            // stack's perspective value
            perspective: 1000,
            // stack's perspective origin
            perspectiveOrigin : '50% -50%',
            // number of visible items in the stack
            visible : 3,
            // animation settings for the items' movements in the stack when the items rearrange
            // object that is passed to the dynamicsjs animate function (see more at http://dynamicsjs.com/)
            // example:
            // {type: dynamics.spring,duration: 1641,frequency: 557,friction: 459,anticipationSize: 206,anticipationStrength: 392}
            stackItemsAnimation : {
                duration : 500,
                type : dynamics.bezier,
                points : [{'x':0,'y':0,'cp':[{'x':0.25,'y':0.1}]},{'x':1,'y':1,'cp':[{'x':0.25,'y':1}]}]
            },
            // delay for the items' rearrangement / delay before stackItemsAnimation is applied
            stackItemsAnimationDelay : 0,
            // infinite navigation
            infinite : true,
            // callback: when reaching the end of the stack
            onEndStack : function() {return false;},
        },
        _init: function init() {
            var self, i, item;

            this.el.style.WebkitPerspective = this.el.style.perspective = this.options.perspective + 'px';
		    this.el.style.WebkitPerspectiveOrigin = this.el.style.perspectiveOrigin = this.options.perspectiveOrigin;
            
            self = this;

            for (i = 0; i < this.itemsTotal; i += 1) {
                item = this.items[i];
                setStackItemStyle(item, this.options.visible, i);
            }

            addClass(this.items[this.current], CSS.currentStackItem);
        },
        reject: function reject (callback) {
            this._next('reject', callback);
        },
        accept: function accept (callback) {
            this._next('accept', callback);
        },
        skip: function skip (callback) {
            this._next('skip', callback);
        },
        restart: function() {
            this.hasEnded = false;
            
            this.items = [].slice.call(this.el.children); // --> Maybe we could set an item selector via options object.
            this.itemsTotal = this.items.length;

            this._init();
        },
        _next: function next (action, callback) {
            var currentItem, self, i, actionCss, pos, item, animateStackItems;

            if (this.isAnimating || (!this.options.infinite && this.hasEnded)) {
                return;
            }
            
            this.isAnimating = true;

            // Current Item
            currentItem = this.items[this.current];
            removeClass(currentItem, CSS.currentStackItem);
            
            // Add animation class
            actionCss = action === 'accept' ? CSS.acceptStackItem : action === 'reject' ? CSS.rejectStackItem : CSS.skipStackItem;
            addClass(currentItem, actionCss);

            self = this;
            onEndAnimation(currentItem, function onEndNextAnimationHandler() {
                //TODO: We shouldn't reset if action is skip. Instead, we should move.
                if (action === 'skip') {
                    setStackItemStyle(currentItem, self.options.visible, self.itemsTotal - 1);
                    self.items.push(self.items.shift()); // move the first to the last
                } else {
                    setStackItemStyle(currentItem, self.options.visible, Number.MAX_VALUE);
                    
                    self.items.shift(); // remove the first
                    self.itemsTotal -= 1;       
                }

                removeClass(currentItem, actionCss);

                if (self.items.length > 0) {
                    self.items[self.current].style.zIndex = self.options.visible + 1;
                }
                self.isAnimating = false;

                if (callback) {
                    callback();
                }

                if (!self.options.infinite && self.itemsTotal === 0) {
                    self.hasEnded = true;
                    // callback
                    self.options.onEndStack(self);
                }
            });

            // Other items
            for (i = 0; i < this.itemsTotal; i += 1) {
                if (i >= this.options.visible) {
                    break;
                }

                if (!this.options.infinite) {
                    if (this.current + i >= this.itemsTotal - 1) {
                        break;
                    }
                    pos = this.current + i + 1;
                } else {
                    pos = this.current + i < this.itemsTotal - 1 ? this.current + i + 1 : i - (this.itemsTotal - this.current - 1);
                }

                item = this.items[pos];
                
                animateStackItems = function animateStackItems(item, i) {
                    item.style.pointerEvents = 'auto';
					item.style.opacity = 1;
					item.style.zIndex = parseInt(self.options.visible - i);
					
					dynamics.animate(item, {
						translateZ : parseInt(-1 * 50 * i)
					}, self.options.stackItemsAnimation);
                };

                setTimeout(function timeoutCallbackFactory (item, i) {
                    return function timeoutCallback() {
                        animateStackItems(item, i);
                    };
                }(item, i), this.options.stackItemsAnimationDelay);
            }

            this.current = this.current < this.itemsTotal - 1 ? this.current + 1 : 0;
            this.current = 0;
            addClass(this.items[this.current], CSS.currentStackItem);

            console.log('current: ', this.current, ' total: ', this.itemsTotal);
        }
    };

	window.Stack = Stack;

})(window);