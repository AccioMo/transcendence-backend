import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';

/**
 * Authentication service for handling passwords and JWT tokens
 */
export class AuthService {
    private jwtSecret: string;
    private jwtExpiresIn: string;
    private saltRounds: number;

    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'development-secret-change-in-production';
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
        this.saltRounds = 12;
    }

    /**
     * Hash a password
     */
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    /**
     * Verify a password against a hash
     */
    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Generate a JWT token
     */
    generateToken(userId: string, username: string): string {
        const payload = { 
            userId, 
            username
        };
        
        return jwt.sign(payload, this.jwtSecret, { 
            expiresIn: this.jwtExpiresIn as any,
            issuer: 'transcendence-backend'
        });
    }

    /**
     * Verify a JWT token
     */
    verifyToken(token: string): any {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get token expiration date
     */
    getTokenExpirationDate(): Date {
        const now = new Date();
        now.setHours(now.getHours() + 24); // 24 hours from now
        return now;
    }

    /**
     * Extract token from Authorization header
     */
    extractTokenFromHeader(authHeader: string | undefined): string | null {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    /**
     * Validate email format
     */
    isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password strength
     */
    isValidPassword(password: string): { valid: boolean; message?: string } {
        if (password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }
        
        if (!/(?=.*[a-z])/.test(password)) {
            return { valid: false, message: 'Password must contain at least one lowercase letter' };
        }
        
        if (!/(?=.*[A-Z])/.test(password)) {
            return { valid: false, message: 'Password must contain at least one uppercase letter' };
        }
        
        if (!/(?=.*\d)/.test(password)) {
            return { valid: false, message: 'Password must contain at least one number' };
        }
        
        return { valid: true };
    }

    /**
     * Validate username
     */
    isValidUsername(username: string): { valid: boolean; message?: string } {
        if (username.length < 3) {
            return { valid: false, message: 'Username must be at least 3 characters long' };
        }
        
        if (username.length > 20) {
            return { valid: false, message: 'Username must be no more than 20 characters long' };
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
        }
        
        return { valid: true };
    }
}

// Export a singleton instance
export const authService = new AuthService();
