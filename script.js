// Team players database
const players = [
    { id: 1, name: 'Josh Mole' },
    { id: 2, name: 'Ben Teagle' },
    { id: 3, name: 'Oscar Flack' },
    { id: 4, name: 'Matt Dungate' },
    { id: 5, name: 'Nathan Robinson' },
    { id: 6, name: 'Joe Wakeham' },
    { id: 7, name: 'Harvey Payne' },
    { id: 8, name: 'Ellie Morris' },
    { id: 9, name: 'Jamie Evans' },
    { id: 10, name: 'Luke Fountain' },
    { id: 11, name: 'Jordan Green' }
];

// Data storage
let matches = JSON.parse(localStorage.getItem('matches')) || [];
let playerStats = JSON.parse(localStorage.getItem('playerStats')) || {};
let gameStats = {}; // Temporary storage for current match stats
let singlesSortColumn = null;
let singlesSortDirection = 'asc';
let doublesSortColumn = null;
let doublesSortDirection = 'asc';

// Initialize player stats if empty
if (Object.keys(playerStats).length === 0) {
    players.forEach(player => {
        playerStats[player.id] = {
            name: player.name,
            doubles: { matches: 0, wins: 0, legs: 0, legWins: 0, total180s: 0, highCheckouts: [] },
            singles: { matches: 0, wins: 0, legs: 0, legWins: 0, total180s: 0, highCheckouts: [] }
        };
    });
}

// Navigation
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    if (sectionId === 'match-entry') {
        initializeMatchEntry();
    } else if (sectionId === 'statistics') {
        updateStatistics();
    } else if (sectionId === 'players') {
        displayPlayers();
    } else if (sectionId === 'dashboard') {
        updateDashboard();
    } else if (sectionId === 'team-selector') {
        try {
            initializeCrawleyTeamSelector();
        } catch (error) {
            console.error('Error initializing team selector:', error);
        }
    }
}

// Initialize match entry form
function initializeMatchEntry() {
    gameStats = {}; // Reset game stats
    createDoublesGames();
    createSinglesGames();
    document.getElementById('match-date').valueAsDate = new Date();
}

// Get players playing in a specific game
function getGamePlayers(gameType, gameIndex) {
    const gamePlayers = [];

    if (gameType === 'doubles') {
        const player1Id = document.getElementById(`doubles-${gameIndex}-player1`).value;
        const player2Id = document.getElementById(`doubles-${gameIndex}-player2`).value;

        if (player1Id) {
            const player1 = players.find(p => p.id == player1Id);
            if (player1) gamePlayers.push(player1);
        }

        if (player2Id) {
            const player2 = players.find(p => p.id == player2Id);
            if (player2) gamePlayers.push(player2);
        }
    } else if (gameType === 'singles') {
        const playerId = document.getElementById(`singles-${gameIndex}-player`).value;

        if (playerId) {
            const player = players.find(p => p.id == playerId);
            if (player) gamePlayers.push(player);
        }
    }

    return gamePlayers;
}

// Add player-specific stats (180s or checkouts)
function addPlayerStat(gameType, gameIndex, statType) {
    const gameKey = `${gameType}-${gameIndex}`;

    if (!gameStats[gameKey]) {
        gameStats[gameKey] = { stats180s: [], checkouts: [] };
    }

    if (gameType === 'singles') {
        // For singles, automatically use the selected player
        const playerId = document.getElementById(`singles-${gameIndex}-player`).value;

        if (!playerId) {
            alert('Please select a player for this singles game first.');
            return;
        }

        if (statType === '180s') {
            gameStats[gameKey].stats180s.push({ playerId: parseInt(playerId) });
            updateStatDisplay(gameType, gameIndex, '180s');
        } else if (statType === 'checkout') {
            showSinglesCheckoutModal(gameType, gameIndex, parseInt(playerId), (checkoutValue) => {
                gameStats[gameKey].checkouts.push({ playerId: parseInt(playerId), value: parseInt(checkoutValue) });
                updateStatDisplay(gameType, gameIndex, 'checkout');
            });
        }
    } else {
        // For doubles, show player selection modal as before
        if (statType === '180s') {
            showPlayerStatModal(gameType, gameIndex, '180', (playerId) => {
                gameStats[gameKey].stats180s.push({ playerId: parseInt(playerId) });
                updateStatDisplay(gameType, gameIndex, '180s');
            });
        } else if (statType === 'checkout') {
            showCheckoutModal(gameType, gameIndex, (playerId, checkoutValue) => {
                gameStats[gameKey].checkouts.push({ playerId: parseInt(playerId), value: parseInt(checkoutValue) });
                updateStatDisplay(gameType, gameIndex, 'checkout');
            });
        }
    }
}

