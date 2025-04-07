/**
 * Sapper Game
 * A minesweeper-like game built with vanilla JavaScript
 */

// Game state variables
let gameBoard = [];
let gameStatus = GAME_SETTINGS.status.READY;
let currentDifficulty = 'easy';
let minesCount = 0;
let flaggedCount = 0;
let timer = 0;
let timerInterval = null;
let firstClick = true;

// DOM Elements
const gameBoardElement = document.getElementById('game-board');
const minesCountElement = document.getElementById('mines-count');
const timerElement = document.getElementById('timer');
const difficultyModal = document.getElementById('difficulty-modal');
const gameOverModal = document.getElementById('game-over-modal');
const gameResultElement = document.getElementById('game-result');
const finalTimeElement = document.getElementById('final-time');
const newGameBtn = document.getElementById('new-game-btn');
const playAgainBtn = document.getElementById('play-again-btn');

// Difficulty buttons
const easyBtn = document.getElementById('easy-btn');
const mediumBtn = document.getElementById('medium-btn');
const hardBtn = document.getElementById('hard-btn');

// Mobile detection
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let longPressTimer = null;
let touchStartX = 0;
let touchStartY = 0;

// Initialize the game
function init() {
    // Set up event listeners
    easyBtn.addEventListener('click', () => selectDifficulty('easy'));
    mediumBtn.addEventListener('click', () => selectDifficulty('medium'));
    hardBtn.addEventListener('click', () => selectDifficulty('hard'));
    newGameBtn.addEventListener('click', showDifficultyModal);
    playAgainBtn.addEventListener('click', showDifficultyModal);
    
    // Show difficulty modal initially
    showDifficultyModal();
    
    // Listen for window resize to adjust board if necessary
    window.addEventListener('resize', debounce(() => {
        if (gameStatus !== GAME_SETTINGS.status.READY) {
            adjustBoardSize();
        }
    }, 250));

    document.addEventListener('dblclick', (event) => {
        event.preventDefault();
    })
}

// Select difficulty and start game
function selectDifficulty(difficulty) {
    currentDifficulty = difficulty;
    difficultyModal.classList.add('hidden');
    startGame();
}

// Show difficulty selection modal
function showDifficultyModal() {
    resetGame();
    difficultyModal.classList.remove('hidden');
    gameOverModal.classList.add('hidden');
}

// Start a new game
function startGame() {
    const difficultySettings = GAME_SETTINGS.difficulties[currentDifficulty];
    
    // Reset game state
    resetGame();
    
    // Setup game
    minesCount = difficultySettings.mines;
    flaggedCount = 0;
    gameStatus = GAME_SETTINGS.status.PLAYING;
    firstClick = true;
    
    // Update mines counter
    updateMinesCounter();
    
    // Create empty board
    createBoard();
    
    // Start timer
    startTimer();
}

// Reset game state
function resetGame() {
    gameBoard = [];
    gameStatus = GAME_SETTINGS.status.READY;
    stopTimer();
    timer = 0;
    timerElement.textContent = timer;
}

// Create the game board
function createBoard() {
    const { rows, columns } = GAME_SETTINGS.difficulties[currentDifficulty];
    const cellSize = getAdjustedCellSize(currentDifficulty);
    
    // Clear the board
    gameBoardElement.innerHTML = '';
    
    // Set CSS variables for grid size and cell size
    gameBoardElement.style.setProperty('--grid-size', columns);
    gameBoardElement.style.setProperty('--cell-size', `${cellSize}px`);
    
    // Create empty board
    gameBoard = Array(rows).fill().map(() => Array(columns).fill().map(() => ({
        isMine: false,
        state: GAME_SETTINGS.cellState.HIDDEN,
        adjacentMines: 0
    })));
    
    // Create board cells
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            // Add event listeners
            if (isMobile) {
                // Touch events for mobile
                cell.addEventListener('touchstart', handleTouchStart);
                cell.addEventListener('touchend', handleTouchEnd);
                cell.addEventListener('touchmove', handleTouchMove);
                cell.addEventListener('contextmenu', e => e.preventDefault());
            } else {
                // Mouse events for desktop
                cell.addEventListener('click', handleCellClick);
                cell.addEventListener('dblclick', handleCellDoubleClick);
                cell.addEventListener('contextmenu', handleCellRightClick);
            }
            
            gameBoardElement.appendChild(cell);
        }
    }
}

// Adjust board size on window resize
function adjustBoardSize() {
    const cellSize = getAdjustedCellSize(currentDifficulty);
    gameBoardElement.style.setProperty('--cell-size', `${cellSize}px`);
}

