class YouTubeKiosk {
    constructor() {
        this.playlist = [];
        this.currentVideoIndex = 0;
        this.player = null;
        this.images = [];
        this.currentImageIndex = 0;
        this.playlistUrl = 'playlist.txt';
        this.imagesFolder = 'images/';
        this.isPlayerReady = false;
        this.imageTransitionInterval = null;
        this.hasUserInteracted = false;
        this.youtubeAPIReady = false;
        
        // Store YouTube API state globally
        window.youtubePlayer = null;
        window.youtubePlayerState = null;
    }

    async initialize() {
        console.log('🚀 Initializing YouTube Kiosk...');
        
        try {
            // Load playlist and images
            await Promise.all([
                this.loadPlaylist(),
                this.loadImages()
            ]);
            
            console.log(`✅ Loaded ${this.playlist.length} videos, ${this.images.length} images`);
            
            // Setup image slideshow
            this.setupImageSlideshow();
            
            // Setup YouTube player
            this.setupYouTubePlayer();
            
            // Start clock
            this.startClock();
            
            // Setup click-to-start workaround
            this.setupUserInteraction();
            
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError(`Setup error: ${error.message}`);
        }
    }

    async loadPlaylist() {
        try {
            console.log('📥 Loading playlist...');
            const response = await fetch(this.playlistUrl + '?t=' + Date.now());
            
            if (!response.ok) {
                throw new Error(`File not found: ${this.playlistUrl}`);
            }
            
            const text = await response.text();
            console.log('📄 Playlist content:', text);
            this.parsePlaylist(text);
            
            // If playlist is empty, add default test videos
            if (this.playlist.length === 0) {
                console.log('⚠️ Playlist empty, adding test videos');
                this.playlist = [
                    { id: 'dQw4w9WgXcQ', title: 'Test Video 1' },
                    { id: '9bZkp7q19f0', title: 'Test Video 2' },
                    { id: 'kJQP7kiw5Fk', title: 'Test Video 3' }
                ];
            }
            
            console.log(`📼 Parsed ${this.playlist.length} videos:`, this.playlist);
            this.updateVideoCounter();
            
        } catch (error) {
            console.error('Playlist loading error:', error);
            throw error;
        }
    }

