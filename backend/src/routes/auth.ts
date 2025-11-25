import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    const result = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: role || 'master',
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await AuthService.login({ email, password });

    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = AuthService.getUser(req.userId!);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Logout (simple - client removes token)
router.post('/logout', authMiddleware, (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
