// Automated Test Suite Setup for Pyebwa
// Using Playwright for cross-browser testing

const fs = require('fs');
const path = require('path');

// Test configuration
const testConfig = {
    baseURL: 'https://rasin.pyebwa.com',
    testUser: {
        email: 'test@pyebwa.com',
        password: 'TestPassword123!'
    },
    browsers: ['chromium', 'firefox', 'webkit'],
    viewports: [
        { name: 'desktop', width: 1920, height: 1080 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', width: 375, height: 812 }
    ],
    timeout: 30000
};

// Create test directory structure
const dirs = [
    'tests',
    'tests/e2e',
    'tests/unit',
    'tests/integration',
    'tests/screenshots',
    'tests/reports'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Create package.json for test dependencies
const packageJson = {
    name: "pyebwa-tests",
    version: "1.0.0",
    description: "Automated test suite for Pyebwa family tree application",
    scripts: {
        "test": "playwright test",
        "test:ui": "playwright test --ui",
        "test:debug": "playwright test --debug",
        "test:mobile": "playwright test --project=mobile",
        "test:auth": "playwright test tests/e2e/auth.spec.js",
        "test:sso": "playwright test tests/e2e/sso.spec.js",
        "report": "playwright show-report"
    },
    devDependencies: {
        "@playwright/test": "^1.40.0",
        "dotenv": "^16.3.1"
    }
};

fs.writeFileSync('tests/package.json', JSON.stringify(packageJson, null, 2));
console.log('Created package.json');

// Create Playwright config
const playwrightConfig = `// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './e2e',
    timeout: 30 * 1000,
    expect: {
        timeout: 5000
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: '${testConfig.baseURL}',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        {
            name: 'mobile',
            use: { ...devices['iPhone 13'] },
        },
        {
            name: 'tablet',
            use: { ...devices['iPad Pro'] },
        },
    ],

    webServer: {
        command: 'echo "Using production server"',
        url: '${testConfig.baseURL}',
        reuseExistingServer: true,
    },
});
`;

fs.writeFileSync('tests/playwright.config.js', playwrightConfig);
console.log('Created playwright.config.js');

// Create test environment file
const envFile = `# Test Environment Variables
TEST_USER_EMAIL=${testConfig.testUser.email}
TEST_USER_PASSWORD=${testConfig.testUser.password}
BASE_URL=${testConfig.baseURL}
PYEBWA_URL=https://pyebwa.com
TIMEOUT=30000
`;

fs.writeFileSync('tests/.env', envFile);
console.log('Created .env file');

// Create test data
const testData = {
    users: [
        {
            email: 'test1@pyebwa.com',
            password: 'Test123!',
            displayName: 'Test User 1'
        },
        {
            email: 'test2@pyebwa.com',
            password: 'Test123!',
            displayName: 'Test User 2'
        }
    ],
    familyMembers: [
        {
            firstName: 'John',
            lastName: 'Doe',
            gender: 'male',
            birthDate: '1980-01-01',
            email: 'john@example.com',
            relationship: 'parent'
        },
        {
            firstName: 'Jane',
            lastName: 'Doe',
            gender: 'female',
            birthDate: '1982-05-15',
            email: 'jane@example.com',
            relationship: 'parent'
        }
    ]
};

fs.writeFileSync('tests/test-data.json', JSON.stringify(testData, null, 2));
console.log('Created test-data.json');

console.log('\nTest suite structure created successfully!');
console.log('\nTo install dependencies:');
console.log('cd tests && npm install');
console.log('\nTo run tests:');
console.log('npm test');