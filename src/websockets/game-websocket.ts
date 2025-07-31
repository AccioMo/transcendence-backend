import { FastifyInstance } from 'fastify';
import { gameService } from '../services/game';

/**
 * Game WebSocket handler
 * Handles real-time game communication
 */
export const setupGameWebSocket = async (fastify: FastifyInstance) => {
    (fastify as any).get('/ws/game/:gameId', { websocket: true }, (connection: any, req: any) => {
        const gameId = req.params.gameId;
        
        // Add connection to game
        gameService.addConnection(gameId, connection.socket);
        
        console.log(`Game WebSocket connection established for game: ${gameId}`);
        
        // Send current game state immediately
        gameService.getGameState(gameId).then(gameState => {
            if (gameState) {
                connection.socket.send(JSON.stringify({
                    type: 'game_state_update',
                    gameId,
                    gameState
                }));
            }
        }).catch(error => {
            console.error('Error getting game state:', error);
        });
        
        connection.socket.on('message', async (message: any) => {
            try {
                const data = JSON.parse(message.toString());
                
                switch (data.type) {
                    case 'player_move':
                        await gameService.handlePlayerMove(
                            gameId, 
                            data.userId, 
                            data.paddleY, 
                            data.timestamp
                        );
                        break;
                        
                    case 'score_update':
                        await gameService.updateScore(
                            gameId,
                            data.userId,
                            data.score
                        );
                        break;
                        
                    case 'ping':
                        // Respond to ping with pong for latency measurement
                        connection.socket.send(JSON.stringify({
                            type: 'pong',
                            timestamp: Date.now(),
                            clientTimestamp: data.timestamp
                        }));
                        break;
                        
                    case 'game_ready':
                        // Player indicates they're ready to start
                        connection.socket.send(JSON.stringify({
                            type: 'ready_acknowledged',
                            gameId
                        }));
                        break;
                        
                    case 'pause_request':
                        // Handle game pause requests
                        const gameState = await gameService.getGameState(gameId);
                        if (gameState && gameState.status === 'active') {
                            // Broadcast pause to all players
                            const pauseMessage = JSON.stringify({
                                type: 'game_paused',
                                gameId,
                                pausedBy: data.userId
                            });
                            // This would be handled by the game service
                        }
                        break;
                        
                    default:
                        console.log(`Unknown message type: ${data.type}`);
                }
            } catch (error) {
                console.error('Error processing game WebSocket message:', error);
                connection.socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid message format',
                    originalMessage: message.toString()
                }));
            }
        });
        
        connection.socket.on('close', () => {
            console.log(`Game WebSocket connection closed for game: ${gameId}`);
            gameService.removeConnection(gameId, connection.socket);
        });
        
        connection.socket.on('error', (error: any) => {
            console.error(`Game WebSocket error for game ${gameId}:`, error);
            gameService.removeConnection(gameId, connection.socket);
        });
    });
};