    parsePlaylist(text) {
        this.playlist = [];
        const lines = text.split('\n');
        
        lines.forEach((line, index) => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const videoId = this.extractYouTubeId(line);
                if (videoId) {
                    this.playlist.push({
                        id: videoId,
                        title: `Video ${index + 1}`,
                        originalUrl: line
                    });
                } else {
                    console.log(`⚠️ Could not extract ID from: "${line}"`);
                }
            }
        });
    }

    extractYouTubeId(url) {
        url = url.trim();
        
        // Test various URL patterns
        const testPatterns = [
            /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        
        for (const pattern of testPatterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                console.log(`✅ Extracted ID "${match[1]}" from "${url}"`);
                return match[1];
            }
        }
        
        console.log(`❌ No valid ID found in "${url}"`);
        return null;
    }

    async loadImages() {
        console.log('🖼️ Loading images...');
        this.images = [];
        
        // Find numbered images
        for (let i = 1; i <= 20; i++) {
            const possibleNames = [
                `${this.imagesFolder}${i}.jpg`,
                `${this.imagesFolder}${i}.png`,
                `${this.imagesFolder}${i}.jpeg`,
                `${this.imagesFolder}image${i}.jpg`,
                `${this.imagesFolder}pic${i}.png`
            ];
            
            for (const imagePath of possibleNames) {
                if (await this.fileExists(imagePath)) {
                    this.images.push(imagePath);
                    console.log(`✅ Found image: ${imagePath}`);
                    break;
                }
            }
        }
        
        this.updateImageCounter();
    }

    async fileExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    setupImageSlideshow() {
        if (this.images.length === 0) return;
        
        const imgElement = document.getElementById('mainImage');
        
        const imageCounter = document.getElementById('imageCounter');
        
        // Show first image
        this.currentImageIndex = 0;
        this.displayImage(imgElement,imageCounter);
        
        // Change image every 10 seconds
        this.imageTransitionInterval = setInterval(() => {
            this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
            this.displayImage(imgElement, imageCounter);
        }, 10000);
        
        console.log(`🔄 Image slideshow started: ${this.images.length} images`);
    }

    displayImage(imgElement, counterElement) {
        if (this.images.length === 0) return;
        
        // Fade out
        imgElement.style.opacity = '0';
        
        setTimeout(() => {
            // Load new image
            imgElement.src = this.images[this.currentImageIndex];
            
            // Update info
            const imageName = this.images[this.currentImageIndex].split('/').pop();
            
            this.updateImageCounter();
            
            // Fade in
            setTimeout(() => {
                imgElement.style.opacity = '1';
            }, 50);
        }, 300);
    }

    updateImageCounter() {
        if (this.images.length === 0) return;
        
        const counterElement = document.getElementById('imageCounter');
        if (counterElement) {
            counterElement.textContent = `${this.currentImageIndex + 1}/${this.images.length}`;
        }
    }

    updateVideoCounter() {
        if (this.playlist.length === 0) return;
        
        const counterElement = document.getElementById('videoCounter');
        if (counterElement) {
            counterElement.textContent = `${this.currentVideoIndex + 1}/${this.playlist.length}`;
        }
    }

    setupYouTubePlayer() {
        console.log('🎬 Setting up YouTube player...');
        
        // Check if YouTube API is already loaded
        if (window.YT && window.YT.Player) {
            console.log('✅ YouTube API already loaded');
            this.createPlayer();
        } else {
            console.log('📥 Loading YouTube API...');
            this.loadYouTubeAPI();
        }
    }

    loadYouTubeAPI() {
        // Create script tag for YouTube IFrame API
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        
        // Insert before first script tag
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        // Set global callback
        window.onYouTubeIframeAPIReady = () => {
            console.log('✅ YouTube IFrame API Ready!');
            this.youtubeAPIReady = true;
            this.createPlayer();
        };
        
        // Fallback in case callback doesn't fire
        setTimeout(() => {
            if (window.YT && window.YT.Player && !this.player) {
                console.log('🔄 YouTube API loaded (fallback detection)');
                this.createPlayer();
            }
        }, 3000);
    }

    createPlayer() {
        if (this.playlist.length === 0) {
            console.error('❌ No videos in playlist to play');
            return;
        }
        
        console.log(`🎥 Creating player with video: ${this.playlist[0].id}`);
        
        try {
            // Make sure player container exists
            let playerContainer = document.getElementById('player');
            if (!playerContainer) {
                console.error('❌ Player container not found');
                return;
            }
            
            // Clear any existing content
            playerContainer.innerHTML = '';
            
            // Create the YouTube player
            this.player = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: this.playlist[0].id,
                playerVars: {
                    'autoplay': 0, // Start with autoplay disabled (browser restrictions)
                    'controls': 0,
                    'disablekb': 1,
                    'fs': 0,
                    'iv_load_policy': 3,
                    'modestbranding': 1,
                    'playsinline': 1,
                    'rel': 0,
                    'showinfo': 0,
                    'enablejsapi': 1,
                    'origin': window.location.origin
                },
                events: {
                    'onReady': (event) => this.onPlayerReady(event),
                    'onStateChange': (event) => this.onPlayerStateChange(event),
                    'onError': (event) => this.onPlayerError(event)
                }
            });
            
            // Store globally for debugging
            window.youtubePlayer = this.player;
            
        } catch (error) {
            console.error('❌ Error creating YouTube player:', error);
            console.log('🔄 Will retry in 3 seconds...');
            setTimeout(() => this.createPlayer(), 3000);
        }
    }

    onPlayerReady(event) {
        console.log('✅ YouTube Player Ready!');
        this.isPlayerReady = true;
        this.updateVideoInfo();
        
        // Show play button overlay (autoplay is blocked by browsers)
        this.showPlayOverlay();
        
        // Try muted autoplay (has higher chance of working)
        try {
            event.target.mute();
            setTimeout(() => {
                event.target.playVideo();
                console.log('▶️ Attempting muted autoplay...');
            }, 1000);
        } catch (error) {
            console.log('⚠️ Autoplay failed, waiting for user interaction');
        }
    }

    onPlayerStateChange(event) {
        // Store state globally for debugging
        window.youtubePlayerState = event.data;
        
        const states = {
            '-1': 'unstarted',
            '0': 'ended',
            '1': 'playing',
            '2': 'paused',
            '3': 'buffering',
            '5': 'video cued'
        };
        
        console.log(`📊 Player state: ${event.data} (${states[event.data] || 'unknown'})`);
        
        switch(event.data) {
            case YT.PlayerState.ENDED:
                console.log('⏹️ Video ended, playing next');
                this.playNextVideo();
                break;
            case YT.PlayerState.PLAYING:
                console.log('▶️ Video is playing');
                this.hidePlayOverlay();
                this.updateStatus(`Playing: ${this.playlist[this.currentVideoIndex].title}`);
                break;
            case YT.PlayerState.PAUSED:
                console.log('⏸️ Video paused');
                this.updateStatus('Paused');
                break;
        }
    }

    onPlayerError(event) {
        console.error('❌ YouTube Player Error:', event.data);
        
        const errorMessages = {
            2: 'Invalid parameter',
            5: 'HTML5 error',
            100: 'Video not found',
            101: 'Not embeddable',
            150: 'Not embeddable'
        };
        
        const message = errorMessages[event.data] || `Error code: ${event.data}`;
        console.log(`🔄 Skipping video due to: ${message}`);
        
        // Skip to next video
        setTimeout(() => this.playNextVideo(), 2000);
    }

    playNextVideo() {
        if (this.playlist.length === 0) return;
        
        this.currentVideoIndex = (this.currentVideoIndex + 1) % this.playlist.length;
        const nextVideo = this.playlist[this.currentVideoIndex];
        
        console.log(`🔄 Switching to video ${this.currentVideoIndex + 1}: ${nextVideo.id}`);
        
        if (this.player && this.player.loadVideoById) {
            this.player.loadVideoById(nextVideo.id);
            this.updateVideoInfo();
        } else {
            console.error('Player not ready, will retry...');
            setTimeout(() => this.playNextVideo(), 1000);
        }
    }

    updateVideoInfo() {
        if (this.playlist.length === 0) return;
        
        const video = this.playlist[this.currentVideoIndex];
        
        this.updateVideoCounter();
        this.updateStatus(`Video ${this.currentVideoIndex + 1}/${this.playlist.length}`);
    }

    showPlayOverlay() {
        // Create play overlay
        const overlay = document.createElement('div');
        overlay.id = 'playOverlay';
        overlay.innerHTML = `
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100;
            ">
                <div style="
                    background: rgba(0,0,0,0.9);
                    padding: 30px;
                    border-radius: 10px;
                    text-align: center;
                    border: 2px solid #fff;
                    color: white;
                ">
                    <div style="font-size: 60px; margin-bottom: 20px;">▶️</div>
                    <h3 style="margin-bottom: 10px;">Click to Start Videos</h3>
                    <p>Browser requires interaction to play videos</p>
                    <button id="startVideosBtn" style="
                        background: #ff0000;
                        color: white;
                        border: none;
                        padding: 10px 30px;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        margin-top: 20px;
                    ">
                        Start Video Playlist
                    </button>
                </div>
            </div>
        `;
        
        const playerContainer = document.getElementById('player');
        if (playerContainer) {
            playerContainer.appendChild(overlay);
            
            // Add click handler
            document.getElementById('startVideosBtn').onclick = (e) => {
                e.stopPropagation();
                this.startVideoPlayback();
            };
            
            // Also allow clicking anywhere on overlay
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    this.startVideoPlayback();
                }
            };
        }
    }

    hidePlayOverlay() {
        const overlay = document.getElementById('playOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    startVideoPlayback() {
        console.log('🎬 Starting video playback...');
        this.hasUserInteracted = true;
        
        if (this.player) {
            try {
                // Unmute and play
                this.player.unMute();
                this.player.playVideo();
                this.hidePlayOverlay();
                console.log('🔊 Unmuted and started playback');
            } catch (error) {
                console.error('Error starting playback:', error);
            }
        }
    }

    setupUserInteraction() {
        // Allow clicking anywhere on page to start videos
        document.addEventListener('click', () => {
            if (!this.hasUserInteracted && this.player) {
                this.startVideoPlayback();
            }
        });
        
        // Also listen for keypress
        document.addEventListener('keydown', () => {
            if (!this.hasUserInteracted && this.player) {
                this.startVideoPlayback();
            }
        });
    }

    startClock() {
        const updateClock = () => {
            const now = new Date();
            
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    updateStatus(message) {
        
    }

    showError(message) {
        console.error('Displaying error:', message);
        
        // Simple error display
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255,0,0,0.9);
            color: white;
            padding: 15px 30px;
            border-radius: 5px;
            z-index: 9999;
            max-width: 80%;
            text-align: center;
        `;
        errorDiv.innerHTML = `<strong>⚠️ Error:</strong> ${message}`;
        document.body.appendChild(errorDiv);
        
        // Remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 10000);
    }
}

// Debug helper
window.debugKiosk = function() {
    console.log('=== KIOSK DEBUG INFO ===');
    console.log('YouTube API loaded:', !!window.YT);
    console.log('Player instance:', window.kiosk?.player);
    console.log('Playlist:', window.kiosk?.playlist);
    console.log('Current video index:', window.kiosk?.currentVideoIndex);
    console.log('Player state:', window.youtubePlayerState);
    console.log('========================');
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing kiosk...');
    window.kiosk = new YouTubeKiosk();
    
    // Start initialization with small delay
    setTimeout(() => {
        window.kiosk.initialize();
    }, 500);
});