function showPlayerStatModal(gameType, gameIndex, statType, callback) {
    // Get the players who are actually playing in this game
    const gamePlayers = getGamePlayers(gameType, gameIndex);

    if (gamePlayers.length === 0) {
        alert('Please select the players for this game first before adding stats.');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Add ${statType} - ${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Game ${gameIndex + 1}</h3>
            <select id="stat-player-select">
                <option value="">Select Player</option>
                ${gamePlayers.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
            <div class="modal-buttons">
                <button onclick="handleStatAdd('${gameType}', ${gameIndex}, '${statType}')">Add ${statType}</button>
                <button onclick="closeModal()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Store callback for later use
    window.currentStatCallback = callback;
}

function showCheckoutModal(gameType, gameIndex, callback) {
    // Get the players who are actually playing in this game
    const gamePlayers = getGamePlayers(gameType, gameIndex);

    if (gamePlayers.length === 0) {
        alert('Please select the players for this game first before adding stats.');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Add High Checkout - ${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Game ${gameIndex + 1}</h3>
            <select id="checkout-player-select">
                <option value="">Select Player</option>
                ${gamePlayers.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
            <input type="number" id="checkout-value" min="100" max="170" placeholder="Checkout value (100-170)">
            <div class="modal-buttons">
                <button onclick="handleCheckoutAdd('${gameType}', ${gameIndex})">Add Checkout</button>
                <button onclick="closeModal()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Store callback for later use
    window.currentCheckoutCallback = callback;
}

function showSinglesCheckoutModal(gameType, gameIndex, playerId, callback) {
    const playerName = players.find(p => p.id === playerId)?.name || 'Unknown';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Add High Checkout - ${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Game ${gameIndex + 1}</h3>
            <p><strong>Player:</strong> ${playerName}</p>
            <input type="number" id="singles-checkout-value" min="100" max="170" placeholder="Checkout value (100-170)">
            <div class="modal-buttons">
                <button onclick="handleSinglesCheckoutAdd()">Add Checkout</button>
                <button onclick="closeModal()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Store callback for later use
    window.currentSinglesCheckoutCallback = callback;

    // Focus on the input
    setTimeout(() => {
        document.getElementById('singles-checkout-value').focus();
    }, 100);
}

function handleSinglesCheckoutAdd() {
    const checkoutValue = document.getElementById('singles-checkout-value').value;
    if (checkoutValue && window.currentSinglesCheckoutCallback) {
        window.currentSinglesCheckoutCallback(checkoutValue);
        closeModal();
    }
}

function handleStatAdd(gameType, gameIndex, statType) {
    const playerId = document.getElementById('stat-player-select').value;
    if (playerId && window.currentStatCallback) {
        window.currentStatCallback(playerId);
        closeModal();
    }
}

function handleCheckoutAdd(gameType, gameIndex) {
    const playerId = document.getElementById('checkout-player-select').value;
    const checkoutValue = document.getElementById('checkout-value').value;
    if (playerId && checkoutValue && window.currentCheckoutCallback) {
        window.currentCheckoutCallback(playerId, checkoutValue);
        closeModal();
    }
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

function updateStatDisplay(gameType, gameIndex, statType) {
    const gameKey = `${gameType}-${gameIndex}`;
    const container = document.getElementById(`${gameType}-${gameIndex}-${statType}-container`);

    let html = `<button type="button" class="add-stat-btn" onclick="addPlayerStat('${gameType}', ${gameIndex}, '${statType}')">+ Add ${statType === '180s' ? '180' : 'Checkout'}</button>`;

    if (gameStats[gameKey]) {
        if (statType === '180s') {
            gameStats[gameKey].stats180s.forEach((stat, index) => {
                const player = players.find(p => p.id === stat.playerId);
                html += `<div class="stat-item">${player.name} - 180 <button onclick="removePlayerStat('${gameKey}', '180s', ${index})">×</button></div>`;
            });
        } else if (statType === 'checkout') {
            gameStats[gameKey].checkouts.forEach((stat, index) => {
                const player = players.find(p => p.id === stat.playerId);
                html += `<div class="stat-item">${player.name} - ${stat.value} <button onclick="removePlayerStat('${gameKey}', 'checkouts', ${index})">×</button></div>`;
            });
        }
    }

    container.innerHTML = html;
}

function removePlayerStat(gameKey, statType, index) {
    if (gameStats[gameKey] && gameStats[gameKey][statType]) {
        gameStats[gameKey][statType].splice(index, 1);
        const parts = gameKey.split('-');
        const gameType = parts[0];
        const gameIndex = parseInt(parts[1]);
        const displayType = statType === 'stats180s' ? '180s' : 'checkout';
        updateStatDisplay(gameType, gameIndex, displayType);
    }
}

function createDoublesGames() {
    const doublesContainer = document.getElementById('doubles-games');
    doublesContainer.innerHTML = '';

    for (let i = 0; i < 3; i++) {
        const gameDiv = document.createElement('div');
        gameDiv.className = 'game-entry';
        gameDiv.innerHTML = `
            <h4>Doubles Game ${i + 1}</h4>
            <div class="player-selection">
                <label>Player 1:</label>
                <select class="player-select" id="doubles-${i}-player1" onchange="updatePlayerSelections()">
                    <option value="">Select Player</option>
                </select>
                <label>Player 2:</label>
                <select class="player-select" id="doubles-${i}-player2" onchange="updatePlayerSelections()">
                    <option value="">Select Player</option>
                </select>
            </div>
            <div class="score-entry">
                <label>Our Score:</label>
                <select id="doubles-${i}-our-score">
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                </select>
                <label>Their Score:</label>
                <select id="doubles-${i}-their-score">
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                </select>
            </div>
            <div class="stats-entry">
                <div class="stat-group">
                    <label>180s by Player:</label>
                    <div class="player-stats" id="doubles-${i}-180s-container">
                        <button type="button" class="add-stat-btn" onclick="addPlayerStat('doubles', ${i}, '180s')">+ Add 180</button>
                    </div>
                </div>
                <div class="stat-group">
                    <label>High Checkout (100+):</label>
                    <div class="player-stats" id="doubles-${i}-checkout-container">
                        <button type="button" class="add-stat-btn" onclick="addPlayerStat('doubles', ${i}, 'checkout')">+ Add Checkout</button>
                    </div>
                </div>
            </div>
        `;
        doublesContainer.appendChild(gameDiv);
    }

    updatePlayerSelections();
}

function createSinglesGames() {
    const singlesContainer = document.getElementById('singles-games');
    singlesContainer.innerHTML = '';

    for (let i = 0; i < 6; i++) {
        const gameDiv = document.createElement('div');
        gameDiv.className = 'game-entry';
        gameDiv.innerHTML = `
            <h4>Singles Game ${i + 1}</h4>
            <div class="player-selection">
                <label>Player:</label>
                <select class="player-select" id="singles-${i}-player" onchange="updatePlayerSelections()">
                    <option value="">Select Player</option>
                </select>
            </div>
            <div class="score-entry">
                <label>Our Score:</label>
                <select id="singles-${i}-our-score">
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                </select>
                <label>Their Score:</label>
                <select id="singles-${i}-their-score">
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                </select>
            </div>
            <div class="stats-entry">
                <div class="stat-group">
                    <label>180s by Player:</label>
                    <div class="player-stats" id="singles-${i}-180s-container">
                        <button type="button" class="add-stat-btn" onclick="addPlayerStat('singles', ${i}, '180s')">+ Add 180</button>
                    </div>
                </div>
                <div class="stat-group">
                    <label>High Checkout (100+):</label>
                    <div class="player-stats" id="singles-${i}-checkout-container">
                        <button type="button" class="add-stat-btn" onclick="addPlayerStat('singles', ${i}, 'checkout')">+ Add Checkout</button>
                    </div>
                </div>
            </div>
        `;
        singlesContainer.appendChild(gameDiv);
    }

    updatePlayerSelections();
}

// Update player selections to prevent duplicates
function updatePlayerSelections() {
    // Get all currently selected players
    const usedDoublesPlayers = new Set();
    const usedSinglesPlayers = new Set();

    // Collect all players already selected in doubles games
    for (let i = 0; i < 3; i++) {
        const player1Select = document.getElementById(`doubles-${i}-player1`);
        const player2Select = document.getElementById(`doubles-${i}-player2`);

        if (player1Select && player1Select.value) {
            usedDoublesPlayers.add(player1Select.value);
        }
        if (player2Select && player2Select.value) {
            usedDoublesPlayers.add(player2Select.value);
        }
    }

    // Collect all players already selected in singles games
    for (let i = 0; i < 6; i++) {
        const playerSelect = document.getElementById(`singles-${i}-player`);

        if (playerSelect && playerSelect.value) {
            usedSinglesPlayers.add(playerSelect.value);
        }
    }

    // Update doubles player selections
    for (let i = 0; i < 3; i++) {
        const player1Select = document.getElementById(`doubles-${i}-player1`);
        const player2Select = document.getElementById(`doubles-${i}-player2`);

        if (player1Select && player2Select) {
            const currentPlayer1 = player1Select.value;
            const currentPlayer2 = player2Select.value;

            // Update Player 1 options
            player1Select.innerHTML = '<option value="">Select Player</option>';
            players.forEach(player => {
                const isUsed = usedDoublesPlayers.has(player.id.toString()) && player.id.toString() !== currentPlayer1;
                if (!isUsed) {
                    const option = document.createElement('option');
                    option.value = player.id;
                    option.textContent = player.name;
                    option.selected = player.id.toString() === currentPlayer1;
                    player1Select.appendChild(option);
                }
            });

            // Update Player 2 options
            player2Select.innerHTML = '<option value="">Select Player</option>';
            players.forEach(player => {
                const isUsed = usedDoublesPlayers.has(player.id.toString()) && player.id.toString() !== currentPlayer2;
                const isSameAsPlayer1 = player.id.toString() === currentPlayer1;
                if (!isUsed && !isSameAsPlayer1) {
                    const option = document.createElement('option');
                    option.value = player.id;
                    option.textContent = player.name;
                    option.selected = player.id.toString() === currentPlayer2;
                    player2Select.appendChild(option);
                }
            });
        }
    }

    // Update singles player selections
    for (let i = 0; i < 6; i++) {
        const playerSelect = document.getElementById(`singles-${i}-player`);

        if (playerSelect) {
            const currentPlayer = playerSelect.value;

            playerSelect.innerHTML = '<option value="">Select Player</option>';
            players.forEach(player => {
                const isUsed = usedSinglesPlayers.has(player.id.toString()) && player.id.toString() !== currentPlayer;
                if (!isUsed) {
                    const option = document.createElement('option');
                    option.value = player.id;
                    option.textContent = player.name;
                    option.selected = player.id.toString() === currentPlayer;
                    playerSelect.appendChild(option);
                }
            });
        }
    }
}

// Save match data
function saveMatch() {
    const matchDate = document.getElementById('match-date').value;
    const opponentTeam = document.getElementById('opponent-team').value;

    if (!matchDate || !opponentTeam) {
        alert('Please fill in match date and opponent team');
        return;
    }

    const matchData = {
        id: Date.now(),
        date: matchDate,
        opponent: opponentTeam,
        doubles: [],
        singles: []
    };

    // Collect doubles games data
    for (let i = 0; i < 3; i++) {
        const player1 = document.getElementById(`doubles-${i}-player1`).value;
        const player2 = document.getElementById(`doubles-${i}-player2`).value;
        const ourScore = parseInt(document.getElementById(`doubles-${i}-our-score`).value);
        const theirScore = parseInt(document.getElementById(`doubles-${i}-their-score`).value);

        if (player1 && player2) {
            const gameKey = `doubles-${i}`;
            const gameStats180s = gameStats[gameKey]?.stats180s || [];
            const gameCheckouts = gameStats[gameKey]?.checkouts || [];

            const gameData = {
                players: [parseInt(player1), parseInt(player2)],
                ourScore,
                theirScore,
                playerStats: {
                    total180s: gameStats180s,
                    checkouts: gameCheckouts
                }
            };
            matchData.doubles.push(gameData);

            // Update player stats for match/leg wins
            updatePlayerMatchStats(parseInt(player1), 'doubles', ourScore, theirScore);
            updatePlayerMatchStats(parseInt(player2), 'doubles', ourScore, theirScore);

            // Update individual 180s and checkouts
            gameStats180s.forEach(stat => {
                playerStats[stat.playerId].doubles.total180s++;
            });

            gameCheckouts.forEach(stat => {
                playerStats[stat.playerId].doubles.highCheckouts.push(stat.value);
            });
        }
    }

    // Collect singles games data
    for (let i = 0; i < 6; i++) {
        const player = document.getElementById(`singles-${i}-player`).value;
        const ourScore = parseInt(document.getElementById(`singles-${i}-our-score`).value);
        const theirScore = parseInt(document.getElementById(`singles-${i}-their-score`).value);

        if (player) {
            const gameKey = `singles-${i}`;
            const gameStats180s = gameStats[gameKey]?.stats180s || [];
            const gameCheckouts = gameStats[gameKey]?.checkouts || [];

            const gameData = {
                player: parseInt(player),
                ourScore,
                theirScore,
                playerStats: {
                    total180s: gameStats180s,
                    checkouts: gameCheckouts
                }
            };
            matchData.singles.push(gameData);

            // Update player stats for match/leg wins
            updatePlayerMatchStats(parseInt(player), 'singles', ourScore, theirScore);

            // Update individual 180s and checkouts
            gameStats180s.forEach(stat => {
                playerStats[stat.playerId].singles.total180s++;
            });

            gameCheckouts.forEach(stat => {
                playerStats[stat.playerId].singles.highCheckouts.push(stat.value);
            });
        }
    }

    matches.push(matchData);
    saveData();

    alert('Match saved successfully!');
    clearMatchForm();
}

function updatePlayerMatchStats(playerId, gameType, ourScore, theirScore) {
    const playerStat = playerStats[playerId][gameType];

    playerStat.matches++;
    playerStat.legs += (ourScore + theirScore);
    playerStat.legWins += ourScore;

    if (ourScore > theirScore) {
        playerStat.wins++;
    }
}

function clearMatchForm() {
    gameStats = {}; // Reset game stats
    document.getElementById('match-date').valueAsDate = new Date();
    document.getElementById('opponent-team').value = '';

    // Clear all selects
    document.querySelectorAll('#match-entry select').forEach(select => {
        select.value = '';
    });

    // Regenerate the forms to clear all stat displays
    createDoublesGames();
    createSinglesGames();
}

// Display functions
function updateDashboard() {
    const totalMatches = matches.length;
    let matchesWon = 0;
    let total180s = 0;

    matches.forEach(match => {
        let ourPoints = 0;
        let theirPoints = 0;

        // Count doubles wins
        match.doubles.forEach(game => {
            if (game.ourScore > game.theirScore) ourPoints++;
            else theirPoints++;
            // Count 180s from new structure
            if (game.playerStats && game.playerStats.total180s) {
                total180s += game.playerStats.total180s.length;
            }
        });

        // Count singles wins
        match.singles.forEach(game => {
            if (game.ourScore > game.theirScore) ourPoints++;
            else theirPoints++;
            // Count 180s from new structure
            if (game.playerStats && game.playerStats.total180s) {
                total180s += game.playerStats.total180s.length;
            }
        });

        if (ourPoints > theirPoints) matchesWon++;
    });

    document.getElementById('total-matches').textContent = totalMatches;
    document.getElementById('matches-won').textContent = matchesWon;
    document.getElementById('match-win-percentage').textContent =
        totalMatches > 0 ? Math.round((matchesWon / totalMatches) * 100) + '%' : '0%';
    document.getElementById('total-180s').textContent = total180s;

    displayRecentMatches();
}

function displayRecentMatches() {
    const container = document.getElementById('recent-matches-list');
    const recentMatches = matches.slice().reverse();

    container.innerHTML = recentMatches.map((match, index) => {
        let ourPoints = 0;
        let theirPoints = 0;

        match.doubles.forEach(game => {
            if (game.ourScore > game.theirScore) ourPoints++;
            else theirPoints++;
        });

        match.singles.forEach(game => {
            if (game.ourScore > game.theirScore) ourPoints++;
            else theirPoints++;
        });

        const result = ourPoints > theirPoints ? 'WIN' : 'LOSS';
        const resultClass = ourPoints > theirPoints ? 'win' : 'loss';

        return `
            <div class="match-result ${resultClass}" onclick="toggleMatchDetails(${match.id})">
                <div class="match-summary">
                    <span class="match-date">${match.date}</span>
                    <span class="opponent">Disappointers vs ${match.opponent}</span>
                    <span class="score">${ourPoints}-${theirPoints}</span>
                    <span class="result">${result}</span>
                    <span class="expand-icon">▼</span>
                </div>
                <div class="match-details" id="match-details-${match.id}">
                    ${generateMatchDetails(match)}
                </div>
            </div>
        `;
    }).join('');
}

function generateMatchDetails(match) {
    let detailsHtml = '<div class="match-games">';

    // Doubles games
    if (match.doubles.length > 0) {
        detailsHtml += '<div class="game-section"><h4>Doubles Games</h4>';
        match.doubles.forEach((game, index) => {
            const player1Name = players.find(p => p.id === game.players[0])?.name || 'Unknown';
            const player2Name = players.find(p => p.id === game.players[1])?.name || 'Unknown';
            const gameResult = game.ourScore > game.theirScore ? 'WON' : 'LOST';
            const resultClass = game.ourScore > game.theirScore ? 'won' : 'lost';

            detailsHtml += `
                <div class="game-detail ${resultClass}">
                    <div class="game-info">
                        <span class="game-title">Doubles ${index + 1}</span>
                        <span class="game-players">${player1Name} & ${player2Name}</span>
                        <span class="game-score">${game.ourScore}-${game.theirScore}</span>
                        <span class="game-result">${gameResult}</span>
                    </div>
                    ${generateGameStats(game)}
                </div>
            `;
        });
        detailsHtml += '</div>';
    }

    // Singles games
    if (match.singles.length > 0) {
        detailsHtml += '<div class="game-section"><h4>Singles Games</h4>';
        match.singles.forEach((game, index) => {
            const playerName = players.find(p => p.id === game.player)?.name || 'Unknown';
            const gameResult = game.ourScore > game.theirScore ? 'WON' : 'LOST';
            const resultClass = game.ourScore > game.theirScore ? 'won' : 'lost';

            detailsHtml += `
                <div class="game-detail ${resultClass}">
                    <div class="game-info">
                        <span class="game-title">Singles ${index + 1}</span>
                        <span class="game-players">${playerName}</span>
                        <span class="game-score">${game.ourScore}-${game.theirScore}</span>
                        <span class="game-result">${gameResult}</span>
                    </div>
                    ${generateGameStats(game)}
                </div>
            `;
        });
        detailsHtml += '</div>';
    }

    detailsHtml += '</div>';
    return detailsHtml;
}

function generateGameStats(game) {
    let statsHtml = '';

    if (game.playerStats) {
        const stats180s = game.playerStats.total180s || [];
        const statsCheckouts = game.playerStats.checkouts || [];

        if (stats180s.length > 0 || statsCheckouts.length > 0) {
            statsHtml += '<div class="game-stats">';

            if (stats180s.length > 0) {
                statsHtml += '<div class="stat-group">';
                stats180s.forEach(stat => {
                    const playerName = players.find(p => p.id === stat.playerId)?.name || 'Unknown';
                    statsHtml += `<span class="stat-item">180: ${playerName}</span>`;
                });
                statsHtml += '</div>';
            }

            if (statsCheckouts.length > 0) {
                statsHtml += '<div class="stat-group">';
                statsCheckouts.forEach(stat => {
                    const playerName = players.find(p => p.id === stat.playerId)?.name || 'Unknown';
                    statsHtml += `<span class="stat-item">Checkout ${stat.value}: ${playerName}</span>`;
                });
                statsHtml += '</div>';
            }

            statsHtml += '</div>';
        }
    }

    return statsHtml;
}

function toggleMatchDetails(matchId) {
    const detailsElement = document.getElementById(`match-details-${matchId}`);
    const matchElement = detailsElement.closest('.match-result');
    const expandIcon = matchElement.querySelector('.expand-icon');

    if (detailsElement.style.display === 'none' || !detailsElement.style.display) {
        detailsElement.style.display = 'block';
        matchElement.classList.add('expanded');
        expandIcon.textContent = '▲';
    } else {
        detailsElement.style.display = 'none';
        matchElement.classList.remove('expanded');
        expandIcon.textContent = '▼';
    }
}

function updateStatistics() {
    displaySinglesStatistics();
    displayDoublesStatistics();
}

function displaySinglesStatistics() {
    const container = document.getElementById('singles-statistics-table');

    // Build data array for sorting - only singles
    let statsData = [];

    players.forEach(player => {
        const stats = playerStats[player.id].singles;
        const matchWinPercentage = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;
        const legWinPercentage = stats.legs > 0 ? Math.round((stats.legWins / stats.legs) * 100) : 0;
        const highCheckouts = stats.highCheckouts.length > 0 ? stats.highCheckouts.join(', ') : '-';

        statsData.push({
            playerName: player.name,
            playerId: player.id,
            matches: stats.matches,
            matchWinPercentage: matchWinPercentage,
            legs: stats.legs,
            legWinPercentage: legWinPercentage,
            total180s: stats.total180s,
            highCheckouts: highCheckouts,
            maxCheckout: stats.highCheckouts.length > 0 ? Math.max(...stats.highCheckouts) : 0
        });
    });

    // Sort data if a sort column is selected
    if (singlesSortColumn) {
        statsData.sort((a, b) => {
            let aVal = a[singlesSortColumn];
            let bVal = b[singlesSortColumn];

            // Handle string comparisons
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            // Handle high checkouts special case (sort by max checkout value)
            if (singlesSortColumn === 'highCheckouts') {
                aVal = a.maxCheckout;
                bVal = b.maxCheckout;
            }

            let result = 0;
            if (aVal < bVal) result = -1;
            if (aVal > bVal) result = 1;

            return singlesSortDirection === 'desc' ? -result : result;
        });
    }

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th onclick="sortSinglesTable('playerName')" class="sortable ${singlesSortColumn === 'playerName' ? 'sorted-' + singlesSortDirection : ''}">
                        Player ${singlesSortColumn === 'playerName' ? (singlesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onclick="sortSinglesTable('matches')" class="sortable ${singlesSortColumn === 'matches' ? 'sorted-' + singlesSortDirection : ''}">
                        Matches ${singlesSortColumn === 'matches' ? (singlesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onclick="sortSinglesTable('matchWinPercentage')" class="sortable ${singlesSortColumn === 'matchWinPercentage' ? 'sorted-' + singlesSortDirection : ''}">
                        Match Win % ${singlesSortColumn === 'matchWinPercentage' ? (singlesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onclick="sortSinglesTable('legs')" class="sortable ${singlesSortColumn === 'legs' ? 'sorted-' + singlesSortDirection : ''}">
                        Legs ${singlesSortColumn === 'legs' ? (singlesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onclick="sortSinglesTable('legWinPercentage')" class="sortable ${singlesSortColumn === 'legWinPercentage' ? 'sorted-' + singlesSortDirection : ''}">
                        Leg Win % ${singlesSortColumn === 'legWinPercentage' ? (singlesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onclick="sortSinglesTable('total180s')" class="sortable ${singlesSortColumn === 'total180s' ? 'sorted-' + singlesSortDirection : ''}">
                        180s ${singlesSortColumn === 'total180s' ? (singlesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onclick="sortSinglesTable('highCheckouts')" class="sortable ${singlesSortColumn === 'highCheckouts' ? 'sorted-' + singlesSortDirection : ''}">
                        High Checkouts ${singlesSortColumn === 'highCheckouts' ? (singlesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                </tr>
            </thead>
            <tbody>
    `;

    // Display sorted data
    statsData.forEach(row => {
        html += `
            <tr>
                <td data-label="Player">${row.playerName}</td>
                <td data-label="Matches">${row.matches}</td>
                <td data-label="Match Win %">${row.matchWinPercentage}%</td>
                <td data-label="Legs">${row.legs}</td>
                <td data-label="Leg Win %">${row.legWinPercentage}%</td>
                <td data-label="180s">${row.total180s}</td>
                <td data-label="High Checkouts">${row.highCheckouts}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function displayDoublesStatistics() {
    const container = document.getElementById('doubles-statistics-table');

    // Build data array for sorting - only doubles
    let statsData = [];

    players.forEach(player => {
        const stats = playerStats[player.id].doubles;
        const matchWinPercentage = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;
        const legWinPercentage = stats.legs > 0 ? Math.round((stats.legWins / stats.legs) * 100) : 0;
        const highCheckouts = stats.highCheckouts.length > 0 ? stats.highCheckouts.join(', ') : '-';

        statsData.push({
            playerName: player.name,
            playerId: player.id,
            matches: stats.matches,
            matchWinPercentage: matchWinPercentage,
            legs: stats.legs,
            legWinPercentage: legWinPercentage,
            total180s: stats.total180s,
            highCheckouts: highCheckouts,
            maxCheckout: stats.highCheckouts.length > 0 ? Math.max(...stats.highCheckouts) : 0
        });
    });

    // Sort data if a sort column is selected
    if (doublesSortColumn) {
        statsData.sort((a, b) => {
            let aVal = a[doublesSortColumn];
            let bVal = b[doublesSortColumn];

            // Handle string comparisons
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            // Handle high checkouts special case (sort by max checkout value)
            if (doublesSortColumn === 'highCheckouts') {
                aVal = a.maxCheckout;
                bVal = b.maxCheckout;
            }

            let result = 0;
            if (aVal < bVal) result = -1;
            if (aVal > bVal) result = 1;

            return doublesSortDirection === 'desc' ? -result : result;
        });
    }

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th onclick="sortDoublesTable('playerName')" class="sortable ${doublesSortColumn === 'playerName' ? 'sorted-' + doublesSortDirection : ''}">
                        Player ${doublesSortColumn === 'playerName' ? (doublesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onclick="sortDoublesTable('matches')" class="sortable ${doublesSortColumn === 'matches' ? 'sorted-' + doublesSortDirection : ''}">
                        Matches ${doublesSortColumn === 'matches' ? (doublesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onclick="sortDoublesTable('matchWinPercentage')" class="sortable ${doublesSortColumn === 'matchWinPercentage' ? 'sorted-' + doublesSortDirection : ''}">
                        Match Win % ${doublesSortColumn === 'matchWinPercentage' ? (doublesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onclick="sortDoublesTable('legs')" class="sortable ${doublesSortColumn === 'legs' ? 'sorted-' + doublesSortDirection : ''}">
                        Legs ${doublesSortColumn === 'legs' ? (doublesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onclick="sortDoublesTable('legWinPercentage')" class="sortable ${doublesSortColumn === 'legWinPercentage' ? 'sorted-' + doublesSortDirection : ''}">
                        Leg Win % ${doublesSortColumn === 'legWinPercentage' ? (doublesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onclick="sortDoublesTable('total180s')" class="sortable ${doublesSortColumn === 'total180s' ? 'sorted-' + doublesSortDirection : ''}">
                        180s ${doublesSortColumn === 'total180s' ? (doublesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onclick="sortDoublesTable('highCheckouts')" class="sortable ${doublesSortColumn === 'highCheckouts' ? 'sorted-' + doublesSortDirection : ''}">
                        High Checkouts ${doublesSortColumn === 'highCheckouts' ? (doublesSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                </tr>
            </thead>
            <tbody>
    `;

    // Display sorted data
    statsData.forEach(row => {
        html += `
            <tr>
                <td data-label="Player">${row.playerName}</td>
                <td data-label="Matches">${row.matches}</td>
                <td data-label="Match Win %">${row.matchWinPercentage}%</td>
                <td data-label="Legs">${row.legs}</td>
                <td data-label="Leg Win %">${row.legWinPercentage}%</td>
                <td data-label="180s">${row.total180s}</td>
                <td data-label="High Checkouts">${row.highCheckouts}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function sortSinglesTable(column) {
    if (singlesSortColumn === column) {
        // Toggle direction if same column
        singlesSortDirection = singlesSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, start with ascending
        singlesSortColumn = column;
        singlesSortDirection = 'asc';
    }

    displaySinglesStatistics();
}

function sortDoublesTable(column) {
    if (doublesSortColumn === column) {
        // Toggle direction if same column
        doublesSortDirection = doublesSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, start with ascending
        doublesSortColumn = column;
        doublesSortDirection = 'asc';
    }

    displayDoublesStatistics();
}

function displayPlayers() {
    const container = document.getElementById('players-list');
    container.innerHTML = players.map(player => {
        const doublesCheckouts = playerStats[player.id].doubles.highCheckouts;
        const singlesCheckouts = playerStats[player.id].singles.highCheckouts;
        const allCheckouts = [...doublesCheckouts, ...singlesCheckouts];
        const checkoutsDisplay = allCheckouts.length > 0 ? allCheckouts.sort((a, b) => b - a).join(', ') : 'None';

        return `
            <div class="player-card">
                <h3>${player.name}</h3>
                <div class="player-stats">
                    <div class="stat">
                        <label>Doubles Matches:</label>
                        <span>${playerStats[player.id].doubles.matches}</span>
                    </div>
                    <div class="stat">
                        <label>Singles Matches:</label>
                        <span>${playerStats[player.id].singles.matches}</span>
                    </div>
                    <div class="stat">
                        <label>Total 180s:</label>
                        <span>${playerStats[player.id].doubles.total180s + playerStats[player.id].singles.total180s}</span>
                    </div>
                    <div class="stat">
                        <label>High Checkouts:</label>
                        <span class="checkouts-list">${checkoutsDisplay}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Data persistence
function saveData() {
    localStorage.setItem('matches', JSON.stringify(matches));
    localStorage.setItem('playerStats', JSON.stringify(playerStats));
}

// Crawley Friday League Team Selector
let availablePlayers = [];
let currentVenueType = 'away';

function initializeCrawleyTeamSelector() {
    // Ensure data is loaded before displaying players
    if (!players || !playerStats) {
        console.error('Player data not loaded yet');
        return;
    }
    displayAvailablePlayers();
    updateVenueType();
}

function updateVenueType() {
    currentVenueType = document.getElementById('venue-type').value;
    updateVenueInfo();
}

function updateVenueInfo() {
    const venueInfo = document.getElementById('venue-info');
    if (venueInfo) {
        const throwPattern = currentVenueType === 'away'
            ? 'Away: D1(throw), D2, D3(throw), S1, S2(throw), S3, S4(throw), S5, S6(throw)'
            : 'Home: D1, D2(throw), D3, S1(throw), S2, S3(throw), S4, S5(throw), S6';
        venueInfo.innerHTML = `<strong>Venue:</strong> ${currentVenueType.toUpperCase()} - <strong>Throw Pattern:</strong> ${throwPattern}`;
    }
}

function displayAvailablePlayers() {
    const container = document.getElementById('available-players-list');

    if (!container) {
        console.error('Available players container not found');
        return;
    }

    if (!players || players.length === 0) {
        container.innerHTML = '<p>No players data available. Please add players first.</p>';
        return;
    }

    const html = players.map(player => `
        <div class="player-checkbox">
            <input type="checkbox" id="player-${player.id}" value="${player.id}" onchange="updateAvailablePlayers()">
            <label for="player-${player.id}">
                <span class="player-name">${player.name}</span>
                <span class="player-winrate">${getSinglesWinPercentage(player.id).toFixed(1)}% win</span>
            </label>
        </div>
    `).join('');

    container.innerHTML = html;
    updateAvailablePlayers();
}

function updateAvailablePlayers() {
    availablePlayers = [];
    players.forEach(player => {
        const checkbox = document.getElementById(`player-${player.id}`);
        if (checkbox && checkbox.checked) {
            availablePlayers.push(player);
        }
    });

    document.getElementById('selected-count').textContent = availablePlayers.length;

    // Show/hide generation button based on selection count
    const generateBtn = document.querySelector('.generate-btn');
    if (availablePlayers.length >= 6 && availablePlayers.length <= 10) {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Optimal Lineup';
    } else {
        generateBtn.disabled = true;
        generateBtn.textContent = `Select 6-10 players (currently ${availablePlayers.length})`;
    }
}

function getSinglesWinPercentage(playerId) {
    if (!playerStats || !playerStats[playerId] || !playerStats[playerId].singles) {
        return 0;
    }
    const stats = playerStats[playerId].singles;
    return stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0;
}

function getSinglesLegWinPercentage(playerId) {
    if (!playerStats || !playerStats[playerId] || !playerStats[playerId].singles) {
        return 0;
    }
    const stats = playerStats[playerId].singles;
    return stats.legs > 0 ? (stats.legWins / stats.legs) * 100 : 0;
}

function generateCrawleyLineup() {
    if (availablePlayers.length < 6 || availablePlayers.length > 10) {
        alert('Please select between 6 and 10 players for the team lineup.');
        return;
    }

    // Rank players by singles win percentage (descending), with leg win % as tiebreaker
    const rankedPlayers = [...availablePlayers].sort((a, b) => {
        const aWinPct = getSinglesWinPercentage(a.id);
        const bWinPct = getSinglesWinPercentage(b.id);

        // Primary sort: match win percentage
        if (bWinPct !== aWinPct) return bWinPct - aWinPct;

        // Tiebreaker: leg win percentage
        const aLegWinPct = getSinglesLegWinPercentage(a.id);
        const bLegWinPct = getSinglesLegWinPercentage(b.id);
        if (bLegWinPct !== aLegWinPct) return bLegWinPct - aLegWinPct;

        // Final tiebreaker: alphabetical by name
        return a.name.localeCompare(b.name);
    });

    // Determine throw advantages for Crawley format
    // Away: D1(throw), D2, D3(throw), S1, S2(throw), S3, S4(throw), S5, S6(throw)
    // Home: D1, D2(throw), D3, S1(throw), S2, S3(throw), S4, S5(throw), S6
    const gameAdvantages = currentVenueType === 'away'
        ? { 1: true, 2: false, 3: true, 4: false, 5: true, 6: false, 7: true, 8: false, 9: true }
        : { 1: false, 2: true, 3: false, 4: true, 5: false, 6: true, 7: false, 8: true, 9: false };

    let lineup = {
        doubles: [],
        singles: [],
        flexibleSlot: null
    };

    let usedPlayers = new Set();

    // DOUBLES ASSIGNMENT (Games 1-3)
    if (currentVenueType === 'away') {
        // Away team doubles strategy
        // D1 (with throw): Pair #1 and #3 ranked players
        if (rankedPlayers.length >= 3) {
            const player1 = rankedPlayers[0];
            const player3 = rankedPlayers[2];
            const explanation = `${player1.name} (${getSinglesWinPercentage(player1.id).toFixed(1)}% win rate) paired with ${player3.name} (${getSinglesWinPercentage(player3.id).toFixed(1)}% win rate). Strategic pairing of #1 and #3 ranked players with throw advantage - maximizes our strongest players in a winnable game while saving #2 for D3.`;

            lineup.doubles.push({
                game: 1,
                players: [player1, player3],
                advantage: true,
                strategy: explanation
            });
            usedPlayers.add(player1.id);
            usedPlayers.add(player3.id);
        }

        // D2 (against throw): Two weakest available players
        const availableForD2 = rankedPlayers.filter(p => !usedPlayers.has(p.id));
        if (availableForD2.length >= 2) {
            const weakest = availableForD2.slice(-2);
            const explanation = `${weakest[0].name} (${getSinglesWinPercentage(weakest[0].id).toFixed(1)}% win rate) paired with ${weakest[1].name} (${getSinglesWinPercentage(weakest[1].id).toFixed(1)}% win rate). Strategic positioning - giving our developing players a chance to shine while preserving our experienced players for D3 where we have the throw advantage.`;

            lineup.doubles.push({
                game: 2,
                players: [weakest[0], weakest[1]],
                advantage: false,
                strategy: explanation
            });
            usedPlayers.add(weakest[0].id);
            usedPlayers.add(weakest[1].id);
        }

        // D3 (with throw): Best available players (preferably #2 and next best)
        const availableForD3 = rankedPlayers.filter(p => !usedPlayers.has(p.id));
        if (availableForD3.length >= 2) {
            // Use the two strongest available players for D3
            const best2ForD3 = availableForD3.slice(0, 2);

            // Find their original rankings for explanation
            const player1Rank = rankedPlayers.findIndex(p => p.id === best2ForD3[0].id) + 1;
            const player2Rank = rankedPlayers.findIndex(p => p.id === best2ForD3[1].id) + 1;

            const explanation = `${best2ForD3[0].name} (${getSinglesWinPercentage(best2ForD3[0].id).toFixed(1)}% win rate, #${player1Rank} ranked) paired with ${best2ForD3[1].name} (${getSinglesWinPercentage(best2ForD3[1].id).toFixed(1)}% win rate, #${player2Rank} ranked). Best available pairing with throw advantage - using our strongest remaining players for this crucial game.`;

            lineup.doubles.push({
                game: 3,
                players: [best2ForD3[0], best2ForD3[1]],
                advantage: true,
                strategy: explanation
            });
            usedPlayers.add(best2ForD3[0].id);
            usedPlayers.add(best2ForD3[1].id);
        }
    } else {
        // Home team doubles strategy - different logic
        const doublesGames = [
            { game: 1, advantage: false },
            { game: 2, advantage: true },
            { game: 3, advantage: false }
        ];

        doublesGames.forEach(({ game, advantage }) => {
            const availableForDoubles = rankedPlayers.filter(p => !usedPlayers.has(p.id));
            if (availableForDoubles.length >= 2) {
                let players, strategy;

                if (advantage) {
                    // With throw: use strongest available
                    players = [availableForDoubles[0], availableForDoubles[1]];
                    strategy = `${players[0].name} (${getSinglesWinPercentage(players[0].id).toFixed(1)}% win rate) paired with ${players[1].name} (${getSinglesWinPercentage(players[1].id).toFixed(1)}% win rate). Our two strongest available players with throw advantage - maximizing our chances in this winnable game.`;
                } else {
                    // Against throw: use strategic pairing
                    if (availableForDoubles.length >= 4) {
                        players = [availableForDoubles[0], availableForDoubles[availableForDoubles.length - 1]];
                        strategy = `${players[0].name} (${getSinglesWinPercentage(players[0].id).toFixed(1)}% win rate) paired with ${players[1].name} (${getSinglesWinPercentage(players[1].id).toFixed(1)}% win rate). Mixed strength pairing against their throw - strong player carries weaker partner, saving mid-strength players for later games.`;
                    } else {
                        players = [availableForDoubles[0], availableForDoubles[1]];
                        strategy = `${players[0].name} (${getSinglesWinPercentage(players[0].id).toFixed(1)}% win rate) paired with ${players[1].name} (${getSinglesWinPercentage(players[1].id).toFixed(1)}% win rate). Best available pairing against their throw - limited options force us to use stronger players.`;
                    }
                }

                lineup.doubles.push({
                    game,
                    players,
                    advantage,
                    strategy
                });

                usedPlayers.add(players[0].id);
                usedPlayers.add(players[1].id);
            }
        });
    }

    // SINGLES ASSIGNMENT (Games 4-9)
    const singlesGames = [4, 5, 6, 7, 8, 9];
    let usedInSingles = new Set();

    // First pass: assign players to all singles games
    singlesGames.forEach(game => {
        // For singles, we can reuse players if needed (since it's only 1 player per game)
        const availableForSingles = rankedPlayers.filter(p => !usedPlayers.has(p.id));
        const hasAdvantage = gameAdvantages[game];

        let selectedPlayer;
        let strategy;

        if (availableForSingles.length > 0) {
            // We have unused players from doubles
            if (hasAdvantage) {
                // With throw: use strongest available
                selectedPlayer = availableForSingles[0];
                const gameNum = game - 3;
                strategy = `${selectedPlayer.name} (${getSinglesWinPercentage(selectedPlayer.id).toFixed(1)}% win rate) selected for S${gameNum} with throw advantage. Using our strongest available player to maximize chances in this winnable singles game.`;
            } else {
                // Against throw: try to use weaker players when we have enough players left
                const remainingGames = singlesGames.filter(g => g > game).length;
                const remainingPlayers = availableForSingles.length - 1;
                const gameNum = game - 3;

                if (availableForSingles.length > 2 && remainingPlayers >= remainingGames) {
                    // Use weaker player if we have enough players left for remaining games
                    selectedPlayer = availableForSingles[Math.floor(availableForSingles.length / 2)];
                    strategy = `${selectedPlayer.name} (${getSinglesWinPercentage(selectedPlayer.id).toFixed(1)}% win rate) selected for S${gameNum} against their throw. Strategic placement of mid-strength player - preserving stronger players for advantage games while not sacrificing our weakest.`;
                } else {
                    selectedPlayer = availableForSingles[0];
                    strategy = `${selectedPlayer.name} (${getSinglesWinPercentage(selectedPlayer.id).toFixed(1)}% win rate) selected for S${gameNum} against their throw. Best available player - limited options force us to use stronger player in disadvantage position.`;
                }
            }
            usedPlayers.add(selectedPlayer.id);
        } else {
            // No unused players left, need to reuse someone from doubles or previous singles
            // Get players who haven't been used in singles yet, or fall back to anyone
            const notUsedInSingles = rankedPlayers.filter(p => !usedInSingles.has(p.id));
            const playersToChooseFrom = notUsedInSingles.length > 0 ? notUsedInSingles : rankedPlayers;

            const gameNum = game - 3;
            if (hasAdvantage) {
                // With throw: use strongest available
                selectedPlayer = playersToChooseFrom[0];
                strategy = `${selectedPlayer.name} (${getSinglesWinPercentage(selectedPlayer.id).toFixed(1)}% win rate) selected for S${gameNum} with throw advantage. Reusing a stronger player from doubles - with only ${rankedPlayers.length} players available, double duty is necessary to field a competitive lineup.`;
            } else {
                // Against throw: use weaker players when possible
                if (playersToChooseFrom.length > 1) {
                    selectedPlayer = playersToChooseFrom[Math.floor(playersToChooseFrom.length / 2)];
                    strategy = `${selectedPlayer.name} (${getSinglesWinPercentage(selectedPlayer.id).toFixed(1)}% win rate) selected for S${gameNum} against their throw. Strategic reuse of mid-strength player - minimizing risk while giving everyone game time with limited squad.`;
                } else {
                    selectedPlayer = playersToChooseFrom[0];
                    strategy = `${selectedPlayer.name} (${getSinglesWinPercentage(selectedPlayer.id).toFixed(1)}% win rate) selected for S${gameNum} against their throw. Only available option - limited squad size requires player to take on multiple games.`;
                }
            }
        }

        if (selectedPlayer) {
            lineup.singles.push({
                game,
                player: selectedPlayer,
                advantage: hasAdvantage,
                strategy
            });
            usedInSingles.add(selectedPlayer.id);
        }
    });

    // Second pass: Check if we have unused players and need to create a flexible slot
    const unusedPlayers = rankedPlayers.filter(p => !usedPlayers.has(p.id));
    if (unusedPlayers.length > 0) {
        // Find the last singles game that's against the throw to make flexible
        const againstThrowGames = lineup.singles.filter(s => !s.advantage);
        if (againstThrowGames.length > 0) {
            const lastAgainstThrow = againstThrowGames[againstThrowGames.length - 1];

            // Convert this game to a flexible slot
            const gameNum = lastAgainstThrow.game <= 3 ? lastAgainstThrow.game : lastAgainstThrow.game - 3;
            const gameType = lastAgainstThrow.game <= 3 ? 'D' : 'S';
            const allOptions = [lastAgainstThrow.player, ...unusedPlayers.slice(0, 2)].filter((p, i, arr) =>
                arr.findIndex(player => player.id === p.id) === i
            ).slice(0, 2);

            const optionNames = allOptions.map(p => `${p.name} (${getSinglesWinPercentage(p.id).toFixed(1)}%)`).join(' or ');
            const explanation = `${gameType}${gameNum} against their throw - Choose between ${optionNames}. This flexible assignment ensures all ${rankedPlayers.length} selected players get game time while maintaining strategic positioning against their throw advantage.`;

            lineup.flexibleSlot = {
                game: lastAgainstThrow.game,
                options: allOptions,
                advantage: false,
                strategy: explanation
            };

            // Remove from singles
            lineup.singles = lineup.singles.filter(s => s.game !== lastAgainstThrow.game);
        }
    }

    displayCrawleyLineup(lineup);
}

function displayCrawleyLineup(lineup) {
    const doublesContainer = document.getElementById('doubles-assignments');
    const singlesContainer = document.getElementById('singles-assignments');
    const flexibleSlot = document.getElementById('flexible-slot');
    const flexibleAssignment = document.getElementById('flexible-assignment');

    // Update venue info
    updateVenueInfo();

    // Display doubles
    let doublesHtml = '';
    lineup.doubles.forEach(assignment => {
        const advantageIcon = assignment.advantage ? '🎯' : '❌';
        const advantageText = assignment.advantage ? 'With Throw' : 'Against Throw';

        doublesHtml += `
            <div class="game-assignment ${assignment.advantage ? 'advantage' : 'disadvantage'}">
                <div class="game-header">
                    <span class="game-number">D${assignment.game}</span>
                    <span class="throw-info">${advantageIcon} ${advantageText}</span>
                </div>
                <div class="players-info">
                    <div class="player-pair">
                        <span class="player-name">${assignment.players[0].name}</span>
                        <span class="player-stats">${getSinglesWinPercentage(assignment.players[0].id).toFixed(1)}%</span>
                    </div>
                    <div class="player-pair">
                        <span class="player-name">${assignment.players[1].name}</span>
                        <span class="player-stats">${getSinglesWinPercentage(assignment.players[1].id).toFixed(1)}%</span>
                    </div>
                </div>
                <div class="strategy-info">${assignment.strategy}</div>
            </div>
        `;
    });

    // Display singles
    let singlesHtml = '';
    lineup.singles.forEach(assignment => {
        const advantageIcon = assignment.advantage ? '🎯' : '❌';
        const advantageText = assignment.advantage ? 'With Throw' : 'Against Throw';
        const gameNumber = assignment.game - 3; // Convert to S1-S6

        singlesHtml += `
            <div class="game-assignment ${assignment.advantage ? 'advantage' : 'disadvantage'}">
                <div class="game-header">
                    <span class="game-number">S${gameNumber}</span>
                    <span class="throw-info">${advantageIcon} ${advantageText}</span>
                </div>
                <div class="player-info">
                    <span class="player-name">${assignment.player.name}</span>
                    <span class="player-stats">${getSinglesWinPercentage(assignment.player.id).toFixed(1)}% win</span>
                </div>
                <div class="strategy-info">${assignment.strategy}</div>
            </div>
        `;
    });

    doublesContainer.innerHTML = doublesHtml;
    singlesContainer.innerHTML = singlesHtml;

    // Display flexible slot if exists
    if (lineup.flexibleSlot) {
        const gameNumber = lineup.flexibleSlot.game <= 3 ? `D${lineup.flexibleSlot.game}` : `S${lineup.flexibleSlot.game - 3}`;

        let flexibleHtml = `
            <div class="flexible-assignment">
                <div class="game-header">
                    <span class="game-number">${gameNumber}</span>
                    <span class="throw-info">❌ Against Throw</span>
                </div>
                <div class="flexible-options">
                    <span class="flexible-label">Choose one:</span>
        `;

        lineup.flexibleSlot.options.forEach((player, index) => {
            flexibleHtml += `
                <div class="flexible-option">
                    <span class="player-name">${player.name}</span>
                    <span class="player-stats">${getSinglesWinPercentage(player.id).toFixed(1)}% win</span>
                </div>
            `;
        });

        flexibleHtml += `
                </div>
                <div class="strategy-info">${lineup.flexibleSlot.strategy}</div>
            </div>
        `;

        flexibleAssignment.innerHTML = flexibleHtml;
        flexibleSlot.style.display = 'block';
    } else {
        flexibleSlot.style.display = 'none';
    }

    document.getElementById('lineup-display').style.display = 'block';
}


// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize player stats for all players if not exists
    players.forEach(player => {
        if (!playerStats[player.id]) {
            playerStats[player.id] = {
                singles: { matches: 0, wins: 0, legs: 0, legWins: 0 },
                doubles: { matches: 0, wins: 0, legs: 0, legWins: 0 }
            };
        }
    });

    // Initialize dashboard on load
    updateDashboard();
});