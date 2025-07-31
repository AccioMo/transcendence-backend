import { FastifyInstance } from 'fastify';
import { db } from './database';

export interface GamePlayer {
    userId: string;
    username: string;
    paddleY: number;
    score: number;
    isAi: boolean;
    side: 'left' | 'right'; // Which side of the ping-pong table
}

export interface Ball {
    x: number; // 0 = left edge, 1 = right edge
    y: number; // 0 = top, 1 = bottom
    velocityX: number; // -1 to 1, negative = moving left
    velocityY: number; // -1 to 1, negative = moving up
    speed: number; // multiplier for velocity
}

export interface GameState {
    gameId: string;
    players: GamePlayer[];
    ball: Ball;
    status: 'waiting' | 'active' | 'paused' | 'finished';
    isPrivate: boolean;
    maxPlayers: number;
    roomCode?: string;
    isAiGame: boolean;
    difficulty?: string;
    lastUpdate: number;
    winningScore: number;
    gameStartTime?: number;
}

export interface AIOpponent {
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    speed: number;
    accuracy: number;
    reactionTime: number;
}

/**
 * Game Service - Manages game state and WebSocket connections
 */
export class GameService {
    private games: Map<string, GameState> = new Map();
    private gameConnections: Map<string, Set<any>> = new Map();
    private aiOpponents: Map<string, AIOpponent> = new Map();

    /**
     * Create a new PvP game
     */
    async createPvPGame(createdBy: string, username: string, isPrivate: boolean = false, maxPlayers: number = 2): Promise<GameState> {
        const gameId = 'game-' + Math.random().toString(36).substring(2);
        const roomCode = isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined;

        // Store in database
        await db.createGame({
            id: gameId,
            createdBy,
            roomCode,
            isPrivate,
            maxPlayers,
            isAiGame: false
        });

        await db.addPlayerToGame(gameId, createdBy);

        const gameState: GameState = {
            gameId,
            players: [{
                userId: createdBy,
                username,
                paddleY: 0.5,
                score: 0,
                isAi: false,
                side: 'left'
            }],
            ball: this.initializeBall(),
            status: 'waiting',
            isPrivate,
            maxPlayers,
            roomCode,
            isAiGame: false,
            lastUpdate: Date.now(),
            winningScore: 11 // Standard ping-pong scoring
        };

        this.games.set(gameId, gameState);
        this.gameConnections.set(gameId, new Set());

        return gameState;
    }

    /**
     * Create a new AI game
     */
    async createAIGame(userId: string, username: string, difficulty: string = 'medium'): Promise<GameState> {
        const gameId = 'ai-game-' + Math.random().toString(36).substring(2);

        // Store in database
        await db.createGame({
            id: gameId,
            createdBy: userId,
            isAiGame: true,
            difficulty,
            maxPlayers: 2
        });

        await db.addPlayerToGame(gameId, userId);
        await db.addPlayerToGame(gameId, 'ai', true);

        // Create AI opponent
        const aiConfig = this.createAIOpponent(difficulty as any);
        this.aiOpponents.set(gameId, aiConfig);

        const gameState: GameState = {
            gameId,
            players: [
                {
                    userId,
                    username,
                    paddleY: 0.5,
                    score: 0,
                    isAi: false,
                    side: 'left'
                },
                {
                    userId: 'ai',
                    username: 'AI',
                    paddleY: 0.5,
                    score: 0,
                    isAi: true,
                    side: 'right'
                }
            ],
            ball: this.initializeBall(),
            status: 'active',
            isPrivate: false,
            maxPlayers: 2,
            isAiGame: true,
            difficulty,
            lastUpdate: Date.now(),
            winningScore: 11,
            gameStartTime: Date.now()
        };

        this.games.set(gameId, gameState);
        this.gameConnections.set(gameId, new Set());

        return gameState;
    }

