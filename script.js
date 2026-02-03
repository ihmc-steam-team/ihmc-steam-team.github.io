// YouTube Kiosk with Direct Embed (No YouTube API)
function YouTubeKiosk() {
    // Video settings
    this.playlist = [];
    this.currentVideoIndex = 0;
    this.youtubeIframe = null;
    this.hasUserInteracted = false;
    
    // Image settings  
    this.images = [];
    this.currentImageIndex = 0;
    this.imageTimer = null;
    
    // File paths
    this.playlistUrl = 'playlist.txt';
    this.imagesFolder = 'images/';
    
    // Status
    this.isPlaying = false;
}

// ==================== INITIALIZATION ====================
YouTubeKiosk.prototype.initialize = function() {
    console.log('Initializing Kiosk...');
    this.updateStatus('Starting kiosk...');
    
    var self = this;
    
    // Load playlist first, then images
    this.loadPlaylist().then(function() {
        return self.loadImages();
    }).then(function() {
        // Start all components
        self.setupVideoPlayer();
        self.setupImageSlideshow();
        self.startClock();
        self.updateStatus('Ready: ' + self.playlist.length + ' videos, ' + self.images.length + ' images');
    }).catch(function(error) {
        console.error('Initialization error:', error);
        self.showError('Setup error: ' + error.message);
    });
};

// ==================== PLAYLIST LOADING ====================
YouTubeKiosk.prototype.loadPlaylist = function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', self.playlistUrl + '?t=' + Date.now());
        xhr.onload = function() {
            if (xhr.status === 200) {
                self.parsePlaylist(xhr.responseText);
                
                // Add default videos if playlist empty
                if (self.playlist.length === 0) {
                    console.log('Playlist empty, adding defaults');
                    self.playlist = [
                        { id: 'dQw4w9WgXcQ', title: 'Sample Video 1' },
                        { id: '9bZkp7q19f0', title: 'Sample Video 2' }
                    ];
                }
                
                console.log('Loaded ' + self.playlist.length + ' videos');
                self.updateVideoCounter();
                resolve();
            } else {
                reject(new Error('Cannot load playlist.txt'));
            }
        };
        xhr.onerror = function() {
            reject(new Error('Network error loading playlist'));
        };
        xhr.send();
    });
};

YouTubeKiosk.prototype.parsePlaylist = function(text) {
    this.playlist = [];
    var lines = text.split('\n');
    
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line && !line.startsWith('#')) {
            var videoId = this.extractYouTubeId(line);
            if (videoId) {
                this.playlist.push({
                    id: videoId,
                    title: 'Video ' + (i + 1)
                });
            }
        }
    }
};

YouTubeKiosk.prototype.extractYouTubeId = function(url) {
    url = url.trim();
    
    // Pattern 1: youtube.com/watch?v=VIDEO_ID
    var match = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return match[1];
    
    // Pattern 2: youtu.be/VIDEO_ID
    match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return match[1];
    
    // Pattern 3: Just the ID
    match = url.match(/^([a-zA-Z0-9_-]{11})$/);
    if (match && match[1]) return match[1];
    
    return null;
};

// ==================== VIDEO PLAYER (DIRECT EMBED) ====================
YouTubeKiosk.prototype.setupVideoPlayer = function() {
    if (this.playlist.length === 0) {
        console.error('No videos to play');
        this.showError('No videos in playlist');
        return;
    }
    
    console.log('Setting up direct YouTube embed');
    this.createVideoEmbed();
    
    // Auto-advance videos every 60 seconds (simulate playlist)
    var self = this;
    setInterval(function() {
        self.nextVideo();
    }, 60000); // Change video every 60 seconds
};

YouTubeKiosk.prototype.createVideoEmbed = function() {
    var playerDiv = document.getElementById('player');
    if (!playerDiv) {
        console.error('Player container not found');
        return;
    }
    
    var currentVideo = this.playlist[this.currentVideoIndex];
    
    // Create iframe with YouTube embed
    var iframe = document.createElement('iframe');
    iframe.id = 'youtubeIframe';
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allow = 'autoplay; encrypted-media; accelerometer; gyroscope';
    iframe.allowFullscreen = true;
    
    // Build YouTube embed URL
    var videoUrl = 'https://www.youtube.com/embed/' + currentVideo.id + 
        '?autoplay=1' +          // Try to autoplay
        '&controls=0' +          // Hide controls  
        '&rel=0' +               // No related videos
        '&modestbranding=1' +    // Less branding
        '&playsinline=1' +       // Play inline
        '&iv_load_policy=3' +    // Hide annotations
        '&disablekb=1';          // Disable keyboard
    
    // Start muted (required for autoplay on most devices)
    videoUrl += '&mute=1';
    
    iframe.src = videoUrl;
    
    // Clear and add iframe
    playerDiv.innerHTML = '';
    playerDiv.appendChild(iframe);
    
    this.youtubeIframe = iframe;
    
    // Update video info
    this.updateVideoInfo();
    
    // Add click-to-unmute overlay
    this.addUnmuteOverlay();
    
    console.log('Video embed created for:', currentVideo.id);
};

