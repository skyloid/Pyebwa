const express = require('express');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

describe('security regressions', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../server/db/auth');
  });

  test('requireAdmin rejects moderator role', () => {
    jest.doMock('../server/services/supabase', () => ({
      supabaseAdmin: {}
    }));
    const { requireAdmin } = require('../server/db/auth');
    const req = { user: { uid: 'mod-user', role: 'moderator' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('generic upload rejects caller supplied category outside authorized user scope', async () => {
    jest.doMock('../server/db/auth', () => ({
      verifySession: (req, res, next) => {
        req.user = { uid: 'user-1', role: 'member' };
        next();
      }
    }));
    const saveFile = jest.fn();
    jest.doMock('../server/services/file-storage', () => ({
      saveFile,
      saveLocalFile: jest.fn(),
      deleteFile: jest.fn()
    }));

    const uploadsRouter = require('../server/api/uploads');
    const app = express();
    app.use('/api/uploads', uploadsRouter);

    const response = await request(app)
      .post('/api/uploads/file')
      .field('category', 'trees/victim-tree')
      .field('type', 'documents')
      .attach('file', Buffer.from('hello'), {
        filename: 'note.txt',
        contentType: 'text/plain'
      });

    expect(response.status).toBe(403);
    expect(saveFile).not.toHaveBeenCalled();
  });

  test('signup does not pre-confirm email or log generated credentials', async () => {
    const createUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });
    jest.doMock('../server/services/supabase', () => ({
      supabaseAdmin: {
        auth: {
          admin: {
            createUser
          }
        }
      }
    }));
    jest.doMock('../server/db/queries/users', () => ({
      findById: jest.fn().mockResolvedValue({ id: 'user-1', display_name: 'Test User' }),
      create: jest.fn(),
      update: jest.fn()
    }));
    jest.doMock('../server/services/security-logger', () => ({
      logSecurityEvent: jest.fn(),
      logUnauthorizedAccess: jest.fn(),
      SecurityEvents: { ADMIN_ACTION: 'admin_action' }
    }));
    jest.doMock('../server/services/pyebwa-supabase-config', () => ({
      getAuthExternalUrl: () => 'https://rasin.pyebwa.com/supabase',
      getSiteUrl: () => 'https://rasin.pyebwa.com',
      getSupabaseAuthAdminUrl: () => 'http://127.0.0.1:9999',
      getSupabaseAuthJwtSecret: () => 'test-secret'
    }));
    jest.doMock('../server/services/email', () => ({
      isConfigured: false,
      sendWelcomeEmail: jest.fn()
    }));

    const authRouter = require('../server/api/auth-secure');
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);

    const response = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'new@example.com', fullName: 'Test User' });

    expect(response.status).toBe(201);
    expect(createUser).toHaveBeenCalledWith(expect.not.objectContaining({
      email_confirm: true
    }));
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Temp password'));
  });

  test('tree members with read access cannot update person records without write access', async () => {
    jest.doMock('../server/db/auth', () => ({
      verifySession: (req, res, next) => {
        req.user = { uid: 'member-user', role: 'member' };
        next();
      }
    }));
    jest.doMock('../server/db/queries/family-trees', () => ({
      hasAccess: jest.fn().mockResolvedValue(true),
      hasWriteAccess: jest.fn().mockResolvedValue(false)
    }));
    const update = jest.fn();
    jest.doMock('../server/db/queries/persons', () => ({
      findById: jest.fn().mockResolvedValue({ id: 'person-1', family_tree_id: 'tree-1' }),
      update
    }));

    const treesRouter = require('../server/api/trees');
    const app = express();
    app.use(express.json());
    app.use('/api/trees', treesRouter);

    const response = await request(app)
      .put('/api/trees/tree-1/persons/person-1')
      .send({ firstName: 'Changed' });

    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  test('tree owner can update member tree role', async () => {
    jest.doMock('../server/db/auth', () => ({
      verifySession: (req, res, next) => {
        req.user = { uid: 'owner-user', role: 'member' };
        next();
      }
    }));
    const updateMemberRole = jest.fn().mockResolvedValue({
      family_tree_id: 'tree-1',
      user_id: 'member-user',
      role: 'editor'
    });
    jest.doMock('../server/db/queries/family-trees', () => ({
      findById: jest.fn().mockResolvedValue({ id: 'tree-1', owner_id: 'owner-user' }),
      updateMemberRole,
      hasAccess: jest.fn(),
      hasWriteAccess: jest.fn()
    }));
    jest.doMock('../server/db/queries/persons', () => ({
      findById: jest.fn()
    }));

    const treesRouter = require('../server/api/trees');
    const app = express();
    app.use(express.json());
    app.use('/api/trees', treesRouter);

    const response = await request(app)
      .patch('/api/trees/tree-1/members/member-user/role')
      .send({ role: 'editor' });

    expect(response.status).toBe(200);
    expect(updateMemberRole).toHaveBeenCalledWith('tree-1', 'member-user', 'editor');
  });

  test('tree editor cannot update member tree role', async () => {
    jest.doMock('../server/db/auth', () => ({
      verifySession: (req, res, next) => {
        req.user = { uid: 'editor-user', role: 'member' };
        next();
      }
    }));
    const updateMemberRole = jest.fn();
    jest.doMock('../server/db/queries/family-trees', () => ({
      findById: jest.fn().mockResolvedValue({ id: 'tree-1', owner_id: 'owner-user' }),
      updateMemberRole,
      hasAccess: jest.fn(),
      hasWriteAccess: jest.fn().mockResolvedValue(true)
    }));
    jest.doMock('../server/db/queries/persons', () => ({
      findById: jest.fn()
    }));

    const treesRouter = require('../server/api/trees');
    const app = express();
    app.use(express.json());
    app.use('/api/trees', treesRouter);

    const response = await request(app)
      .patch('/api/trees/tree-1/members/member-user/role')
      .send({ role: 'viewer' });

    expect(response.status).toBe(403);
    expect(updateMemberRole).not.toHaveBeenCalled();
  });

  test('admin slideshow preview requires an authenticated admin session', async () => {
    jest.doMock('../server/db/auth', () => ({
      verifySession: (req, res, next) => {
        if (!req.headers.authorization) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        req.user = { uid: 'admin-user', role: 'admin' };
        next();
      },
      requireAdmin: (req, res, next) => {
        if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
          return res.status(403).json({ error: 'Admin access required' });
        }
        next();
      },
      requireSuperAdmin: jest.fn()
    }));
    jest.doMock('../server/db/pool', () => ({
      query: jest.fn()
    }));
    jest.doMock('../server/db/queries/users', () => ({}));
    jest.doMock('../server/services/file-storage', () => ({
      saveFile: jest.fn(),
      saveLocalFile: jest.fn(),
      getConfiguredPublicSupabaseUrl: jest.fn(() => '')
    }));
    jest.doMock('../server/services/slideshow-manager', () => ({
      VALID_PAGES: ['home'],
      getPublished: jest.fn(),
      getDraft: jest.fn(),
      saveDraft: jest.fn(),
      publishDraft: jest.fn()
    }));
    jest.doMock('../server/services/page-content-manager', () => ({
      getPublished: jest.fn(),
      getDraft: jest.fn(),
      saveDraft: jest.fn(),
      publishDraft: jest.fn()
    }));
    jest.doMock('../server/services/audit-report-manager', () => ({
      listReports: jest.fn()
    }));

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: jest.fn(() => 'image/png') },
      arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('image').buffer)
    });

    const adminRouter = require('../server/api/admin');
    const app = express();
    app.use('/api/admin', adminRouter);

    try {
      const response = await request(app)
        .get('/api/admin/slideshows/preview')
        .query({ url: 'https://pyebwa.com/example.png' });

      expect(response.status).toBe(401);
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('read-only tree member cannot send family update notifications', async () => {
    jest.doMock('../server/db/auth', () => ({
      verifySession: (req, res, next) => {
        req.user = { uid: 'viewer-user', role: 'member' };
        next();
      }
    }));
    jest.doMock('../server/db/queries/family-trees', () => ({
      findById: jest.fn().mockResolvedValue({
        id: 'tree-1',
        owner_id: 'owner-user',
        name: 'Test Tree'
      }),
      hasAccess: jest.fn().mockResolvedValue(true),
      hasWriteAccess: jest.fn().mockResolvedValue(false),
      getMemberIds: jest.fn().mockResolvedValue(['viewer-user', 'owner-user'])
    }));
    jest.doMock('../server/db/queries/users', () => ({
      findById: jest.fn().mockResolvedValue({
        id: 'viewer-user',
        email: 'viewer@example.com',
        display_name: 'Viewer User'
      })
    }));
    jest.doMock('../server/db/queries/admin', () => ({
      logAction: jest.fn()
    }));
    const sendFamilyUpdateEmail = jest.fn();
    jest.doMock('../server/services/email', () => ({
      sendFamilyUpdateEmail
    }));
    jest.doMock('../server/notification-service', () => ({
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    }));

    const notificationsRouter = require('../server/api/notifications');
    const app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationsRouter);

    const response = await request(app)
      .post('/api/notifications/family-update')
      .send({
        treeId: 'tree-1',
        updateType: 'profile',
        updateTitle: 'Changed profile',
        updateDescription: 'A profile changed'
      });

    expect(response.status).toBe(403);
    expect(sendFamilyUpdateEmail).not.toHaveBeenCalled();
  });

  test('read-only tree member cannot list invite tokens for a tree', async () => {
    jest.doMock('../server/db/auth', () => ({
      verifySession: (req, res, next) => {
        req.user = { uid: 'viewer-user', role: 'member' };
        next();
      }
    }));
    jest.doMock('../server/db/queries/family-trees', () => ({
      hasAccess: jest.fn().mockResolvedValue(true),
      hasWriteAccess: jest.fn().mockResolvedValue(false)
    }));
    jest.doMock('../server/db/queries/persons', () => ({
      findById: jest.fn()
    }));
    const findByTree = jest.fn().mockResolvedValue([
      { token: 'sensitive-token', tree_id: 'tree-1' }
    ]);
    jest.doMock('../server/db/queries/invites', () => ({
      findByTree,
      findByToken: jest.fn()
    }));
    jest.doMock('../server/db/queries/users', () => ({
      findById: jest.fn().mockResolvedValue({ role: 'member' })
    }));
    jest.doMock('../server/db/queries/admin', () => ({
      logAction: jest.fn()
    }));
    jest.doMock('../server/services/email', () => ({
      sendInviteEmail: jest.fn()
    }));
    jest.doMock('../server/db/pool', () => ({
      getClient: jest.fn()
    }));

    const invitesRouter = require('../server/api/invites');
    const app = express();
    app.use(express.json());
    app.use('/api/invites', invitesRouter);

    const response = await request(app).get('/api/invites/list/tree-1');

    expect(response.status).toBe(403);
    expect(findByTree).not.toHaveBeenCalled();
  });

  test('read-only tree member cannot list discovery request contact details', async () => {
    jest.doMock('../server/db/auth', () => ({
      verifySession: (req, res, next) => {
        req.user = { uid: 'viewer-user', role: 'member' };
        next();
      }
    }));
    jest.doMock('../server/db/queries/family-trees', () => ({
      hasAccess: jest.fn().mockResolvedValue(true),
      hasWriteAccess: jest.fn().mockResolvedValue(false),
      findById: jest.fn()
    }));
    const listByTree = jest.fn().mockResolvedValue([
      { requester_email: 'external@example.com', requester_message: 'private note' }
    ]);
    jest.doMock('../server/db/queries/discovery', () => ({
      normalizeDiscoverySettings: jest.fn(() => ({ enabled: true })),
      searchTreesBySurnameAndOrigin: jest.fn(),
      createRequest: jest.fn(),
      listByTree,
      updateStatus: jest.fn()
    }));
    jest.doMock('../server/db/queries/persons', () => ({}));
    jest.doMock('../server/db/queries/invites', () => ({}));
    jest.doMock('../server/db/queries/users', () => ({}));
    jest.doMock('../server/db/queries/admin', () => ({
      logAction: jest.fn()
    }));
    jest.doMock('../server/services/email', () => ({
      sendInviteEmail: jest.fn()
    }));

    const discoveryRouter = require('../server/api/discovery');
    const app = express();
    app.use(express.json());
    app.use('/api/discovery', discoveryRouter);

    const response = await request(app).get('/api/discovery/trees/tree-1/requests');

    expect(response.status).toBe(403);
    expect(listByTree).not.toHaveBeenCalled();
  });

  test('magic link endpoint does not expose Supabase account lookup errors', async () => {
    jest.doMock('../server/services/supabase', () => ({
      supabaseAdmin: {
        auth: {
          admin: {}
        }
      }
    }));
    jest.doMock('../server/db/queries/users', () => ({}));
    jest.doMock('../server/services/security-logger', () => ({
      logSecurityEvent: jest.fn(),
      logUnauthorizedAccess: jest.fn(),
      SecurityEvents: { ADMIN_ACTION: 'admin_action' }
    }));
    jest.doMock('../server/services/pyebwa-supabase-config', () => ({
      getAuthExternalUrl: () => 'https://rasin.pyebwa.com/supabase',
      getSiteUrl: () => 'https://rasin.pyebwa.com',
      getSupabaseAuthAdminUrl: () => 'http://127.0.0.1:9999',
      getSupabaseAuthJwtSecret: () => 'test-secret'
    }));

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: jest.fn().mockResolvedValue({ msg: 'User not found' })
    });

    const authRouter = require('../server/api/auth-secure');
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);

    try {
      const response = await request(app)
        .post('/api/auth/magic-link')
        .send({ email: 'missing@example.com', lang: 'en' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(JSON.stringify(response.body)).not.toContain('User not found');
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('revoked invite tokens cannot be accepted', async () => {
    jest.doMock('../server/db/auth', () => ({
      verifySession: (req, res, next) => {
        req.user = { uid: 'member-user', role: 'member' };
        next();
      }
    }));
    jest.doMock('../server/db/queries/family-trees', () => ({
      hasWriteAccess: jest.fn(),
      hasAccess: jest.fn()
    }));
    jest.doMock('../server/db/queries/persons', () => ({
      findById: jest.fn()
    }));
    jest.doMock('../server/db/queries/invites', () => ({
      findByToken: jest.fn().mockResolvedValue({
        token: 'revoked-token',
        status: 'revoked',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        tree_id: 'tree-1',
        person_id: 'person-1'
      })
    }));
    jest.doMock('../server/db/queries/users', () => ({
      findById: jest.fn()
    }));
    jest.doMock('../server/db/queries/admin', () => ({
      logAction: jest.fn()
    }));
    jest.doMock('../server/services/email', () => ({
      sendInviteEmail: jest.fn()
    }));
    const getClient = jest.fn();
    jest.doMock('../server/db/pool', () => ({
      getClient
    }));

    const invitesRouter = require('../server/api/invites');
    const app = express();
    app.use(express.json());
    app.use('/api/invites', invitesRouter);

    const response = await request(app).post('/api/invites/accept/revoked-token');

    expect(response.status).toBe(410);
    expect(getClient).not.toHaveBeenCalled();
  });

  test('database schema defines RLS and storage policies for tenant data', () => {
    const schema = fs.readFileSync(path.join(__dirname, '..', 'server/db/schema.sql'), 'utf8');

    expect(schema).toMatch(/ALTER TABLE users ENABLE ROW LEVEL SECURITY/);
    expect(schema).toMatch(/ALTER TABLE family_trees ENABLE ROW LEVEL SECURITY/);
    expect(schema).toMatch(/ALTER TABLE family_tree_members ENABLE ROW LEVEL SECURITY/);
    expect(schema).toMatch(/ALTER TABLE persons ENABLE ROW LEVEL SECURITY/);
    expect(schema).toMatch(/CREATE POLICY .*storage/i);
    expect(schema).toMatch(/is_tree_owner/);
    expect(schema).toMatch(/is_tree_writer/);
    expect(schema).toMatch(/CREATE POLICY users_update_admin/);
    expect(schema).not.toMatch(/CREATE POLICY users_update_own_limited/);
  });
});