    /**
     * Join an existing game
     */
    async joinGame(gameId: string, userId: string, username: string, roomCode?: string): Promise<GameState> {
        const game = await db.findGameById(gameId);
        if (!game) {
            throw new Error('Game not found');
        }

        if (game.is_private && roomCode !== game.room_code) {
            throw new Error('Invalid room code');
        }

        const playerCount = await db.getGamePlayerCount(gameId);
        if (playerCount >= game.max_players) {
            throw new Error('Game is full');
        }

        const isAlreadyInGame = await db.isUserInGame(gameId, userId);
        if (isAlreadyInGame) {
            throw new Error('User already in game');
        }

        await db.addPlayerToGame(gameId, userId);

        // Update in-memory state
        let gameState = this.games.get(gameId);
        if (!gameState) {
            // Reconstruct game state from database
            const players = await db.getGamePlayers(gameId);
            gameState = {
                gameId,
                players: players.map((p, index) => ({
                    userId: p.user_id,
                    username: p.username || 'AI',
                    paddleY: 0.5,
                    score: p.score,
                    isAi: p.is_ai === 1,
                    side: index === 0 ? 'left' : 'right'
                })),
                ball: this.initializeBall(),
                status: game.status as any,
                isPrivate: game.is_private === 1,
                maxPlayers: game.max_players,
                roomCode: game.room_code,
                isAiGame: game.is_ai_game === 1,
                difficulty: game.difficulty,
                lastUpdate: Date.now(),
                winningScore: 11
            };
            this.games.set(gameId, gameState);
        }

        // Determine side for new player
        const newPlayerSide = gameState.players.length === 1 ? 'right' : 'left';
        
        gameState.players.push({
            userId,
            username,
            paddleY: 0.5,
            score: 0,
            isAi: false,
            side: newPlayerSide
        });

        // Start game if we have enough players
        if (gameState.players.length === gameState.maxPlayers) {
            gameState.status = 'active';
            gameState.gameStartTime = Date.now();
            await db.updateGameStatus(gameId, 'active');
        }

        gameState.lastUpdate = Date.now();
        this.broadcastGameState(gameId, gameState);

        return gameState;
    }

    /**
     * Handle player move and update ball physics
     */
    async handlePlayerMove(gameId: string, userId: string, paddleY: number, timestamp?: number): Promise<void> {
        const gameState = this.games.get(gameId);
        if (!gameState) {
            throw new Error('Game not found');
        }

        const isUserInGame = await db.isUserInGame(gameId, userId);
        if (!isUserInGame) {
            throw new Error('User not in game');
        }

        if (gameState.status !== 'active') {
            throw new Error('Game is not active');
        }

        const moveTimestamp = timestamp || Date.now();

        // Update player position
        const player = gameState.players.find(p => p.userId === userId);
        if (player) {
            player.paddleY = Math.max(0.1, Math.min(0.9, paddleY)); // Keep paddle on screen
        }

        // Record move in database
        await db.recordGameMove(gameId, userId, paddleY, moveTimestamp);

        // Handle AI response if this is an AI game
        if (gameState.isAiGame) {
            const aiPlayer = gameState.players.find(p => p.isAi);
            if (aiPlayer) {
                const aiMove = this.calculateAIMove(gameId, gameState.ball);
                aiPlayer.paddleY = aiMove;
                await db.recordGameMove(gameId, 'ai', aiMove, Date.now());
            }
        }

        // Update ball physics for ping-pong
        this.updateBallPhysics(gameState);

        // Update scores in database if they changed
        for (const player of gameState.players) {
            await db.updatePlayerScore(gameId, player.userId, player.score);
        }

        gameState.lastUpdate = Date.now();
        this.broadcastGameState(gameId, gameState);
    }

    /**
     * Leave game
     */
    async leaveGame(gameId: string, userId: string): Promise<void> {
        const gameState = this.games.get(gameId);
        if (!gameState) {
            throw new Error('Game not found');
        }

        await db.removePlayerFromGame(gameId, userId);

        // Update in-memory state
        gameState.players = gameState.players.filter(p => p.userId !== userId);

        // End game if no players left or only AI left
        if (gameState.players.length === 0 || (gameState.isAiGame && gameState.players.length === 1 && gameState.players[0].isAi)) {
            gameState.status = 'finished';
            await db.updateGameStatus(gameId, 'finished');
            this.games.delete(gameId);
            this.gameConnections.delete(gameId);
            this.aiOpponents.delete(gameId);
        } else {
            gameState.lastUpdate = Date.now();
            this.broadcastGameState(gameId, gameState);
        }
    }

