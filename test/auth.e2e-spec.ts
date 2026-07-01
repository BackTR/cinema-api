// test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'E2E Test User',
          email: `e2e-${Date.now()}@test.com`,
          password: 'Password123',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('CUSTOMER');
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          email: 'invalid-email',
          password: 'Password123',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          email: 'test@example.com',
          password: 'weak',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 409 for duplicate email', async () => {
      const email = `duplicate-${Date.now()}@test.com`;

      // Register pertama
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'User 1', email, password: 'Password123' })
        .expect(201);

      // Register kedua dengan email sama
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'User 2', email, password: 'Password123' })
        .expect(409);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully', async () => {
      const email = `login-${Date.now()}@test.com`;

      // Register dulu
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Login Test', email, password: 'Password123' });

      // Login
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should return 401 for wrong credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'notexist@test.com',
          password: 'WrongPass123',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });
});
