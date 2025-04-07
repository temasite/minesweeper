/**
 * Game Settings
 * Contains difficulty levels and configurations for the Sapper game
 */

const GAME_SETTINGS = {
    // Difficulty levels
    difficulties: {
        easy: {
            name: 'Easy',
            rows: 9,
            columns: 9,
            mines: 10,
            cellSize: 45
        },
        medium: {
            name: 'Medium',
            rows: 16,
            columns: 16,
            mines: 40,
            cellSize: 38
        },
        hard: {
            name: 'Hard',
            rows: 16,
            columns: 30,
            mines: 99,
            cellSize: 32
        }
    },
    
    // Game status
    status: {
        READY: 'ready',
        PLAYING: 'playing',
        WON: 'won',
        LOST: 'lost'
    },
    
    // Cell states
    cellState: {
        HIDDEN: 'hidden',
        REVEALED: 'revealed',
        FLAGGED: 'flagged'
    },
    
    // Game visuals
    visuals: {
        mineEmoji: '💣',
        flagEmoji: '🚩',
        defaultCellContent: ''
    },
    
    // Game timing
    timing: {
        timerInterval: 1000 // 1 second
    },
    
    // Mobile settings
    mobile: {
        // Threshold for considering a device as mobile
        maxWidthThreshold: 500,
        
        // Long press duration for flagging on mobile (in milliseconds)
        longPressDuration: 500
    }
};

// Dynamically adjust cell size based on screen size
function getAdjustedCellSize(difficulty) {
    const isMobile = window.innerWidth <= GAME_SETTINGS.mobile.maxWidthThreshold;
    let size = GAME_SETTINGS.difficulties[difficulty].cellSize;
    
    if (isMobile) {
        // Keep cell size consistent on mobile, board will scroll
        // For easy level, we can still make it fit without scrolling
        if (difficulty === 'easy') {
            const containerWidth = Math.min(window.innerWidth - 40, 460);
            const columns = GAME_SETTINGS.difficulties[difficulty].columns;
            const totalGapWidth = (columns - 1) * 2;
            const calculatedSize = Math.floor((containerWidth - totalGapWidth) / columns);
            size = Math.min(calculatedSize, size);
        } else {
            // For medium and hard, use a fixed reasonable size and let it scroll
            size = Math.min(size, 32);
        }
        
        // Ensure minimum size
        size = Math.max(size, 28);
    } else {
        // For desktop, we can make the cells larger since container is bigger
        const containerWidth = 760; // 800px - 40px padding
        const columns = GAME_SETTINGS.difficulties[difficulty].columns;
        const totalGapWidth = (columns - 1) * 2;
        
        // Allow larger cells if they'll fit in the container
        const calculatedSize = Math.floor((containerWidth - totalGapWidth) / columns);
        size = Math.min(calculatedSize, size);
    }
    
    return size;
}

// Export settings if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GAME_SETTINGS, getAdjustedCellSize };
} 