    /**
     * Get game state
     */
    async getGameState(gameId: string): Promise<GameState | null> {
        let gameState = this.games.get(gameId);
        if (!gameState) {
            // Try to reconstruct from database
            const game = await db.findGameById(gameId);
            if (!game) return null;

            const players = await db.getGamePlayers(gameId);
            gameState = {
                gameId,
                players: players.map((p, index) => ({
                    userId: p.user_id,
                    username: p.username || 'AI',
                    paddleY: 0.5,
                    score: p.score,
                    isAi: p.is_ai === 1,
                    side: index === 0 ? 'left' : 'right'
                })),
                ball: this.initializeBall(),
                status: game.status as any,
                isPrivate: game.is_private === 1,
                maxPlayers: game.max_players,
                roomCode: game.room_code,
                isAiGame: game.is_ai_game === 1,
                difficulty: game.difficulty,
                lastUpdate: Date.now(),
                winningScore: 11
            };
            this.games.set(gameId, gameState);
        }

        return gameState;
    }

    /**
     * Add WebSocket connection to game
     */
    addConnection(gameId: string, connection: any): void {
        if (!this.gameConnections.has(gameId)) {
            this.gameConnections.set(gameId, new Set());
        }
        this.gameConnections.get(gameId)!.add(connection);
    }

    /**
     * Remove WebSocket connection from game
     */
    removeConnection(gameId: string, connection: any): void {
        const connections = this.gameConnections.get(gameId);
        if (connections) {
            connections.delete(connection);
        }
    }

    /**
     * Broadcast game state to all connections
     */
    private broadcastGameState(gameId: string, gameState: GameState): void {
        const connections = this.gameConnections.get(gameId);
        if (!connections) return;

        const message = JSON.stringify({
            type: 'game_state_update',
            gameId,
            gameState
        });

        connections.forEach(connection => {
            try {
                connection.send(message);
            } catch (error) {
                console.error('Error sending message to connection:', error);
                connections.delete(connection);
            }
        });
    }

    /**
     * Initialize ball position and velocity for ping-pong
     */
    private initializeBall(): Ball {
        return {
            x: 0.5, // Center of table
            y: 0.5, // Center of table
            velocityX: Math.random() > 0.5 ? 0.6 : -0.6, // Random direction
            velocityY: (Math.random() - 0.5) * 0.4, // Small vertical component
            speed: 1.0
        };
    }

    /**
     * Reset ball to center for serve
     */
    private resetBall(gameState: GameState, servingPlayer: 'left' | 'right'): void {
        gameState.ball = {
            x: 0.5,
            y: 0.5,
            velocityX: servingPlayer === 'left' ? 0.6 : -0.6,
            velocityY: (Math.random() - 0.5) * 0.4,
            speed: 1.0
        };
    }