// Place mines randomly (avoiding first click)
function placeMines(firstRow, firstCol) {
    const { rows, columns, mines } = GAME_SETTINGS.difficulties[currentDifficulty];
    let minesPlaced = 0;
    
    while (minesPlaced < mines) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * columns);
        
        // Avoid placing mine at first click position or adjacent to it
        const isSafeZone = Math.abs(row - firstRow) <= 1 && Math.abs(col - firstCol) <= 1;
        
        if (!gameBoard[row][col].isMine && !isSafeZone) {
            gameBoard[row][col].isMine = true;
            minesPlaced++;
        }
    }
    
    // Calculate adjacent mines for each cell
    calculateAdjacentMines();
}

// Calculate number of adjacent mines for each cell
function calculateAdjacentMines() {
    const { rows, columns } = GAME_SETTINGS.difficulties[currentDifficulty];
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            if (gameBoard[row][col].isMine) continue;
            
            let count = 0;
            
            // Check all 8 adjacent cells
            for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
                for (let c = Math.max(0, col - 1); c <= Math.min(columns - 1, col + 1); c++) {
                    if (r === row && c === col) continue;
                    if (gameBoard[r][c].isMine) count++;
                }
            }
            
            gameBoard[row][col].adjacentMines = count;
        }
    }
}

// Handle cell click
function handleCellClick(e) {
    if (gameStatus !== GAME_SETTINGS.status.PLAYING) return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    
    revealCell(row, col);
}

// Add double-click handler
function handleCellDoubleClick(e) {
    if (gameStatus !== GAME_SETTINGS.status.PLAYING) return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const cell = gameBoard[row][col];
    
    // Only work on revealed cells with numbers
    if (cell.state === GAME_SETTINGS.cellState.REVEALED && cell.adjacentMines > 0) {
        revealAdjacentIfFlagged(row, col);
    }
}

// Handle right-click (flag)
function handleCellRightClick(e) {
    e.preventDefault();
    
    if (gameStatus !== GAME_SETTINGS.status.PLAYING) return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    
    toggleFlag(row, col);
}

// Handle touch start event for mobile
function handleTouchStart(e) {
    if (gameStatus !== GAME_SETTINGS.status.PLAYING) return;
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    
    // Start long press timer for flagging
    longPressTimer = setTimeout(() => {
        toggleFlag(row, col);
        longPressTimer = null;
    }, GAME_SETTINGS.mobile.longPressDuration);
}

// Handle touch end event for mobile
function handleTouchEnd(e) {
    if (gameStatus !== GAME_SETTINGS.status.PLAYING) return;
    
    const now = new Date().getTime();
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const cell = gameBoard[row][col];
    
    // For double tap detection
    if (e.target.lastTap && (now - e.target.lastTap) < 300 && 
        cell.state === GAME_SETTINGS.cellState.REVEALED && 
        cell.adjacentMines > 0) {
        
        // Double tap on a number
        revealAdjacentIfFlagged(row, col);
        e.target.lastTap = 0; // Reset
        
        // Clear long press timer if it exists
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        return;
    }
    
    // Clear long press timer if it exists
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        
        // If not a long press, treat as normal click
        revealCell(row, col);
    }
    
    // Store timestamp for double tap detection
    e.target.lastTap = now;
    longPressTimer = null;
}

// Handle touch move event for mobile
function handleTouchMove(e) {
    if (longPressTimer) {
        const touch = e.touches[0];
        const moveThreshold = 10; // pixels
        
        // Cancel long press if finger moved too much
        if (Math.abs(touch.clientX - touchStartX) > moveThreshold || 
            Math.abs(touch.clientY - touchStartY) > moveThreshold) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }
}

// Reveal a cell
function revealCell(row, col) {
    // Get cell and its state
    const cell = gameBoard[row][col];
    
    // Skip if cell is already revealed or flagged
    if (cell.state !== GAME_SETTINGS.cellState.HIDDEN) return;
    
    // On first click, place mines ensuring first click is safe
    if (firstClick) {
        placeMines(row, col);
        firstClick = false;
    }
    
    // Update cell state
    cell.state = GAME_SETTINGS.cellState.REVEALED;
    
    // Update cell appearance
    updateCellDisplay(row, col);
    
    // If clicked on a mine, game over
    if (cell.isMine) {
        revealAllMines();
        endGame(false);
        return;
    }
    
    // If cell has no adjacent mines, reveal neighbors recursively
    if (cell.adjacentMines === 0) {
        revealAdjacentCells(row, col);
    }
    
    // Check if player has won
    checkWinCondition();
}