YouTubeKiosk.prototype.addUnmuteOverlay = function() {
    var playerDiv = document.getElementById('player');
    if (!playerDiv) return;
    
    // Remove existing overlay
    var oldOverlay = document.getElementById('unmuteOverlay');
    if (oldOverlay) oldOverlay.remove();
    
    // Create new overlay
    var overlay = document.createElement('div');
    overlay.id = 'unmuteOverlay';
    overlay.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0);
        color: white;
        padding: 8px 12px;
        border-radius: 5px;
        font-size: 14px;
        cursor: pointer;
        z-index: 50;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    
    var self = this;

    
    playerDiv.appendChild(overlay);
};

YouTubeKiosk.prototype.unmuteVideo = function() {
    if (!this.youtubeIframe) return;
    
    var currentSrc = this.youtubeIframe.src;
    if (currentSrc.includes('mute=1')) {
        // Reload iframe without mute parameter
        this.youtubeIframe.src = currentSrc.replace('mute=1', 'mute=0');
        this.hasUserInteracted = true;
        this.updateStatus('Video unmuted');
        console.log('Video unmuted');
    }
};

YouTubeKiosk.prototype.nextVideo = function() {
    if (this.playlist.length <= 1) return;
    
    this.currentVideoIndex = (this.currentVideoIndex + 1) % this.playlist.length;
    console.log('Switching to video:', this.currentVideoIndex + 1);
    
    this.createVideoEmbed();
};

YouTubeKiosk.prototype.updateVideoInfo = function() {
    if (this.playlist.length === 0) return;
};

YouTubeKiosk.prototype.updateVideoCounter = function() {
    if (this.playlist.length === 0) return;
    
    var counterElement = document.getElementById('videoCounter');
    if (counterElement) {
        counterElement.textContent = (this.currentVideoIndex + 1) + '/' + this.playlist.length;
    }
};

// ==================== IMAGE SLIDESHOW (ORIGINAL FUNCTIONALITY) ====================
YouTubeKiosk.prototype.loadImages = function() {
    var self = this;
    
    return new Promise(function(resolve) {
        self.images = [];
        var checkIndex = 1;
        var maxImagesToCheck = 20;
        
        function checkNextImage() {
            if (checkIndex > maxImagesToCheck) {
                // All images checked, finish up
                finishLoading();
                return;
            }
            
            // Try JPG version
            var img = new Image();
            var imagePath = self.imagesFolder + checkIndex + '.jpg';
            
            img.onload = function() {
                console.log('Found image:', imagePath);
                self.images.push(imagePath);
                checkIndex++;
                checkNextImage();
            };
            
            img.onerror = function() {
                // JPG failed, try PNG
                var pngImg = new Image();
                var pngPath = self.imagesFolder + checkIndex + '.png';
                
                pngImg.onload = function() {
                    console.log('Found image:', pngPath);
                    self.images.push(pngPath);
                    checkIndex++;
                    checkNextImage();
                };
                
                pngImg.onerror = function() {
                    // Both formats failed, move to next number
                    checkIndex++;
                    checkNextImage();
                };
                
                pngImg.src = pngPath;
            };
            
            img.src = imagePath;
        }
        
        function finishLoading() {
            if (self.images.length === 0) {
                console.log('No numbered images found, checking common names...');
                checkCommonImages();
            } else {
                console.log('Found ' + self.images.length + ' images');
                resolve();
            }
        }
        
        function checkCommonImages() {
            var commonNames = [
                'background.jpg', 'image1.jpg', 'slide1.jpg',
                'display.jpg', 'photo.jpg', 'img1.jpg'
            ];
            var checked = 0;
            
            for (var i = 0; i < commonNames.length; i++) {
                (function(index) {
                    var img = new Image();
                    var path = self.imagesFolder + commonNames[index];
                    
                    img.onload = function() {
                        self.images.push(path);
                        console.log('Found common image:', path);
                    };
                    
                    img.onerror = function() {
                        // Try PNG version
                        var pngPath = path.replace('.jpg', '.png');
                        var pngImg = new Image();
                        
                        pngImg.onload = function() {
                            self.images.push(pngPath);
                            console.log('Found common image:', pngPath);
                        };
                        
                        pngImg.src = pngPath;
                    };
                    
                    img.src = path;
                    checked++;
                    
                    if (checked === commonNames.length) {
                        // All checked, use placeholder if still empty
                        if (self.images.length === 0) {
                            self.images.push('https://via.placeholder.com/800x450/333/fff?text=Add+images+to+images/+folder');
                            console.log('No images found, using placeholder');
                        }
                        resolve();
                    }
                })(i);
            }
        }
        
        // Start checking images
        checkNextImage();
    });
};