    /**
     * Update ball physics for ping-pong
     */
    private updateBallPhysics(gameState: GameState): void {
        const ball = gameState.ball;
        const deltaTime = 1/60; // Assume 60 FPS
        
        // Update ball position
        ball.x += ball.velocityX * ball.speed * deltaTime;
        ball.y += ball.velocityY * ball.speed * deltaTime;
        
        // Bounce off top and bottom walls
        if (ball.y <= 0 || ball.y >= 1) {
            ball.velocityY = -ball.velocityY;
            ball.y = Math.max(0, Math.min(1, ball.y));
        }
        
        // Check paddle collisions
        const leftPlayer = gameState.players.find(p => p.side === 'left');
        const rightPlayer = gameState.players.find(p => p.side === 'right');
        
        // Left paddle collision (ball moving left)
        if (ball.x <= 0.05 && ball.velocityX < 0 && leftPlayer) {
            const paddleTop = leftPlayer.paddleY - 0.1;
            const paddleBottom = leftPlayer.paddleY + 0.1;
            
            if (ball.y >= paddleTop && ball.y <= paddleBottom) {
                ball.velocityX = -ball.velocityX;
                ball.velocityY += (ball.y - leftPlayer.paddleY) * 2; // Add spin
                ball.speed *= 1.05; // Increase speed slightly
                ball.x = 0.05;
            }
        }
        
        // Right paddle collision (ball moving right)
        if (ball.x >= 0.95 && ball.velocityX > 0 && rightPlayer) {
            const paddleTop = rightPlayer.paddleY - 0.1;
            const paddleBottom = rightPlayer.paddleY + 0.1;
            
            if (ball.y >= paddleTop && ball.y <= paddleBottom) {
                ball.velocityX = -ball.velocityX;
                ball.velocityY += (ball.y - rightPlayer.paddleY) * 2; // Add spin
                ball.speed *= 1.05; // Increase speed slightly
                ball.x = 0.95;
            }
        }
        
        // Check for scoring
        if (ball.x < 0) {
            // Right player scores
            if (rightPlayer) {
                rightPlayer.score++;
                this.resetBall(gameState, 'right');
            }
        } else if (ball.x > 1) {
            // Left player scores
            if (leftPlayer) {
                leftPlayer.score++;
                this.resetBall(gameState, 'left');
            }
        }
        
        // Check for game end
        const winningScore = gameState.winningScore;
        if (leftPlayer && leftPlayer.score >= winningScore) {
            gameState.status = 'finished';
        } else if (rightPlayer && rightPlayer.score >= winningScore) {
            gameState.status = 'finished';
        }
    }
    private createAIOpponent(difficulty: 'easy' | 'medium' | 'hard' | 'expert'): AIOpponent {
        const configs = {
            easy: { speed: 0.3, accuracy: 0.6, reactionTime: 300 },
            medium: { speed: 0.5, accuracy: 0.75, reactionTime: 200 },
            hard: { speed: 0.7, accuracy: 0.85, reactionTime: 150 },
            expert: { speed: 0.9, accuracy: 0.95, reactionTime: 100 }
        };

        return {
            difficulty,
            ...configs[difficulty]
        };
    }

    /**
     * Calculate AI move based on ball position and difficulty
     */
    private calculateAIMove(gameId: string, ball: Ball): number {
        const aiConfig = this.aiOpponents.get(gameId);
        if (!aiConfig) return 0.5;

        // Predict where ball will be when it reaches AI paddle
        let predictedY = ball.y;
        if (ball.velocityX > 0) { // Ball moving towards AI (right side)
            const timeToReach = (0.95 - ball.x) / ball.velocityX;
            predictedY = ball.y + (ball.velocityY * timeToReach);
            predictedY = Math.max(0.1, Math.min(0.9, predictedY));
        }

        // Add some error based on difficulty
        const error = (Math.random() - 0.5) * (1 - aiConfig.accuracy) * 0.3;
        const targetY = predictedY + error;
        
        // AI reaction time - don't move instantly
        const currentY = 0.5; // This would be AI's current position in a real implementation
        const maxMove = aiConfig.speed * 0.02; // Limit movement speed per frame
        const diff = targetY - currentY;
        const move = Math.sign(diff) * Math.min(Math.abs(diff), maxMove);
        
        return Math.max(0.1, Math.min(0.9, currentY + move));
    }

    /**
     * Update player score
     */
    async updateScore(gameId: string, userId: string, score: number): Promise<void> {
        const gameState = this.games.get(gameId);
        if (!gameState) {
            throw new Error('Game not found');
        }

        const player = gameState.players.find(p => p.userId === userId);
        if (player) {
            player.score = score;
            await db.updatePlayerScore(gameId, userId, score);
        }

        gameState.lastUpdate = Date.now();
        this.broadcastGameState(gameId, gameState);
    }
}

// Export singleton instance
export const gameService = new GameService();
