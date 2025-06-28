// Fox Go Rank Calculator

// Rules: [window_size, single_up_wins_req, double_up_wins_req, single_down_losses_req, double_down_losses_req]
const RULES = {
    "18k": [10,  6,  8,  null, null],
    "17k": [10,  6,  8,  7,    null],
    "16k": [10,  6,  8,  7,  9],
    "15k": [12,  7, 10,  8, 10],
    "14k": [12,  7, 10,  8, 10],
    "13k": [12,  7, 10,  8, 10],
    "12k": [14,  8, 12, 10, 12],
    "11k": [14,  8, 12, 10, 12],
    "10k": [14,  8, 12, 10, 12],
    "9k":  [16, 10, 14, 11, 14],
    "8k":  [16, 10, 14, 11, 14],
    "7k":  [16, 10, 14, 11, 14],
    "6k":  [16, 10, 14, 11, 14],
    "5k":  [18, 11, 15, 12, 16],
    "4k":  [18, 11, 15, 12, 16],
    "3k":  [18, 11, 15, 12, 16],
    "2k":  [19, 12, 16, 13, 17],
    "1k":  [19, 12, 16, 13, 17],
    "1d":  [19, 12, 16, 13, 17],
    "2d":  [19, 12, 16, 13, 17],
    "3d":  [20, 14, 18, 13, 17],
    "4d":  [20, 14, 18, 13, 17],
    "5d":  [20, 15, 20, 13, 17],
    "6d":  [20, 15, 20, 13, 17],
    "7d":  [20, 15, 20, 13, 17],
    "8d":  [20, 15, null, 13, 17],
    "9d":  [20, 18, null, 13, null]
};

function charToResult(c) {
    return c === "O";
}

function reachableFromAbove(grid, w, l) {
    if (w === 1 && l === 0) {
        return true;
    }
    if (l === 0) {
        return false;
    }
    const cell = grid.get(`${w},${l-1}`);
    return cell === 0 || cell === 12 || cell === -12;
}

function reachableFromLeft(grid, w, l) {
    if (w === 0 && l === 1) {
        return true;
    }
    if (w === 0) {
        return false;
    }
    const cell = grid.get(`${w-1},${l}`);
    return cell === 0 || cell === 12 || cell === -12;
}

function reachable(grid, w, l) {
    return reachableFromAbove(grid, w, l) || reachableFromLeft(grid, w, l);
}

function calculateGrid(rank, recentChars) {
    const recentResults = recentChars.split('').map(charToResult);
    
    if (!RULES[rank]) {
        throw new Error(`Invalid rank: ${rank}`);
    }
    
    const [windowSize, singleUpWinsReq, doubleUpWinsReq, singleDownLossesReq, doubleDownLossesReq] = RULES[rank];
    
    // Grid codes:
    //   2: double rank up
    //  12: waiting to double rank up
    //   1: single rank up
    //   0: no change
    //  -1: single rank down
    // -12: waiting to double rank down
    //  -2: double rank down
    
    // Create raw grid
    const grid = new Map();
    
    for (let numMoreGames = 1; numMoreGames <= windowSize; numMoreGames++) {
        const historicalGamesUsed = Math.min(windowSize - numMoreGames, recentResults.length);
        let historicalWins, historicalLosses;
        
        if (historicalGamesUsed > 0) {
            const recentGames = recentResults.slice(-historicalGamesUsed);
            historicalWins = recentGames.filter(x => x).length;
            historicalLosses = historicalGamesUsed - historicalWins;
        } else {
            historicalWins = 0;
            historicalLosses = 0;
        }
        
        for (let w = 0; w <= numMoreGames; w++) {
            const l = numMoreGames - w;
            const key = `${w},${l}`;
            
            if (doubleUpWinsReq && w + historicalWins >= doubleUpWinsReq && w + recentResults.length <= windowSize) {
                grid.set(key, 2);
            } else if (singleUpWinsReq && w + historicalWins >= singleUpWinsReq) {
                grid.set(key, 1);
            } else if (doubleDownLossesReq && l + historicalLosses >= doubleDownLossesReq && l + recentResults.length <= windowSize) {
                grid.set(key, -2);
            } else if (singleDownLossesReq && l + historicalLosses >= singleDownLossesReq) {
                grid.set(key, -1);
            } else {
                grid.set(key, 0);
            }
        }
    }
    
    // Double-rank-ups: remove unreachable ones and set waiting cells
    for (let l = 0; l <= windowSize; l++) {
        for (let w = 0; w <= windowSize - l; w++) {
            const key = `${w},${l}`;
            if (grid.get(key) === 2) {
                // Remove cells with more wins (unreachable after double rank up)
                for (let w2 = w + 1; w2 <= windowSize - l; w2++) {
                    grid.delete(`${w2},${l}`);
                }
                // Set waiting cells (only cells that are currently single rank up)
                for (let w2 = 0; w2 < w; w2++) {
                    const key2 = `${w2},${l}`;
                    if (grid.get(key2) === 1) {
                        grid.set(key2, 12);
                    }
                }
                break;
            }
        }
    }
    
    // Same for double-rank-downs
    for (let w = 0; w <= windowSize; w++) {
        for (let l = 0; l <= windowSize - w; l++) {
            const key = `${w},${l}`;
            if (grid.get(key) === -2) {
                // Remove cells with more losses (unreachable after double rank down)
                for (let l2 = l + 1; l2 <= windowSize - w; l2++) {
                    grid.delete(`${w},${l2}`);
                }
                // Set waiting cells (only cells that are currently single rank down)
                for (let l2 = 0; l2 < l; l2++) {
                    const key2 = `${w},${l2}`;
                    if (grid.get(key2) === -1) {
                        grid.set(key2, -12);
                    }
                }
                break;
            }
        }
    }
    
    // Cull unreachable cells
    for (let numMoreGames = 1; numMoreGames <= windowSize; numMoreGames++) {
        for (let w = 0; w <= numMoreGames; w++) {
            const l = numMoreGames - w;
            const key = `${w},${l}`;
            if (grid.has(key) && !reachable(grid, w, l)) {
                grid.delete(key);
            }
        }
    }
    
    return grid;
}

