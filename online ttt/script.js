// Configuración de Firebase (DEMO - Reemplaza con tu configuración real)
const firebaseConfig = {
    apiKey: "AIzaSyA-Eo5_VgkQD8kH0xjLBknZqAIlldmi3eg",
    authDomain: "mi-tic-tac-toe.firebaseapp.com",
    databaseURL: "https://mi-tic-tac-toe-default-rtdb.firebaseio.com",
    projectId: "mi-tic-tac-toe",
    storageBucket: "mi-tic-tac-toe.firebasestorage.app",
    messagingSenderId: "659292872370",
    appId: "1:659292872370:web:79f62d4643ed196926f3ab",
    measurementId: "G-KBW64PGZ1B"
};

// Mock Database para demostración (reemplazar con Firebase real)
const mockDatabase = {
    rooms: {},
    listeners: {},
    
    ref: function(path) {
        return {
            set: async (data) => {
                const pathParts = path.split('/');
                let current = this.rooms;
                for (let i = 1; i < pathParts.length - 1; i++) {
                    if (!current[pathParts[i]]) current[pathParts[i]] = {};
                    current = current[pathParts[i]];
                }
                current[pathParts[pathParts.length - 1]] = data;
                this.notifyListeners(pathParts[1]);
            },
            
            update: async (data) => {
                const pathParts = path.split('/');
                let current = this.rooms;
                for (let i = 1; i < pathParts.length; i++) {
                    if (!current[pathParts[i]]) current[pathParts[i]] = {};
                    if (i === pathParts.length - 1) {
                        Object.assign(current[pathParts[i]], data);
                    } else {
                        current = current[pathParts[i]];
                    }
                }
                this.notifyListeners(pathParts[1]);
            },
            
            once: async (event) => {
                const pathParts = path.split('/');
                let current = this.rooms;
                for (let i = 1; i < pathParts.length; i++) {
                    current = current[pathParts[i]];
                    if (!current) break;
                }
                return {
                    exists: () => !!current,
                    val: () => current
                };
            },
            
            on: (event, callback) => {
                const roomId = path.split('/')[1];
                if (!this.listeners[roomId]) this.listeners[roomId] = [];
                this.listeners[roomId].push(callback);
            },
            
            off: () => {
                const roomId = path.split('/')[1];
                delete this.listeners[roomId];
            },
            
            remove: () => {
                const pathParts = path.split('/');
                let current = this.rooms;
                for (let i = 1; i < pathParts.length - 1; i++) {
                    current = current[pathParts[i]];
                    if (!current) return;
                }
                delete current[pathParts[pathParts.length - 1]];
                this.notifyListeners(pathParts[1]);
            }
        };
    },
    
    notifyListeners: function(roomId) {
        if (this.listeners[roomId]) {
            const roomData = this.rooms[roomId];
            const snapshot = {
                exists: () => !!roomData,
                val: () => roomData
            };
            this.listeners[roomId].forEach(callback => {
                setTimeout(() => callback(snapshot), 100);
            });
        }
    }
};

// Usar mock database para demo (cambiar por firebase.database() en producción)
const database = mockDatabase;

class TicTacToeOnline {
    constructor() {
        this.currentRoom = null;
        this.playerSymbol = null;
        this.playerId = this.generatePlayerId();
        this.gameState = null;
        this.timerInterval = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.showStatus('¡Listo para jugar! 🎮', 'success');
    }

