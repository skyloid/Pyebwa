const admin = require('firebase-admin');
const request = require('supertest');
const express = require('express');

// Mock the auth routes
const authRoutes = require('../../server/api/auth');

describe('Authentication Service', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
  });

  describe('User Registration', () => {
    test('should create new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        displayName: 'Test User',
        familyTreeName: 'Test Family'
      };

      const mockUser = testHelpers.createMockUser({
        email: userData.email,
        displayName: userData.displayName
      });

      admin.auth().createUser.mockResolvedValue(mockUser);
      admin.firestore().collection().doc().set.mockResolvedValue();

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('uid');
      expect(response.body).toHaveProperty('email', userData.email);
      expect(admin.auth().createUser).toHaveBeenCalledWith({
        email: userData.email,
        displayName: userData.displayName,
        password: expect.any(String)
      });
    });

    test('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        displayName: 'Test User',
        familyTreeName: 'Test Family'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    test('should handle duplicate email registration', async () => {
      const userData = {
        email: 'existing@example.com',
        displayName: 'Test User',
        familyTreeName: 'Test Family'
      };

      admin.auth().createUser.mockRejectedValue({
        code: 'auth/email-already-exists'
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('Password Reset', () => {
    test('should generate password reset link for valid email', async () => {
      const email = 'test@example.com';
      
      admin.auth().getUserByEmail.mockResolvedValue(
        testHelpers.createMockUser({ email })
      );
      admin.auth().generatePasswordResetLink = jest.fn()
        .mockResolvedValue('https://example.com/reset?token=abc123');

      const response = await request(app)
        .post('/auth/reset-password')
        .send({ email })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(admin.auth().generatePasswordResetLink).toHaveBeenCalledWith(email);
    });

    test('should handle non-existent user gracefully', async () => {
      const email = 'nonexistent@example.com';
      
      admin.auth().getUserByEmail.mockRejectedValue({
        code: 'auth/user-not-found'
      });

      const response = await request(app)
        .post('/auth/reset-password')
        .send({ email })
        .expect(200); // Still return 200 for security

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('User Management', () => {
    test('should update user profile with valid data', async () => {
      const uid = 'test-user-123';
      const updateData = {
        displayName: 'Updated Name',
        photoURL: 'https://example.com/photo.jpg'
      };

      admin.auth().updateUser.mockResolvedValue(
        testHelpers.createMockUser({ ...updateData, uid })
      );

      const response = await request(app)
        .patch(`/auth/user/${uid}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('uid', uid);
      expect(response.body).toHaveProperty('displayName', updateData.displayName);
      expect(admin.auth().updateUser).toHaveBeenCalledWith(uid, updateData);
    });

    test('should validate user data before update', async () => {
      const uid = 'test-user-123';
      const invalidData = {
        email: 'invalid-email-format'
      };

      const response = await request(app)
        .patch(`/auth/user/${uid}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(admin.auth().updateUser).not.toHaveBeenCalled();
    });
  });

  describe('Custom Claims', () => {
    test('should set admin claims for authorized users', async () => {
      const uid = 'test-user-123';
      const claims = { admin: true, role: 'super-admin' };

      admin.auth().setCustomUserClaims.mockResolvedValue();

      const response = await request(app)
        .post(`/auth/user/${uid}/claims`)
        .send({ claims })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(admin.auth().setCustomUserClaims).toHaveBeenCalledWith(uid, claims);
    });

    test('should reject unauthorized claim updates', async () => {
      const uid = 'test-user-123';
      const claims = { admin: true };

      // Mock unauthorized request (no admin token)
      const response = await request(app)
        .post(`/auth/user/${uid}/claims`)
        .send({ claims })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(admin.auth().setCustomUserClaims).not.toHaveBeenCalled();
    });
  });
});