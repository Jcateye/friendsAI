import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/app/middleware/asyncHandler';
import { validate } from '@/app/middleware/validate';
import { requireAuth } from '@/app/middleware/requireAuth';
import { loginUseCase, refreshUseCase, logoutUseCase, registerUseCase } from '@/application/usecases/authUsecases';
import { findUserById } from '@/infrastructure/repositories/userRepo';

export const authRouter = Router();

const loginSchema = z.object({
  body: z.object({
    emailOrPhone: z.string().min(3),
    password: z.string().min(6)
  })
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10)
  })
});

const registerSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
    name: z.string().min(1),
    password: z.string().min(6)
  })
});

authRouter.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { email, phone, name, password } = req.body;
  const result = await registerUseCase({ email, phone, name, password });
  res.json(result);
}));

authRouter.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { emailOrPhone, password } = req.body;
  const result = await loginUseCase({ emailOrPhone, password });
  res.json(result);
}));

authRouter.post('/refresh', validate(refreshSchema), asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await refreshUseCase(refreshToken);
  res.json(result);
}));

authRouter.post('/logout', validate(refreshSchema), asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await logoutUseCase(refreshToken);
  res.json({ status: 'ok' });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await findUserById(req.auth!.userId);
  res.json({ user });
}));
