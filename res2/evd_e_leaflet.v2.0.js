/*
 * evd e전단  plugin
 * - hammer v2 버전
 * @author: chhan
 */
(function($, undefined) {
	"use strict";
	
	var $win = $(window);
	
	/**
	 * evd e 전단 PinchZoomer: 
	 */
	function EVD_E_Leaflet_PinchZoomer(options) {
		this.initialize(options);
	}
	
	EVD_E_Leaflet_PinchZoomer.prototype = {
			/**
			 * 초기화
			 */
			initialize: function(options) {
				this.options = $.extend({
					step: 3 
					,contentSel: '.el-content'
					,pageMoveThreshold: 300
					,TEST_MODE: false
				}, options || {} );
				this.TEST_MODE = this.options.TEST_MODE;
				//
				this.$content = $(this.options.contentSel);
				this.minWid;
	        	this.minHei;
	        	this.maxWid;
	        	this.maxHei;
	        	this.currentStep;
				this.currentIndex = 0;
				//
				this.hammer = null;

	        	this._bindResizeEvent();
	        	this._setPinchEvent();
			},

	        /**
	         * 콘텐츠 초기화
	         */
	        initContent: function(index){
				if(typeof index == 'undefined'){
					index = this.currentIndex;
				} else {
					this.currentIndex = index;
				}

				this._setMaxSize();
	        	this._setSizeData();
	        	this._setZoomStepData();
	        	this.setDefaultSize();
	        },
	        
	        _setSizeData: function(){

	        	//가로 세로 높이
	        	var winHeight = $win.height();
	        	var winWidth = $win.width();
				var $img = this.$content.find('img').eq(this.currentIndex); 
				var imgWidth = 0;
				var imgHeight = 0;

				if($img.data('width')){
					imgWidth = $img.data('width');
					imgHeight = $img.data('height');
				} else {
					//naturalwidth와 같음.  
					imgWidth = $img[0].width;
					imgHeight = $img[0].height;
					$img.data('width', imgWidth);
					$img.data('height', imgHeight);
				}

				this.isVert = (imgWidth / imgHeight) < (winWidth / winHeight);
				if(this.isVert){
					this.rate = imgWidth / imgHeight;
					this.minWid  = (winHeight * this.rate);
					this.minHei = winHeight;
				} else { // 윈도창이 넓을때
					this.rate = imgHeight / imgWidth;
					this.minWid = winWidth;
					this.minHei = (winWidth * this.rate); 
				}
				this.$content.css({'left': 0, 'top': 0, 'width': this.minWid, 'height': this.minHei});
				
				if(this.TEST_MODE) { console.log('>> this.minWid=%o, this.minHei=%o', this.minWid, this.minHei); } 

	        	this.currentStep = 0;
	        },

	        _setMaxSize: function(){ 
	        	this.maxWid = parseInt(this.$content.attr("data-width"));
				this.maxHei = parseInt(this.$content.attr("data-height"));
				if(this.TEST_MODE) { console.log('>> this.maxWid=%o, this.maxHei=%o', this.maxWid, this.maxHei); } 
			}, 

	        _setZoomStepData: function(){
	        	this.stepData = [];

	        	var wid = (this.maxWid - this.minWid)/(this.options.step-1);
	        	var hei = (this.maxHei - this.minHei)/(this.options.step-1);
	        	for( var i=0; i<this.options.step; i++ ){
	        		var stepWid = 0;
	        		var	stepHei = 0;

	        		if(this.isVert){
	        			stepHei = Math.round(this.minHei+Math.round(hei*i));
						stepWid = stepHei * this.rate;
					} else {
						stepWid = Math.round(this.minWid+Math.round(wid*i)),
	        			stepHei = stepWid * this.rate;
					}

	    			this.stepData[i] = {
	    				wid : stepWid,
	    				hei : stepHei
	    			};
	        	}
	        	if(this.TEST_MODE) { console.log('>> this.stepData=%o', this.stepData); }
	        },

	       _bindResizeEvent:function(){
	       		var timerID = null;
	       		var me = this;
	       		$win.on("resize", function(){
	       			if(timerID) {
	       				clearTimeout( timerID );
	       			}
	       			timerID = setTimeout(function(){
	       				me.initContent();
	       			}, 200 );
	       		});
	       },

	        _getCurrentStep: function(){
	        	var currentWid = Math.round(this.$content.width());
	        	var currentStep;
	        	for( var len=this.stepData.length, i=len-1; i>=0; i-- ){
	        		var wid = this.stepData[i].wid;
	        		if( currentWid <= wid ){
	        			currentStep = i;
	        		}
	        	}

	        	return currentStep;
	        },
	        
	        /**
	         * pinch 이벤트: hammer v2
	         */
	        _setPinchEvent: function(){
	        	var me = this;
				// 이미지 >> 왼쪽 위 정점
	        	var imgProp = {
	        		width: 0
	        		,height: 0
	        		,top: 0
	        		,left: 0
	        	};
	        	// pinch 하는 위치  
	        	var pinchProp = {
	        		cx: 0
	        		,cy: 0
	        		,distXDivWidth: 1
	        		,distYDivHeight: 1
	        	};
				
				//hammer v2
				var myElement = me.$content.get(0);
				var hammer = new Hammer(myElement, {
					recognizers: [
			      		// RecognizerClass, [options], [recognizeWith, ...], [requireFailure, ...]
			      		// 성능조정: pan 을 pinch와 같이 체크하되, pinch가 우선.
			      		[ Hammer.Pinch, { enable: true } ]
			      		,[ Hammer.Pan, { threshold: 1 }, ['pinch'], ['pinch'] ]   
					]
				});
				this.hammer = hammer; 
				
				//== pinch
				hammer.on("pinchstart", function(e) {
					if(me.TEST_MODE) { console.log('>>pinchstart'); }
					me._setImgPinchProp( imgProp, pinchProp, e.center ); 
				});
				
				var pinchTimer = null;
				hammer.on("pinchmove", function(e) {
					if(me.TEST_MODE) { console.log('>> pinchmove '); } 
					
					var ePos = me._getVertexOriginPos(imgProp, pinchProp, e.scale);

					me.$content.css({
						width: ePos.width
						,height: ePos.height
						,top : ePos.y
						,left: ePos.x 
					});

					me._setPosition(); 
					
					//
					if(pinchTimer) { 
						clearTimeout(pinchTimer);
					}
					pinchTimer = setTimeout(function(){
						me.currentStep = me._getCurrentStep();
						if(me.TEST_MODE) { console.log('>> pinch: me.currentStep=%o', me.currentStep); }
						me.$content.trigger('el:zoomed', {step: me.currentStep});
					}, 200);
				});
				
				//== pan: move effect 
				var tmpPanStartTop;
				var tmpPanStartLeft;
				hammer.on("panstart", function(e) {
					imgProp.top = parseInt(me.$content.css("top"), 10);
					imgProp.left = parseInt(me.$content.css("left"), 10);
					tmpPanStartTop = imgProp.top;
					tmpPanStartLeft = imgProp.left; 
				});
				var tmpPageTimer = null;
				hammer.on("panmove", function(e) {
					if(me.TEST_MODE) { console.log('>>panmove'); }
					me.$content.css({ 
						top : (tmpPanStartTop + e.deltaY)
						,left: (tmpPanStartLeft + e.deltaX) 
					});
					
					var lpos = me._getLimitPosition();
					var tmpLeft = (tmpPanStartLeft + e.deltaX);
					me._setPosition();
					
					//== border까지 이동했을때  다음/이전 페이지로 이동: 
					// [lpos.limitLeft, lpos.minLeft]
					var pageMoveThreshold = me.options.pageMoveThreshold; 
					if( tmpLeft <  lpos.limitLeft - pageMoveThreshold ) {
						////console.log('>> el:next');
						if(tmpPageTimer) {
							clearTimeout(tmpPageTimer);
						}
						tmpPageTimer = setTimeout(function(){
							me.$content.trigger('el:next'); //다음 페이지
						}, 200);
					} else if(  tmpLeft > lpos.minLeft + pageMoveThreshold ) {
						////console.log('>> el:prev');
						if(tmpPageTimer) {
							clearTimeout(tmpPageTimer);
						}
						tmpPageTimer = setTimeout(function(){
							me.$content.trigger('el:prev'); //이전 페이지
						}, 200);
					}
					////console.log('left:' + tmpLeft);
					////console.log('limitLeft:' + lpos.limitLeft);
					////console.log('minLeft:' + lpos.minLeft);
				});
	        },

	        setDefaultSize: function(){
	        	var me = this;
	        	var step = 0;
	        	this.currentStep = step;
				var data = this.stepData[step];

        		//초기화 
        		if(this.TEST_MODE) { console.log('>> setDefaultSize '); }

        		this.$content.css({
	        		"width": data.wid,
	        		"height": data.hei,
        			"top": 0,
        			"left": 0
        		});
        		me._setPosition();
        		me.$content.trigger('el:zoomed', {step: me.currentStep});
	        	
	        },

	        _getContentSize: function( data ){
				if(this.isVert){
					if( data.height < this.minHei ){
						data.height = this.minHei;
					}else if( data.height > this.maxHei ){
						data.height = this.maxHei;
					}
					data.width = data.height * this.rate;
				} else {
					if( data.width < this.minWid ){
						data.width = this.minWid;
					}else if( data.width > this.maxWid ){
						data.width = this.maxWid;
					}
					data.height = data.width * this.rate;
				}

	        	return data;
	        },
	        
	        _setPosition: function(){
	        	this.pos = this._getLimitPosition();
	        	var contHei = this.$content.height();
				var winWHei = $win.height();
				var top, left;
				var contTop = parseInt(this.$content.css("top"), 10);
				
				if( contHei < winWHei ){
					//height가 윈도우보다 작을때 top값 중앙 고정
					top = Math.round((winWHei-contHei)*0.5);
					this.$content.css("top", top);
				}else if( contHei >= winWHei && contTop > this.pos.minTop ){
					this.$content.css("top", this.pos.minTop);
				}else if(contTop  < this.pos.limitTop){
					this.$content.css("top",  this.pos.limitTop);
				}

	    		var contWid = this.$content.width(),
					winWid = $win.width();
				var contLeft = parseInt(this.$content.css("left"), 10);
				if( contWid < winWid ){
					//width가 윈도우보다 작을때 left값 중앙 고정
					left = Math.round((winWid-contWid)*0.5);
					this.$content.css("left",left);
				}else if( contLeft > this.pos.minLeft){
					this.$content.css("left",  this.pos.minLeft);
				}else if( contLeft  < this.pos.limitLeft){
					this.$content.css("left",  this.pos.limitLeft);
				}
	        },


	       _getLimitPosition: function(){
	       		var winHei = $win.height();
	       		var	winWid = $win.width();
	       		var contHei = this.$content.height();
	       		var	contWid = this.$content.width();

	       		var minTop = 0;
	       		var	minLeft = 0;

	       		if( contHei < winHei ){
	       			minTop = (winHei - contHei)*0.5;
	       		}

	       		if( contWid < winWid ){
	       			minLeft = (winWid - contWid)*0.5;
	       		}

	        	return {
	        		minTop: minTop,
	        		minLeft: minLeft,
	        		limitTop:  (contHei-winHei)*-1,
	        		limitLeft: (contWid-winWid)*-1
	        	};
	        },
	        
	        /**
	         * pinch 시작시 정보 설정: 
	         * - imgProp: 이미지 정보
	         * - pinchProp: pinch 정보
	         * - point{x--pageX,y--pageY}
	         */ 
	        _setImgPinchProp: function( imgProp, pinchProp, point ) {
	        	var me = this;
	        	imgProp.top = parseInt(me.$content.css("top"), 10);
				imgProp.left = parseInt(me.$content.css("left"), 10);
				imgProp.width = me.$content.width();
				imgProp.height = me.$content.height();

				// pinch 할 때  (pinch중심점에서 이미지 border까지 거리) 와  (이미지 크기) 의  비례값은 변하지 않음.
				pinchProp.cx = point.x;
				pinchProp.cy = point.y;
				var distX = pinchProp.cx - me.$content.position().left;
				var distY = pinchProp.cy - me.$content.position().top;
				pinchProp.distXDivWidth = distX / imgProp.width;
				pinchProp.distYDivHeight = distY / imgProp.height;
				
				if(this.TEST_MODE) {
					console.log('pinchProp.cx=%o,pinchProp.cy=%o\n,x=%o,y=%o\n,pinchProp.distXDivWidth=%o,pinchProp.distYDivHeight=%o\n,imgProp.width=%o,imgProp.height=%o,imgProp.top=%o,imgProp.left=%o'
						,pinchProp.cx,pinchProp.cy,distX,distY,pinchProp.distXDivWidth,pinchProp.distYDivHeight,imgProp.width,imgProp.height,imgProp.top,imgProp.left);
				}
	        },
	        
	        /**
	         * scale 관련 원점 좌표 계산 
	         */
	        _getVertexOriginPos: function(imgProp, pinchProp, scale ) {
	        	var me = this;
				//
				var wid = imgProp.width * scale;
				var hei = imgProp.height * scale;


				var size = me._getContentSize({
							width: wid
							,height: hei 
				});
				
				var ox = pinchProp.cx - Math.round(size.width * pinchProp.distXDivWidth);
				var oy = pinchProp.cy - Math.round(size.height * pinchProp.distYDivHeight);
				
				return {
					x: ox
					,y: oy
					,width: size.width
					,height: size.height
				};
	        },
	        
	        //클릭한 점을 원점으로 확대: (point{x, y}, step) 
	        _zoomPoint: function(point, step) {
	        	if(this.TEST_MODE) { console.log('>> _zoomPoint point=%o, step=%o', point, step);  }
	        	
	        	//
	        	var me = this;
	        	var data = this.stepData[step];
	        	this.currentStep = step;
	        	
	        	// 이미지 >> 왼쪽 위 정점
	        	var imgProp = {
	        		width: 0
	        		,height: 0
	        		,top: 0
	        		,left: 0
	        	};
	        	//pinch 하는 위치 
	        	var pinchProp = {
	        		cx: 0
	        		,cy: 0
	        		,distXDivWidth: 1
	        		,distYDivHeight: 1
		        };
	        	
	        	me._setImgPinchProp( imgProp, pinchProp, point ); 

				var scale = data.wid / imgProp.width;
				var ePos = me._getVertexOriginPos(imgProp, pinchProp, scale);
				
				// zoom 효과 
				this.$content.stop().animate({"width": ePos.width, "height": ePos.height, "top": ePos.y, "left": ePos.x}, {
	        		duration: 400,
	        		easing: "easeOutQuad",  // "swing" 
	        		step: function( now, tween ){ 
	        			if( tween.prop == "width" ){
	        				me._setPosition(); 
	        			}
	        		},
					complete: function(){
						me._setPosition();
						me.$content.trigger('el:zoomed', {step: me.currentStep});
					}
	        	});
	        },
	        
	        getWindowCenterPointPageXY: function() {
	        	//중심점의 pageX,pageY
	        	var x = $win.width() / 2;
	        	var y = $win.height() / 2;
	        	return {
	        		x: x
	        		,y: y
	        	};
	        },
	        
	        zoomIn: function(){
	        	if(this.TEST_MODE) { console.log('>>zoomIn this.currentStep=%o', this.currentStep); } 
	        	var step = this.currentStep;
	        	step = step + 1;
	        	if( step > this.options.step-1 ){
	        		step = this.options.step-1;
	        	}
	        	var point = this.getWindowCenterPointPageXY();
	        	this._zoomPoint(point, step);
	        },
	        
	        //클릭한 점을 원점으로 최대로 확대 : //point{x,y}
	        zoomInMax: function(point){
	        	if(this.TEST_MODE) { console.log('>>zoomInMax this.currentStep=%o', this.currentStep); }
	        	var maxStep = this.options.step-1;
	        	this._zoomPoint(point, maxStep);
	        },

	        zoomOut: function(){
	        	if(this.TEST_MODE) { console.log('>>zoomOut this.currentStep=%o', this.currentStep); } 
	        	var step = this.currentStep;
	        	step = step - 1;
	        	if( step < 0  ){
	        		step = 0;
	        	}
	        	var point = this.getWindowCenterPointPageXY();
	        	this._zoomPoint(point, step);
	        },

			isFirstStep: function() {
				return this.currentStep === 0;
			},

			isLastStep: function() {
				return this.currentStep === (this.options.step - 1);
			}
	        
	};
	
	
	/*
	 * e 전단 view
	 */
	function EVD_E_Leaflet_View(options) {
		this.initialize(options);
	}
	
	EVD_E_Leaflet_View.prototype = {
		
        selectors: {
        	imgView: ".el-view",
        	controlContain: ".el-view-control",
        	plusButton : ".el-plus",
			minusButton : ".el-minus",
			list: ".el-content img",
			content: ".el-content",
			totalPageField: ".el-total-page",
			currentPageField: ".el-current-page",
			nextBtn: ".el-next",
			prevBtn: ".el-prev",
			moveBtn: ".el-move-page"
		},
       
        initialize: function(options) {
        	//
        	var me = this;
        	this.options = $.extend({
        		noneClass: "none",
            	onClass: "on",
            	disableClass: "disabled",
            	highDepthClass: "high_depth",
            	expandStep: 3,
            	loadingSel: ".evdLoader",
            	TEST_MODE: false
        	}, options || {});
        	this.TEST_MODE = this.options.TEST_MODE;
        	//
        	this.$loading =  $(this.options.loadingSel);
        	//set selectors jquery obj
        	$.each(this.selectors, function(key,value){
        		me["$" + key] = $(value); 
        	});
        	
        	//
        	this.pinchZoomer;
        	this.currentIndex;
        	this.totalPage = this.$list.length;
        	this.$totalPageField.html(this.totalPage);
        	this.contentAry = [];
        	this.isDisable = false;
        	this._createPinchZoomer();
        	this.setContent(0);
        	this._bindEvents();
        },

        _createPinchZoomer: function( ){
        	this.pinchZoomer = new EVD_E_Leaflet_PinchZoomer({
        		step: this.options.expandStep
        		,contentSel: this.selectors.content
        		,TEST_MODE: this.options.TEST_MODE
        	});
        },

        setContent: function( index ){
        	var me = this;
        	if( this.currentIndex == index ){return;}
        	this.currentIndex = index;
        	var $target = this.$list.eq(index);
        	if( $target.attr("data-loaded") ){
        		var maxWidth = $target.attr('data-max-width');
				var maxHeight = $target.attr('data-max-height');
				this.$content.attr('data-width', maxWidth);
				this.$content.attr('data-height', maxHeight); 
				////if(this.TEST_MODE) { $('.clog').html('>>' + maxWidth + '--' + maxHeight ); } 
        		this._changeContentAct(index);
        	}else{
        		this._showLoading();
        		var src = $target.attr("data-src");
        		$target.attr("src", src);
        		$target.load(function(){
    				$target.attr("data-loaded", "true"); 
        			this._hideLoading();
        			// 원본 사이즈  //@todo
        			var multiple = 5;  //5배
        			var maxWidth = 3400; //default 값 
    				var maxHeight = 2500; 
    				//
        			var originWidth = $target.prop('naturalWidth');
        			var originHeight = $target.prop('naturalHeight');
        			if(originWidth && originHeight) {
        				//모바일 환경은 모두 지원함(ie9+,기타): naturalWidth, naturalHeight 
        				//1800이하는 이전것 해상도 낮은것: (1202*1630, 2232*1630) 
        				maxWidth =  originWidth * multiple;
        				maxHeight =  originHeight * multiple;
        				////if(this.TEST_MODE) { $('.clog').html('>>--' + maxWidth + '--' + maxHeight ); }
        			} else {
        				console.log('>> error: naturalWidth not supported !'); 
        			}
        			$target.attr('data-max-width', maxWidth);  //img: 속성
    				$target.attr('data-max-height', maxHeight);
    				//
    				this.$content.attr('data-width', maxWidth);
    				this.$content.attr('data-height', maxHeight); 
        			this._changeContentAct(index); 
        		}.bind(this));
        	}
        },

        _changeContentAct: function(index){
        	this._showContent( index );
			this._setPageButton( index );
			this._setPageData(index);
        },

      
        _showContent: function(index){
        	this.pinchZoomer.initContent(index);
        	var $target = this.$list.eq(index);
        	this.$list.addClass(this.options.noneClass);
        	$target.removeClass(this.options.noneClass).css("opacity", 0);
        	$target.stop().animate({opacity: 1}, 500);
        },

        _setPageData: function(index){
        	index++;
        	this.$currentPageField.val(index); 
        },

        _setPageButton: function( index ){
        	if( this.totalPage == 1 ){
        		this.$prevBtn.prop("disabled", true);
        		this.$nextBtn.prop("disabled", true);
        		return;
        	}

        	this.$nextBtn.prop("disabled", false);
        	this.$prevBtn.prop("disabled", false);

        	if( index == 0 ){
        		this.$prevBtn.prop("disabled", true);
        	}else if( index == this.totalPage-1 ){
        		this.$nextBtn.prop("disabled", true);
        	}
        },

        _showLoading: function(){
        	this.$loading.show();
        },

        _hideLoading: function(){
        	this.$loading.hide();
        },

        _bindEvents: function(){
        	var me = this;

        	//hammer v2 
        	var hammer = new Hammer(me.$content.get(0), { 
				recognizers: [
		      		// RecognizerClass, [options], [recognizeWith, ...], [requireFailure, ...]
		      		////[ Hammer.Swipe, { threshold: 10 } ]
				]
			});
        	
        	// tap, doubleTap 설정
        	var tap = new Hammer.Tap({ event: 'tap', taps: 1 }); 
        	var doubleTap = new Hammer.Tap({event: 'doubleTap', taps: 2, posThreshold: 20, interval: 400 }); 
        	doubleTap.recognizeWith(tap); 
        	tap.requireFailure(doubleTap);
        	
        	hammer.add([doubleTap, tap]); 
        	
        	
        	// doubleTap 이벤트 
        	hammer.on("doubleTap", function(e){
        		me.pinchZoomer.zoomInMax(e.center); 
        	});
        	
			// tab이벤트시 툴바 토글
			hammer.on("tap", function(e){
				if( $(e.target).closest(me.selectors.controlContain).length != 0 ){
        			return;
        		}
        		me.$controlContain.toggle();
        	});

			//hammer.on('swipeleft', function() {
			//	if(me.pinchZoomer.isFirstStep()){
			//		me.$nextBtn.trigger('click');
			//	}
			//});
			//hammer.on('swiperight', function(){
			//	if(me.pinchZoomer.isFirstStep()){
			//		me.$prevBtn.trigger('click');
			//	}
			//});

			// 다음버튼 
        	this.$nextBtn.on( "click", function(e){
        		e.preventDefault();
        		if( me.isDisable || (me.currentIndex+1)>=me.totalPage ){ return; }
        		me.setContent (  me.currentIndex+1 );
        	});

			// 이전버튼
        	this.$prevBtn.on( "click", function(e){
        		e.preventDefault();
        		if( me.isDisable || me.currentIndex <= 0){ return; }
        		me.setContent( me.currentIndex-1 );
        	});
        	
        	//border까지 이동시 다음/이전 페이지
        	me.$content.on('el:prev', function(e, data) {
        		me.$prevBtn.trigger('click');
        	});
        	me.$content.on('el:next', function(e, data) {
        		me.$nextBtn.trigger('click');
        	});

			// 확대 버튼
        	this.$plusButton.on( "click", function(){
        		me.pinchZoomer.zoomIn();
        	});

			// 축소 버튼
        	this.$minusButton.on( "click", function(){
        		me.pinchZoomer.zoomOut();
        	});

			// 두손가락으로 핀치할 경우
        	me.$content.on('el:zoomed', function(e, data) {
				if(me.pinchZoomer.isLastStep()) {
					me.$plusButton.prop("disabled", true);
				} else {
					me.$plusButton.prop("disabled", false);
				}
				if(me.pinchZoomer.isFirstStep()) {
					me.$minusButton.prop("disabled", true);
				} else {
					me.$minusButton.prop("disabled", false); 
				}
			});
        	
        	//페이지 입력 처리
        	function handlePageInput() {
        		var inputVal = me.$currentPageField.val();
        		if(!me.isDisable && /^[1-9][0-9]*$/.test(inputVal)){
					var index = parseInt(inputVal, 10);
					index = index - 1;
					if(index >= 0 && index < me.totalPage){
						me.setContent(index);
						return;
					}
				}
				alert('페이지를 잘못 입력하셨습니다.');
				me._setPageData(me.currentIndex);
        	}

			// 페이지를 입력했을 때 해당페이지로 이동
			this.$currentPageField.on('keyup', function(e) {
				if(e.which === 13) {
					handlePageInput();
				}
			});

			// 이동버튼
			this.$moveBtn.on( "click", function(e){
				handlePageInput();
			});

        }
	}; 
	
	
	/**
	 * add to global namespace
	 */
	window.EVD_E_Leaflet_View = EVD_E_Leaflet_View;
	
	////$('.vlog').html('1.1'); //@test   
	
})(jQuery, undefined);

