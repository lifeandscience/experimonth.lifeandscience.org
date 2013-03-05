jQuery(function(){
	var ol = jQuery('ol#timeline');
	
	// Create a canvas tag
	var canvas = jQuery('<canvas></canvas>');
	
	canvas.insertAfter(ol);
	
	canvas = canvas.get(0);
//	ol.remove();
	
	// Begin processing:
	function sketch(processing){

		// Borrowed from: http://www.local-guru.net/processing/felttip/felttip.pde
		var seed = Math.floor(processing.random(1024));
		
		processing.ftline = function(x1, y1, x2, y2 ){
			processing.beginShape();
			processing.vertex( x1 + processing.random(-2,2), y1 +processing.random(-2,2));
			processing.curveVertex( x1 + processing.random(-2,2), y1 +processing.random(-2,2));
			processing.curveVertex( x1+(x2 -x1)/3 + processing.random(-2,2), y1 + (y2-y1)/3 +processing.random(-2,2));
			processing.curveVertex( x1+2*(x2-x1)/3 + processing.random(-2,2), y1+ 2*(y2-y1)/3 +processing.random(-2,2)); 
			processing.curveVertex( x2 + processing.random(-2,2), y2 +processing.random(-2,2));
			processing.vertex( x2 + processing.random(-2,2), y2 +processing.random(-2,2));
			processing.endShape();
		
			processing.beginShape();
			processing.vertex( x1 + processing.random(-1,1), y1 +processing.random(-1,1));
			processing.curveVertex( x1 + processing.random(-1,1), y1 +processing.random(-1,1));
			processing.curveVertex( x1+(x2 -x1)/3 + processing.random(-1,1), y1 + (y2-y1)/3 +processing.random(-1,1));
			processing.curveVertex( x1+2*(x2-x1)/3 + processing.random(-1,1), y1+ 2*(y2-y1)/3 +processing.random(-1,1)); 
			processing.curveVertex( x2 + processing.random(-1,1), y2 +processing.random(-1,1));
			processing.vertex( x2 + processing.random(-1,1), y2 +processing.random(-1,1));
			processing.endShape();
		}
		
		
		processing.ftlineraw = function(x1, y1, x2, y2 ){
			processing.vertex( x1 + processing.random(-2,2), y1 +processing.random(-2,2));
			processing.curveVertex( x1 + processing.random(-2,2), y1 +processing.random(-2,2));
			processing.curveVertex( x1+(x2 -x1)/3 + processing.random(-2,2), y1 + (y2-y1)/3 +processing.random(-2,2));
			processing.curveVertex( x1+2*(x2-x1)/3 + processing.random(-2,2), y1+ 2*(y2-y1)/3 +processing.random(-2,2)); 
			processing.curveVertex( x2 + processing.random(-2,2), y2 +processing.random(-2,2));
			processing.vertex( x2 + processing.random(-2,2), y2 +processing.random(-2,2));

			processing.vertex( x1 + processing.random(-1,1), y1 +processing.random(-1,1));
			processing.curveVertex( x1 + processing.random(-1,1), y1 +processing.random(-1,1));
			processing.curveVertex( x1+(x2 -x1)/3 + processing.random(-1,1), y1 + (y2-y1)/3 +processing.random(-1,1));
			processing.curveVertex( x1+2*(x2-x1)/3 + processing.random(-1,1), y1+ 2*(y2-y1)/3 +processing.random(-1,1)); 
			processing.curveVertex( x2 + processing.random(-1,1), y2 +processing.random(-1,1));
			processing.vertex( x2 + processing.random(-1,1), y2 +processing.random(-1,1));
		}
		
		processing.ftrect = function( x1, y1, w, h ) { 
			processing.beginShape();
			processing.ftlineraw( x1, y1, x1, y1 + h );
			processing.ftlineraw( x1, y1+h, x1+w, y1+h );
			processing.ftlineraw( x1+w, y1+h, x1+w, y1 ); 
			processing.ftlineraw( x1 + w, y1, x1, y1 );
			processing.endShape();
			
		}

		var width = 920;
		var height = 250;
		processing.setup = function(){
			processing.size(width, height);
			processing.smooth();
			processing.noiseSeed(seed);

			processing.background(255);

			processing.strokeWeight(2);
			processing.stroke(0);
			processing.fill(0);
			
			var children = ol.children();
			var rectSize = 11;
			var count = children.length-1;
			var rectSpacing = Math.floor((width - rectSize - 100)/(count));
			
			for(var i=0; i < children.length; i++){
				var item = children.get(i);
				processing.strokeWeight(2);
				processing.stroke(0);
				processing.fill(0);
				if(i == 4){
					// Last item
					processing.ellipse(i*rectSpacing+50, 100+(rectSize/2), rectSize*4, rectSize*4);
					var startX = i*rectSpacing+5;
					var startY = 100+(rectSize/2);
					processing.ftline(startX, startY, startX-8, startY-8);
					processing.ftline(startX, startY, startX-8, startY+8);
				}else{
					processing.ftrect(i*rectSpacing+5, 100, rectSize, rectSize);
					processing.ftline(i*rectSpacing+5, 100+(rectSize/2), (i+1)*rectSpacing+5, 100+(rectSize/2));
				}
				if(jQuery(item).hasClass('highlight')){
					var startX = i*rectSpacing + 5 + rectSize/2;
					var startY = 92;
					processing.strokeWeight(1);
					processing.stroke(255, 0, 0);
					processing.fill(255, 0, 0);
					processing.ftline(startX, startY, startX, startY-65);
					processing.ftline(startX, startY, startX-5, startY-3);
					processing.ftline(startX, startY, startX+5, startY-3);
				}
			}
			jQuery('#timeline-container').addClass('processed');
		}
	}
	
	var p = new Processing(canvas, sketch);
});