// Toggle flag on a cell
function toggleFlag(row, col) {
    // Get cell and its state
    const cell = gameBoard[row][col];
    
    // Skip if cell is already revealed
    if (cell.state === GAME_SETTINGS.cellState.REVEALED) return;
    
    // Toggle flag
    if (cell.state === GAME_SETTINGS.cellState.FLAGGED) {
        cell.state = GAME_SETTINGS.cellState.HIDDEN;
        flaggedCount--;
    } else {
        // Don't allow flagging more cells than there are mines
        if (flaggedCount >= minesCount) return;
        
        cell.state = GAME_SETTINGS.cellState.FLAGGED;
        flaggedCount++;
    }
    
    // Update cell appearance
    updateCellDisplay(row, col);
    
    // Update mines counter
    updateMinesCounter();
    
    // Check if player has won
    checkWinCondition();
}

// Recursively reveal adjacent cells (for empty cells)
function revealAdjacentCells(row, col) {
    const { rows, columns } = GAME_SETTINGS.difficulties[currentDifficulty];
    
    // Check all 8 adjacent cells
    for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(columns - 1, col + 1); c++) {
            // Skip the center cell (already revealed)
            if (r === row && c === col) continue;
            
            // Reveal adjacent cells that are still hidden
            if (gameBoard[r][c].state === GAME_SETTINGS.cellState.HIDDEN) {
                revealCell(r, c);
            }
        }
    }
}

// Update cell display based on its state
function updateCellDisplay(row, col) {
    const cellElement = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    const cell = gameBoard[row][col];
    
    // Reset cell classes and content
    cellElement.className = 'cell';
    cellElement.textContent = GAME_SETTINGS.visuals.defaultCellContent;
    cellElement.removeAttribute('data-mines');
    
    // Update display based on cell state
    if (cell.state === GAME_SETTINGS.cellState.REVEALED) {
        cellElement.classList.add('revealed');
        
        if (cell.isMine) {
            cellElement.classList.add('mine');
            cellElement.textContent = GAME_SETTINGS.visuals.mineEmoji;
        } else if (cell.adjacentMines > 0) {
            cellElement.textContent = cell.adjacentMines;
            cellElement.setAttribute('data-mines', cell.adjacentMines);
        }
    } else if (cell.state === GAME_SETTINGS.cellState.FLAGGED) {
        cellElement.classList.add('flagged');
        cellElement.textContent = GAME_SETTINGS.visuals.flagEmoji;
    }
}

// Reveal all mines when game is over
function revealAllMines() {
    const { rows, columns } = GAME_SETTINGS.difficulties[currentDifficulty];
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const cell = gameBoard[row][col];
            
            if (cell.isMine) {
                cell.state = GAME_SETTINGS.cellState.REVEALED;
                updateCellDisplay(row, col);
            }
        }
    }
}

// Check if player has won
function checkWinCondition() {
    const { rows, columns, mines } = GAME_SETTINGS.difficulties[currentDifficulty];
    let hiddenCount = 0;
    
    // Count hidden cells
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            if (gameBoard[row][col].state !== GAME_SETTINGS.cellState.REVEALED) {
                hiddenCount++;
            }
        }
    }
    
    // If number of hidden cells equals number of mines, player wins
    if (hiddenCount === mines) {
        endGame(true);
    }
}

// End the game (win or lose)
function endGame(isWin) {
    gameStatus = isWin ? GAME_SETTINGS.status.WON : GAME_SETTINGS.status.LOST;
    stopTimer();
    
    // Show game over modal
    gameResultElement.textContent = isWin ? 'You Won!' : 'Game Over';
    finalTimeElement.textContent = timer;
    gameOverModal.classList.remove('hidden');
}

// Update mines counter display
function updateMinesCounter() {
    minesCountElement.textContent = minesCount - flaggedCount;
}

// Start the timer
function startTimer() {
    stopTimer();
    timer = 0;
    timerElement.textContent = timer;
    
    timerInterval = setInterval(() => {
        timer++;
        timerElement.textContent = timer;
    }, GAME_SETTINGS.timing.timerInterval);
}

// Stop the timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Utility function: Debounce
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Reveal adjacent cells if the correct number of flags are placed
function revealAdjacentIfFlagged(row, col) {
    const { rows, columns } = GAME_SETTINGS.difficulties[currentDifficulty];
    const cell = gameBoard[row][col];
    
    // Count flagged cells around this cell
    let flaggedCount = 0;
    let hiddenCells = [];
    
    for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(columns - 1, col + 1); c++) {
            if (r === row && c === col) continue;
            
            const adjacentCell = gameBoard[r][c];
            if (adjacentCell.state === GAME_SETTINGS.cellState.FLAGGED) {
                flaggedCount++;
            } else if (adjacentCell.state === GAME_SETTINGS.cellState.HIDDEN) {
                hiddenCells.push({ row: r, col: c });
            }
        }
    }
    
    // If the number of flags matches the number on the cell, reveal all non-flagged cells
    if (flaggedCount === cell.adjacentMines) {
        hiddenCells.forEach(pos => {
            revealCell(pos.row, pos.col);
        });
    }
}

// Initialize the game when the page loads
window.addEventListener('load', init); 