    initializeElements() {
        // Paneles principales
        this.connectionPanel = document.getElementById('connection-panel');
        this.roomPanel = document.getElementById('room-panel');
        this.scorePanel = document.getElementById('score-panel');
        this.rulesPanel = document.getElementById('rules-panel');
        this.chatPanel = document.getElementById('chat-panel');
        this.gameTitle = document.getElementById('game-title');
        this.turnIndicator = document.getElementById('turn-indicator');
        this.gameBoard = document.getElementById('game-board');
        this.gameControls = document.getElementById('game-controls');

        // Elementos de conexión
        this.createRoomBtn = document.getElementById('create-room');
        this.joinRoomBtn = document.getElementById('join-room');
        this.roomCodeInput = document.getElementById('room-code');
        this.connectionStatus = document.getElementById('connection-status');
        this.leaveRoomBtn = document.getElementById('leave-room');

        // Elementos del juego
        this.cells = document.querySelectorAll('.cell');
        this.currentTurnDisplay = document.getElementById('current-turn');
        this.timerFill = document.getElementById('timer-fill');
        this.timerText = document.getElementById('timer-text');
        this.resetBtn = document.getElementById('reset');
        this.surrenderBtn = document.getElementById('surrender');

        // Chat
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendChatBtn = document.getElementById('send-chat');

        // Marcador
        this.scoreX = document.getElementById('score-x');
        this.scoreO = document.getElementById('score-o');
        this.gamesCount = document.getElementById('games-count');
        this.currentRoomDisplay = document.getElementById('current-room');
        this.playersStatus = document.getElementById('players-status');
    }

    attachEventListeners() {
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        this.resetBtn.addEventListener('click', () => this.requestNewGame());
        this.surrenderBtn.addEventListener('click', () => this.surrender());
        
        this.roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        this.cells.forEach((cell, index) => {
            cell.addEventListener('click', () => this.makeMove(index));
        });

        // Chat
        this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        // Teclado numérico para movimientos (1-9 mapea a posiciones del tablero)
        document.addEventListener('keydown', (e) => {
            const keyMap = {
                'Numpad7': 0, 'Numpad8': 1, 'Numpad9': 2,
                'Numpad4': 3, 'Numpad5': 4, 'Numpad6': 5,
                'Numpad1': 6, 'Numpad2': 7, 'Numpad3': 8,
                'Digit7': 0, 'Digit8': 1, 'Digit9': 2,
                'Digit4': 3, 'Digit5': 4, 'Digit6': 5,
                'Digit1': 6, 'Digit2': 7, 'Digit3': 8
            };
            if (keyMap[e.code] !== undefined) {
                this.makeMove(keyMap[e.code]);
            }
        });
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async createRoom() {
        const roomCode = this.generateRoomCode();
        this.currentRoom = roomCode;

        const initialGameState = {
            board: ['', '', '', '', '', '', '', '', ''],
            currentPlayer: 'X',
            gameActive: true,
            players: {
                [this.playerId]: { symbol: 'X', ready: true }
            },
            scores: { X: 0, O: 0 },
            totalGames: 0,
            timeLeft: 20,
            chat: [],
            lastActivity: Date.now(),
            winner: null
        };

        try {
            await database.ref(`rooms/${roomCode}`).set(initialGameState);
            this.playerSymbol = 'X';
            this.joinRoomSuccess(roomCode);
            this.listenToRoom();
            this.sendChatMessage('¡Sala creada! Esperando oponente...', true);
        } catch (error) {
            console.error('Error al crear sala:', error);
            this.showStatus('Error al crear la sala', 'error');
        }
    }

    async joinRoom() {
        const roomCode = this.roomCodeInput.value.toUpperCase().trim();
        if (!roomCode) {
            this.showStatus('Ingresa un código de sala', 'error');
            return;
        }

        try {
            const roomSnapshot = await database.ref(`rooms/${roomCode}`).once('value');
            if (!roomSnapshot.exists()) {
                this.showStatus('Sala no encontrada', 'error');
                return;
            }

            const roomData = roomSnapshot.val();
            const playerCount = Object.keys(roomData.players || {}).length;

            if (playerCount >= 2) {
                this.showStatus('Sala llena', 'error');
                return;
            }

            this.currentRoom = roomCode;
            this.playerSymbol = 'O';

            await database.ref(`rooms/${roomCode}/players/${this.playerId}`).set({
                symbol: 'O',
                ready: true
            });

            this.joinRoomSuccess(roomCode);
            this.listenToRoom();
            this.sendChatMessage('¡Segundo jugador se unió! ¡A jugar!', true);
        } catch (error) {
            console.error('Error al unirse a sala:', error);
            this.showStatus('Error al unirse a la sala', 'error');
        }
    }

    joinRoomSuccess(roomCode) {
        // Ocultar panel de conexión
        this.connectionPanel.style.display = 'none';
        
        // Mostrar elementos del juego
        this.roomPanel.style.display = 'block';
        this.scorePanel.style.display = 'block';
        this.rulesPanel.style.display = 'block';
        this.chatPanel.style.display = 'block';
        this.gameTitle.style.display = 'block';
        this.turnIndicator.style.display = 'flex';
        this.gameBoard.style.display = 'grid';
        this.gameControls.style.display = 'flex';

        this.currentRoomDisplay.textContent = roomCode;
        this.showStatus(`Conectado a sala ${roomCode}`, 'success');
    }

    listenToRoom() {
        if (!this.currentRoom) return;

        database.ref(`rooms/${this.currentRoom}`).on('value', (snapshot) => {
            if (!snapshot.exists()) {
                this.showStatus('La sala fue cerrada', 'error');
                this.leaveRoom();
                return;
            }

            this.gameState = snapshot.val();
            this.updateGameDisplay();
            this.updatePlayersStatus();
            this.updateChat();
        });
    }

    updateGameDisplay() {
        if (!this.gameState) return;

        // Actualizar tablero
        this.cells.forEach((cell, index) => {
            cell.textContent = this.gameState.board[index];
            cell.className = 'cell';
            if (this.gameState.board[index]) {
                cell.classList.add(this.gameState.board[index]);
            }
        });

        // Actualizar indicador de turno
        this.currentTurnDisplay.textContent = this.gameState.currentPlayer;
        this.currentTurnDisplay.className = this.gameState.currentPlayer === 'X' ? 'player-x' : 'player-o';

        // Actualizar marcador
        this.scoreX.textContent = this.gameState.scores.X;
        this.scoreO.textContent = this.gameState.scores.O;
        this.gamesCount.textContent = this.gameState.totalGames;

        // Actualizar temporizador
        this.updateTimer(this.gameState.timeLeft || 20);

        // Manejar fin de juego
        if (this.gameState.winner) {
            this.handleGameEnd();
        }
    }

    updatePlayersStatus() {
        if (!this.gameState.players) return;

        const players = Object.values(this.gameState.players);
        let statusText = '';

        if (players.length === 1) {
            statusText = 'Esperando oponente... 🔍';
        } else if (players.length === 2) {
            statusText = '¡Ambos jugadores conectados! ✅';
        }

        this.playersStatus.textContent = statusText;
    }

    updateChat() {
        if (!this.gameState.chat) return;

        this.chatMessages.innerHTML = '';
        this.gameState.chat.slice(-10).forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message';
            if (message.playerId === this.playerId) {
                messageDiv.classList.add('own');
            }
            messageDiv.textContent = `${message.player}: ${message.text}`;
            this.chatMessages.appendChild(messageDiv);
        });

        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    updateTimer(timeLeft) {
        const percentage = (timeLeft / 20) * 100;
        this.timerFill.style.width = percentage + '%';
        this.timerText.textContent = timeLeft + 's';

        if (timeLeft <= 5) {
            this.timerFill.style.background = '#ff4747';
        } else {
            this.timerFill.style.background = 'linear-gradient(90deg, #00ffcc, #ff4747)';
        }
    }