function getCellClass(value) {
    switch (value) {
        case 2: return 'rank-double-up';
        case 12: return 'rank-waiting-up';
        case 1: return 'rank-single-up';
        case 0: return 'rank-stay';
        case -1: return 'rank-single-down';
        case -12: return 'rank-waiting-down';
        case -2: return 'rank-double-down';
        default: return '';
    }
}

function generateGrid(grid, rank) {
    if (!RULES[rank]) return '';
    
    // Find the range of wins and losses that have entries
    const validWins = new Set();
    const validLosses = new Set();
    
    for (const [key, value] of grid) {
        const [w, l] = key.split(',').map(Number);
        validWins.add(w);
        validLosses.add(l);
    }
    
    // If no entries, return empty
    if (validWins.size === 0) return '';
    
    // Convert to sorted arrays
    const validWinsArray = Array.from(validWins).sort((a, b) => a - b);
    const validLossesArray = Array.from(validLosses).sort((a, b) => a - b);
    
    let html = '<table class="grid-table">';
    
    // Generate rows
    for (let lossIndex = 0; lossIndex < validLossesArray.length; lossIndex++) {
        const l = validLossesArray[lossIndex];
        html += '<tr>';
        
        for (let winIndex = 0; winIndex < validWinsArray.length; winIndex++) {
            const w = validWinsArray[winIndex];
            
            // Special case for upper left cell
            if (lossIndex === 0 && winIndex === 0) {
                html += '<td style="font-weight: bold; white-space: nowrap;">W-L</td>';
                continue;
            }
            
            const key = `${w},${l}`;
            if (grid.has(key)) {
                const value = grid.get(key);
                const cellClass = getCellClass(value);
                const content = `${w}-${l}`;
                html += `<td class="${cellClass}">${content}</td>`;
            } else {
                html += '<td></td>';
            }
        }
        html += '</tr>';
    }
    
    html += '</table>';
    
    // Add legend
    html += '<div class="legend">';
    html += '<div class="legend-item"><div class="legend-color rank-double-up"></div>Double rank up</div>';
    html += '<div class="legend-item"><div class="legend-color rank-waiting-up"></div>Could double rank up</div>';
    html += '<div class="legend-item"><div class="legend-color rank-single-up"></div>Single rank up</div>';
    html += '<div class="legend-item"><div class="legend-color rank-stay"></div>Stay at current rank</div>';
    html += '<div class="legend-item"><div class="legend-color rank-single-down"></div>Single rank down</div>';
    html += '<div class="legend-item"><div class="legend-color rank-waiting-down"></div>Could double rank down</div>';
    html += '<div class="legend-item"><div class="legend-color rank-double-down"></div>Double rank down</div>';
    html += '</div>';
    
    return html;
}

function calculate() {
    const rank = document.getElementById('rank').value;
    const results = document.getElementById('results').value.trim().toUpperCase();
    const outputDiv = document.getElementById('output');
    const gridContainer = document.getElementById('grid-container');
    
    try {
        // Validate results string (empty string is allowed)
        for (let char of results) {
            if (char !== 'O' && char !== 'X') {
                outputDiv.textContent = `Invalid character '${char}' in results. Use only 'O' for wins and 'X' for losses.`;
                gridContainer.innerHTML = '';
                return;
            }
        }
        
        const grid = calculateGrid(rank, results);
        
        // Hide text output
        outputDiv.style.display = 'none';
        
        // Generate grid visualization
        const gridHtml = generateGrid(grid, rank);
        gridContainer.innerHTML = gridHtml;
        
    } catch (error) {
        outputDiv.textContent = `Error: ${error.message}`;
        gridContainer.innerHTML = '';
    }
}

// Allow Enter key to trigger calculation
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('results').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            calculate();
        }
    });
    
    // Calculate with default values on page load
    calculate();
});
