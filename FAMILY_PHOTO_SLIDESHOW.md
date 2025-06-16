# Family Photo Slideshow Feature

## Overview
The dashboard welcome card now displays a slideshow of random family member photos, creating a more personal and engaging experience.

## Features

### 1. Automatic Slideshow
- Displays random photos from family members
- Changes every 10 seconds with smooth fade transition
- Continues cycling through all available photos

### 2. Smart Photo Selection
- Only shows members who have uploaded photos
- Avoids showing the same photo twice in a row
- Handles single photo gracefully (no flashing)

### 3. Smooth Transitions
- 1.5 second fade effect between photos
- Preloads images to prevent flashing
- Uses dual image elements for seamless transitions

### 4. Performance Optimized
- Slideshow stops when navigating away from dashboard
- Only two DOM elements used regardless of photo count
- Images are preloaded before transitioning

### 5. Fallback Handling
- If no family photos exist, shows the gradient background
- Displays prompt: "Add photos to your family members to see them here!"
- Works gracefully with zero photos

## Technical Implementation

### Key Functions:
- `getRandomFamilyMemberPhoto()` - Selects random photo excluding current
- `startFamilyPhotoSlideshow()` - Initializes and starts the slideshow
- `transitionToNewImage()` - Handles smooth fade transitions
- `stopDashboardSlideshow()` - Cleanup when leaving dashboard

### CSS Transitions:
```css
.slideshow-image {
    opacity: 0;
    transition: opacity 1.5s ease-in-out;
}
.slideshow-image.active {
    opacity: 0.4;
}
```

### Integration:
- Slideshow starts automatically when dashboard loads
- Stops when navigating to other views
- Uses `window.familyMembers` global data

## Usage

1. **Add Photos**: Upload photos for family members via their profiles
2. **View Dashboard**: Photos will automatically display in slideshow
3. **Enjoy**: Watch as photos cycle every 10 seconds

## Console Logs
- "Starting slideshow with photo of [Name]"
- "Transitioned to photo of [Name]"
- "No family members with photos found" (when applicable)
- "Dashboard slideshow stopped" (when leaving dashboard)

## Files Modified
- `/app/js/dashboard.js` - Complete slideshow implementation
- `/app/js/app.js` - Added slideshow cleanup in showView()

The feature enhances user engagement by making the dashboard more personal and visually appealing with family photos.