    async makeMove(index) {
        if (!this.gameState || !this.gameState.gameActive) return;
        if (this.gameState.currentPlayer !== this.playerSymbol) return;
        if (this.gameState.board[index] !== '') return;

        const newBoard = [...this.gameState.board];
        newBoard[index] = this.playerSymbol;

        const winner = this.checkWinner(newBoard);
        const nextPlayer = this.playerSymbol === 'X' ? 'O' : 'X';

        const updates = {
            board: newBoard,
            currentPlayer: nextPlayer,
            timeLeft: 20,
            lastActivity: Date.now()
        };

        if (winner) {
            updates.gameActive = false;
            updates.winner = winner;
            if (winner !== 'draw') {
                updates.scores = {
                    ...this.gameState.scores,
                    [winner]: this.gameState.scores[winner] + 1
                };
            }
            updates.totalGames = this.gameState.totalGames + 1;
        }

        try {
            await database.ref(`rooms/${this.currentRoom}`).update(updates);
        } catch (error) {
            console.error('Error al hacer movimiento:', error);
        }
    }

    checkWinner(board) {
        const winningConditions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
            [0, 4, 8], [2, 4, 6] // Diagonales
        ];

        for (let [a, b, c] of winningConditions) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                // Resaltar línea ganadora
                setTimeout(() => {
                    this.cells[a].classList.add('winning');
                    this.cells[b].classList.add('winning');
                    this.cells[c].classList.add('winning');
                }, 100);
                return board[a];
            }
        }

        if (!board.includes('')) {
            return 'draw';
        }

        return null;
    }

    handleGameEnd() {
        const { winner } = this.gameState;
        let message = '';

        if (winner === 'draw') {
            message = '¡Empate! 🤝';
            this.sendChatMessage('¡Empate!', true);
        } else if (winner === this.playerSymbol) {
            message = '¡Ganaste! 🎉';
            this.createVictoryParticles();
            this.sendChatMessage(`¡${this.playerSymbol} gana la partida!`, true);
        } else {
            message = '¡Perdiste! 😔';
        }

        this.showTemporaryMessage(message);
        
        // Auto reinicio después de 3 segundos
        setTimeout(() => {
            if (this.gameState && !this.gameState.gameActive) {
                this.requestNewGame();
            }
        }, 3000);
    }

    createVictoryParticles() {
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.style.position = 'fixed';
                particle.style.width = '8px';
                particle.style.height = '8px';
                particle.style.backgroundColor = '#00ffcc';
                particle.style.borderRadius = '50%';
                particle.style.left = Math.random() * window.innerWidth + 'px';
                particle.style.top = window.innerHeight + 'px';
                particle.style.zIndex = '9999';
                particle.style.animation = 'particleFloat 2s ease-out forwards';
                particle.style.pointerEvents = 'none';
                document.body.appendChild(particle);
                
                setTimeout(() => {
                    if (document.body.contains(particle)) {
                        document.body.removeChild(particle);
                    }
                }, 2000);
            }, i * 100);
        }
    }

    async requestNewGame() {
        if (!this.currentRoom) return;

        const newGameState = {
            board: ['', '', '', '', '', '', '', '', ''],
            currentPlayer: 'X',
            gameActive: true,
            timeLeft: 20,
            winner: null,
            lastActivity: Date.now()
        };

        try {
            await database.ref(`rooms/${this.currentRoom}`).update(newGameState);
            
            // Limpiar efectos visuales
            this.cells.forEach(cell => {
                cell.classList.remove('winning');
            });
            
            this.sendChatMessage('Nueva partida iniciada!', true);
        } catch (error) {
            console.error('Error al reiniciar juego:', error);
        }
    }

    async surrender() {
        if (!this.gameState || !this.gameState.gameActive) return;

        const winner = this.playerSymbol === 'X' ? 'O' : 'X';
        const updates = {
            gameActive: false,
            winner: winner,
            scores: {
                ...this.gameState.scores,
                [winner]: this.gameState.scores[winner] + 1
            },
            totalGames: this.gameState.totalGames + 1,
            lastActivity: Date.now()
        };

        try {
            await database.ref(`rooms/${this.currentRoom}`).update(updates);
            await this.sendChatMessage(`${this.playerSymbol} se rindió`, true);
        } catch (error) {
            console.error('Error al rendirse:', error);
        }
    }

    async sendChatMessage(customMessage = null, isSystem = false) {
        const text = customMessage || this.chatInput.value.trim();
        if (!text || !this.currentRoom) return;

        const message = {
            playerId: this.playerId,
            player: isSystem ? 'Sistema' : this.playerSymbol,
            text: text,
            timestamp: Date.now()
        };

        try {
            const currentChat = this.gameState?.chat || [];
            const newChat = [...currentChat, message].slice(-20); // Mantener solo últimos 20 mensajes

            await database.ref(`rooms/${this.currentRoom}/chat`).set(newChat);
            
            if (!customMessage) {
                this.chatInput.value = '';
            }
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
        }
    }

    leaveRoom() {
        if (this.currentRoom) {
            // Remover jugador de la sala
            database.ref(`rooms/${this.currentRoom}/players/${this.playerId}`).remove();
            
            // Si no quedan jugadores, eliminar la sala
            database.ref(`rooms/${this.currentRoom}/players`).once('value', (snapshot) => {
                if (!snapshot.exists() || Object.keys(snapshot.val() || {}).length === 0) {
                    database.ref(`rooms/${this.currentRoom}`).remove();
                }
            });

            // Desconectar listeners
            database.ref(`rooms/${this.currentRoom}`).off();
        }

        // Resetear estado
        this.currentRoom = null;
        this.playerSymbol = null;
        this.gameState = null;

        // Mostrar panel de conexión
        this.connectionPanel.style.display = 'block';
        this.roomPanel.style.display = 'none';
        this.scorePanel.style.display = 'none';
        this.rulesPanel.style.display = 'none';
        this.chatPanel.style.display = 'none';
        this.gameTitle.style.display = 'none';
        this.turnIndicator.style.display = 'none';
        this.gameBoard.style.display = 'none';
        this.gameControls.style.display = 'none';

        this.roomCodeInput.value = '';
        this.showStatus('Desconectado de la sala', 'error');
    }

    showStatus(message, type) {
        this.connectionStatus.textContent = message;
        this.connectionStatus.className = `status-${type}`;
    }

    showTemporaryMessage(message) {
        const messageBox = document.createElement('div');
        messageBox.textContent = message;
        messageBox.style.position = 'fixed';
        messageBox.style.top = '50%';
        messageBox.style.left = '50%';
        messageBox.style.transform = 'translate(-50%, -50%)';
        messageBox.style.background = 'linear-gradient(45deg, #00ffcc, #ff4747)';
        messageBox.style.color = '#121212';
        messageBox.style.padding = '20px 40px';
        messageBox.style.borderRadius = '15px';
        messageBox.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.8)';
        messageBox.style.fontSize = '1.5rem';
        messageBox.style.zIndex = '9999';
        messageBox.style.textAlign = 'center';
        messageBox.style.fontWeight = 'bold';
        messageBox.style.animation = 'glow 0.5s ease-in-out infinite alternate';
        document.body.appendChild(messageBox);

        setTimeout(() => {
            if (document.body.contains(messageBox)) {
                document.body.removeChild(messageBox);
            }
        }, 2000);
    }

    // Método opcional para temporizador automático
    startGameTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(async () => {
            if (!this.gameState || !this.gameState.gameActive) {
                clearInterval(this.timerInterval);
                return;
            }

            const newTimeLeft = Math.max(0, (this.gameState.timeLeft || 20) - 1);
            
            if (newTimeLeft === 0 && this.gameState.currentPlayer === this.playerSymbol) {
                // Tiempo agotado, cambiar turno automáticamente
                const nextPlayer = this.playerSymbol === 'X' ? 'O' : 'X';
                await database.ref(`rooms/${this.currentRoom}`).update({
                    currentPlayer: nextPlayer,
                    timeLeft: 20
                });
                this.sendChatMessage(`Se acabó el tiempo para ${this.playerSymbol}`, true);
            } else {
                await database.ref(`rooms/${this.currentRoom}/timeLeft`).set(newTimeLeft);
            }
        }, 1000);
    }
}

// Agregar animación de partículas al CSS dinámicamente
const style = document.createElement('style');
style.textContent = `
    @keyframes particleFloat {
        0% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        100% {
            opacity: 0;
            transform: translateY(-200px) scale(0);
        }
    }
    
    @keyframes glow {
        from { 
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
        }
        to { 
            text-shadow: 0 0 20px rgba(0, 255, 255, 1);
            box-shadow: 0 0 40px rgba(0, 255, 255, 1);
        }
    }
`;
document.head.appendChild(style);

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si Firebase está disponible
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            // Cambiar a firebase.database() para usar Firebase real
            // const database = firebase.database();
            console.log('Firebase inicializado correctamente');
        } catch (error) {
            console.log('Usando modo demo (sin Firebase real)');
        }
    } else {
        console.log('Firebase no disponible - usando modo demo');
    }
    
    // Inicializar el juego
    new TicTacToeOnline();
});
