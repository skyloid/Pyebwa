
// Enhancement for CSS animation slideshow
(function() {
    // This script enhances the CSS-only slideshow but isn't required
    console.log('[CSS Slideshow Enhancement] Checking slideshow...');
    
    var slides = document.querySelectorAll('.slideshow-container .slide');
    console.log('[CSS Slideshow Enhancement] Found ' + slides.length + ' slides');
    
    // Add slide number classes if missing
    for (var i = 0; i < slides.length; i++) {
        if (!slides[i].classList.contains('slide-' + (i + 1))) {
            slides[i].classList.add('slide-' + (i + 1));
        }
    }
    
    // Check if CSS animations are supported
    var animation = false;
    var animationstring = 'animation';
    var keyframeprefix = '';
    var domPrefixes = 'Webkit Moz O ms Khtml'.split(' ');
    
    if (slides[0] && slides[0].style.animationName !== undefined) {
        animation = true;
    }
    
    if (!animation) {
        for (var i = 0; i < domPrefixes.length; i++) {
            if (slides[0] && slides[0].style[domPrefixes[i] + 'AnimationName'] !== undefined) {
                animation = true;
                break;
            }
        }
    }
    
    if (animation) {
        console.log('[CSS Slideshow Enhancement] CSS animations supported');
    } else {
        console.log('[CSS Slideshow Enhancement] Falling back to JavaScript');
        // Fallback to JavaScript animation
        var current = 0;
        setInterval(function() {
            slides[current].style.opacity = '0';
            current = (current + 1) % slides.length;
            slides[current].style.opacity = '1';
        }, 7000);
    }
})();
