import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, CreateUserDTO, LoginDTO, AuthResponse } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this';
const TOKEN_EXPIRY = '7d';

// Mock database - в реальном приложении это будет PostgreSQL
const users: Map<string, User> = new Map();

export class AuthService {
  // Generate JWT token
  static generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  }

  // Verify JWT token
  static verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch (error) {
      return null;
    }
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Compare passwords
  static async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Register user
  static async register(data: CreateUserDTO): Promise<AuthResponse> {
    // Check if user exists
    if (Array.from(users.values()).some(u => u.email === data.email)) {
      throw new Error('User with this email already exists');
    }

    const hashedPassword = await this.hashPassword(data.password);
    const userId = Date.now().toString();

    const newUser: User = {
      id: userId,
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users.set(userId, newUser);

    const token = this.generateToken(userId);
    const { password, ...userWithoutPassword } = newUser;

    return {
      token,
      user: userWithoutPassword,
    };
  }

  // Login user
  static async login(data: LoginDTO): Promise<AuthResponse> {
    const user = Array.from(users.values()).find(u => u.email === data.email);

    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await this.comparePasswords(data.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    const token = this.generateToken(user.id);
    const { password, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
    };
  }

  // Get user by ID
  static getUser(userId: string): User | undefined {
    return users.get(userId);
  }
}
