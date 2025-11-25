import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'Backend is running!', timestamp: new Date() });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation:`);
  console.log(`   POST   /api/auth/register - Register new user`);
  console.log(`   POST   /api/auth/login - Login user`);
  console.log(`   GET    /api/auth/me - Get current user (requires token)`);
  console.log(`   POST   /api/auth/logout - Logout`);
});
