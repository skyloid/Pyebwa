# Manual Upload Instructions for Slideshow Fix

## Files to Upload to pyebwa.com

The slideshow on the front page of pyebwa.com needs these files uploaded:

### 1. Updated HTML file:
- **Local file**: `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/index.html`
- **Remote location**: `/public_html/index.html`
- **Changes**: Added link to slideshow-immediate-fix.css

### 2. Updated main CSS file:
- **Local file**: `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/css/styles.css`
- **Remote location**: `/public_html/css/styles.css`
- **Changes**: Added CSS animation for slideshow

### 3. New immediate fix CSS file:
- **Local file**: `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/css/slideshow-immediate-fix.css`
- **Remote location**: `/public_html/css/slideshow-immediate-fix.css`
- **Changes**: Pure CSS animation that works without JavaScript

### 4. Enhanced JavaScript (optional but recommended):
- **Local file**: `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/slideshow-enhanced-v2.js`
- **Remote location**: `/public_html/js/slideshow-enhanced-v2.js`
- **Changes**: Progressive enhancement with fallback detection

## FTP Upload Methods

### Method 1: Using FileZilla or FTP Client
1. Open your FTP client
2. Connect to: 145.223.107.9
3. Use your FTP credentials
4. Navigate to `/public_html/`
5. Upload the files listed above

### Method 2: Using Web-based File Manager
1. Log into your hosting control panel
2. Open File Manager
3. Navigate to `domains/pyebwa.com/public_html/`
4. Upload each file to its respective location

### Method 3: Using Command Line (if credentials work)
```bash
# From the directory: /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/

# Upload index.html
curl -T index.html ftp://username:password@145.223.107.9/public_html/

# Upload CSS files
curl -T css/styles.css ftp://username:password@145.223.107.9/public_html/css/
curl -T css/slideshow-immediate-fix.css ftp://username:password@145.223.107.9/public_html/css/

# Upload JavaScript (optional)
curl -T js/slideshow-enhanced-v2.js ftp://username:password@145.223.107.9/public_html/js/
```

## What This Fix Does

1. **Immediate CSS Animation**: The slideshow will start working immediately using pure CSS animations, no JavaScript required
2. **5-second intervals**: Each slide displays for 5 seconds
3. **Smooth fade transitions**: Uses opacity animations for smooth transitions
4. **Works in all browsers**: CSS animations are widely supported
5. **Progressive enhancement**: If JavaScript loads, it will take over for better control

## Verification

After uploading, verify the fix by:
1. Visit https://pyebwa.com/
2. Watch the slideshow - slides should change every 5 seconds
3. Check that transitions are smooth
4. Test in different browsers
5. Check browser console for any errors

## Troubleshooting

If the slideshow still doesn't work:
1. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
2. Check browser console for errors
3. Verify all CSS files loaded (Network tab)
4. Ensure the slideshow HTML structure hasn't changed

## Critical Files

The most important file is `slideshow-immediate-fix.css` - this contains the pure CSS animation that will make the slideshow work without any JavaScript.