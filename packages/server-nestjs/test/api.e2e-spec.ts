import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { AuthSession, User } from '../src/entities';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let authSessionRepository: Repository<AuthSession>;

  const registerUser = async (email: string, password = 'password123') => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password, name: 'Test User' })
      .expect(200);
    return response.body as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string | null };
    };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    authSessionRepository = moduleFixture.get<Repository<AuthSession>>(getRepositoryToken(AuthSession));
  });

  beforeEach(async () => {
    await authSessionRepository.clear();
    await userRepository.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health is public', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
  });

  it('POST /v1/auth/register and POST /v1/auth/login', async () => {
    const email = 'alice@example.com';
    const password = 'password123';

    const registerResponse = await registerUser(email, password);
    expect(registerResponse.accessToken).toBeDefined();
    expect(registerResponse.refreshToken).toBeDefined();
    expect(registerResponse.user.email).toBe(email);

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ emailOrPhone: email, password })
      .expect(200);

    expect(loginResponse.body.accessToken).toBeDefined();
    expect(loginResponse.body.refreshToken).toBeDefined();
    expect(loginResponse.body.user.email).toBe(email);
  });

  it('POST /v1/auth/register rejects duplicate emails', async () => {
    const email = 'duplicate@example.com';

    await registerUser(email);

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password: 'password123' })
      .expect(409);
  });

  it('POST /v1/auth/login rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ emailOrPhone: 'missing@example.com', password: 'nope' })
      .expect(401);
  });

  it('POST /v1/auth/refresh issues new token and logout revokes', async () => {
    const email = 'refresh@example.com';
    const registerResponse = await registerUser(email);

    const refreshResponse = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: registerResponse.refreshToken })
      .expect(200);

    expect(refreshResponse.body.accessToken).toBeDefined();
    expect(refreshResponse.body.refreshToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .send({ refreshToken: registerResponse.refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: registerResponse.refreshToken })
      .expect(401);
  });

  it('Protected endpoints require Bearer token', async () => {
    await request(app.getHttpServer())
      .get('/v1/contacts')
      .expect(401);

    const registerResponse = await registerUser('guard@example.com');

    await request(app.getHttpServer())
      .get('/v1/contacts')
      .set('Authorization', `Bearer ${registerResponse.accessToken}`)
      .expect(200);
  });
});
