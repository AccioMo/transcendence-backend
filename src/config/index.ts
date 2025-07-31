/**
 * Application configuration
 * Centralized configuration for the application
 */
export const config = {
    // Server configuration
    server: {
        port: 3000,
        host: '0.0.0.0',
    },
    
    // Logging configuration
    logging: {
        enabled: true,
        level: 'info'
    },
    
    // WebSocket configuration
    websocket: {
        enabled: true,
    },
    
    // Game configuration
    game: {
        maxPlayersPerRoom: 2,
        defaultDifficulty: 'medium',
        maxRooms: 100
    },
    
    // Chat configuration
    chat: {
        maxRooms: 50,
        maxMessagesHistory: 100,
        maxRoomNameLength: 50
    },
    
    // Matchmaking configuration
    matchmaking: {
        queueTimeout: 300000, // 5 minutes
        maxQueueSize: 1000
    }
};