YouTubeKiosk.prototype.setupImageSlideshow = function() {
    if (this.images.length === 0) {
        console.log('No images to display');
        return;
    }
    
    console.log('Setting up slideshow with ' + this.images.length + ' images');
    
    var self = this;
    
    // Show first image immediately
    this.displayCurrentImage();
    
    // Setup timer for slideshow (10 seconds per image)
    this.imageTimer = setInterval(function() {
        self.nextImage();
    }, 10000);
    
    // Also update image timer display
    this.updateImageTimer();
};

YouTubeKiosk.prototype.displayCurrentImage = function() {
    if (this.images.length === 0) return;
    
    var imgElement = document.getElementById('mainImage');

    
    if (!imgElement) {
        console.error('Image element not found');
        return;
    }
    
    var self = this;
    
    // Get current image path
    var imagePath = this.images[this.currentImageIndex];
    
    // Preload image first
    var preloadImg = new Image();
    preloadImg.onload = function() {
        // When loaded, display it with fade effect
        imgElement.style.opacity = '0';
        
        setTimeout(function() {
            imgElement.src = imagePath;
            
            
            // Update counter
            self.updateImageCounter();
            
            // Fade in
            setTimeout(function() {
                imgElement.style.opacity = '1';
            }, 50);
        }, 300);
    };
    
    preloadImg.onerror = function() {
        console.error('Failed to load image:', imagePath);
        // Skip to next image on error
        setTimeout(function() {
            self.nextImage();
        }, 1000);
    };
    
    preloadImg.src = imagePath;
};

YouTubeKiosk.prototype.nextImage = function() {
    if (this.images.length <= 1) return;
    
    this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    this.displayCurrentImage();
};

YouTubeKiosk.prototype.updateImageCounter = function() {
    if (this.images.length === 0) return;
    
    var counterElement = document.getElementById('imageCounter');
    if (counterElement) {
        counterElement.textContent = (this.currentImageIndex + 1) + '/' + this.images.length;
    }
};

YouTubeKiosk.prototype.updateImageTimer = function() {
    if (this.images.length <= 1) return;
    
    var self = this;
    var seconds = 10;
    
    // Update timer every second
    var timerInterval = setInterval(function() {
        seconds--;
        
        if (seconds <= 0) {
            seconds = 10;
        }

    }, 1000);
    
    // Store interval ID to clear later if needed
    this.imageTimerInterval = timerInterval;
};
YouTubeKiosk.prototype.debugImageLoading = function() {
    console.log('=== IMAGE DEBUG INFO ===');
    console.log('Images folder:', this.imagesFolder);
    console.log('Images array:', this.images);
    console.log('Current index:', this.currentImageIndex);
    
    // Test if folder exists
    var testImg = new Image();
    testImg.onload = function() {
        console.log('✅ Images folder is accessible');
    };
    testImg.onerror = function() {
        console.error('❌ Cannot access images folder');
    };
    testImg.src = this.imagesFolder + 'test.jpg';
};
// ==================== UTILITY FUNCTIONS ====================
YouTubeKiosk.prototype.startClock = function() {
    var self = this;
    
    function updateClock() {
        var now = new Date();
        var timeString = now.toLocaleTimeString();
        
        // Update all time displays
        var timeElements = document.querySelectorAll('#currentTime, #headerTime, #footerTime');
        for (var i = 0; i < timeElements.length; i++) {
            if (timeElements[i]) {
                timeElements[i].textContent = timeString;
            }
        }
    }
    
    updateClock();
    setInterval(updateClock, 1000);
};

YouTubeKiosk.prototype.updateStatus = function(message) {
    var statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }
};

YouTubeKiosk.prototype.showError = function(message) {
    console.error('Kiosk Error:', message);
    
    // Simple error display
    var errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255,0,0,0.9);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 9999;
        max-width: 80%;
        text-align: center;
    `;
    errorDiv.innerHTML = '<strong>⚠️</strong> ' + message;
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(function() {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
};

// ==================== START KIOSK ====================
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure DOM is ready
    setTimeout(function() {
        window.kiosk = new YouTubeKiosk();
        window.kiosk.initialize();
    }, 500);
});

// Global function for manual control (optional)
function nextKioskVideo() {
    if (window.kiosk) {
        window.kiosk.nextVideo();
    }
}

function nextKioskImage() {
    if (window.kiosk) {
        window.kiosk.nextImage();
    }
}