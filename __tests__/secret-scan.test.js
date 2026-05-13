const {
  scanText,
  formatFindings
} = require('../scripts/scan-secrets');

describe('secret scanner', () => {
  test('detects hardcoded JWT-shaped keys', () => {
    const findings = scanText(
      'example.js',
      "const key = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signaturevalue123456';"
    );

    expect(findings).toEqual([
      expect.objectContaining({
        file: 'example.js',
        rule: 'jwt'
      })
    ]);
  });

  test('detects high-confidence API secret prefixes', () => {
    const findings = scanText(
      'example.env',
      'RESEND_API_KEY=re_1234567890abcdefghijklmnopqrstuv'
    );

    expect(findings).toEqual([
      expect.objectContaining({
        file: 'example.env',
        rule: 'api-secret-prefix'
      })
    ]);
  });

  test('allows placeholders and environment interpolation', () => {
    const findings = scanText(
      '.env.example',
      [
        'SUPABASE_SERVICE_ROLE_KEY=replace_with_supabase_service_role_key',
        'DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/postgres',
        'FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"'
      ].join('\n')
    );

    expect(findings).toEqual([]);
  });

  test('formats findings without echoing secret values', () => {
    const output = formatFindings([
      {
        file: 'example.js',
        line: 1,
        column: 13,
        rule: 'jwt',
        message: 'JWT-shaped token'
      }
    ]);

    expect(output).toContain('example.js:1:13');
    expect(output).toContain('JWT-shaped token');
    expect(output).not.toContain('eyJ');
  });
});
