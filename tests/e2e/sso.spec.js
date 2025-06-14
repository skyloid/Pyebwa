// SSO (Single Sign-On) Test Suite
// Verifies authentication works across pyebwa.com and rasin.pyebwa.com

const { test, expect } = require('@playwright/test');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Test data
const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || 'test@pyebwa.com',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!'
};

const DOMAINS = {
    main: 'https://pyebwa.com',
    app: 'https://rasin.pyebwa.com/app',
    login: 'https://rasin.pyebwa.com/login.html'
};

test.describe('SSO Cross-Domain Authentication', () => {
    test.beforeEach(async ({ page }) => {
        // Clear all cookies and storage to start fresh
        await page.context().clearCookies();
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    test('should maintain authentication across domains', async ({ page }) => {
        // Step 1: Login on rasin.pyebwa.com
        await page.goto(DOMAINS.login);
        await page.fill('input[type="email"]', TEST_USER.email);
        await page.fill('input[type="password"]', TEST_USER.password);
        await page.click('button[type="submit"]');
        
        // Wait for redirect to app
        await page.waitForURL('**/app/**', { timeout: 10000 });
        
        // Verify we're logged in
        await expect(page.locator('.user-email')).toContainText(TEST_USER.email);
        
        // Step 2: Navigate to main domain
        await page.goto(DOMAINS.main);
        
        // Check if user is recognized (should show Dashboard button instead of Login)
        const dashboardLink = page.locator('a:has-text("Dashboard")');
        await expect(dashboardLink).toBeVisible({ timeout: 5000 });
        
        // Step 3: Go back to app and verify still logged in
        await page.goto(DOMAINS.app);
        await expect(page.locator('.user-email')).toContainText(TEST_USER.email);
    });

    test('should persist authentication after page refresh', async ({ page }) => {
        // Login
        await page.goto(DOMAINS.login);
        await page.fill('input[type="email"]', TEST_USER.email);
        await page.fill('input[type="password"]', TEST_USER.password);
        await page.click('button[type="submit"]');
        
        // Wait for app to load
        await page.waitForURL('**/app/**');
        await expect(page.locator('.user-email')).toContainText(TEST_USER.email);
        
        // Refresh page
        await page.reload();
        
        // Should still be logged in
        await expect(page.locator('.user-email')).toContainText(TEST_USER.email);
        
        // Should not redirect to login
        expect(page.url()).toContain('/app');
    });

    test('should handle logout correctly across domains', async ({ page }) => {
        // Login first
        await page.goto(DOMAINS.login);
        await page.fill('input[type="email"]', TEST_USER.email);
        await page.fill('input[type="password"]', TEST_USER.password);
        await page.click('button[type="submit"]');
        
        await page.waitForURL('**/app/**');
        
        // Logout
        await page.click('.user-menu-btn');
        await page.click('a#logoutBtn');
        
        // Should redirect to login
        await page.waitForURL('**/login.html');
        
        // Verify logged out on main domain too
        await page.goto(DOMAINS.main);
        const loginButton = page.locator('button:has-text("Konekte")');
        await expect(loginButton).toBeVisible();
    });

    test('should share authentication state between tabs', async ({ browser }) => {
        // Create two contexts (tabs)
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        
        try {
            // Login in first tab
            await page1.goto(DOMAINS.login);
            await page1.fill('input[type="email"]', TEST_USER.email);
            await page1.fill('input[type="password"]', TEST_USER.password);
            await page1.click('button[type="submit"]');
            
            await page1.waitForURL('**/app/**');
            
            // Open app in second tab - should be authenticated
            await page2.goto(DOMAINS.app);
            
            // Check if redirected to login (should not be)
            const currentUrl = page2.url();
            expect(currentUrl).toContain('/app');
            
            // Verify user is shown
            await expect(page2.locator('.user-email')).toContainText(TEST_USER.email, { timeout: 10000 });
        } finally {
            await context1.close();
            await context2.close();
        }
    });

    test('should handle authentication with cookies disabled', async ({ browser }) => {
        // Create context with cookies disabled
        const context = await browser.newContext({
            // Note: Playwright doesn't directly support disabling cookies,
            // but we can test localStorage/sessionStorage fallback
            javaScriptEnabled: true
        });
        
        const page = await context.newPage();
        
        // Block cookies through CDP
        const client = await page.context().newCDPSession(page);
        await client.send('Network.setCookiesBlocked', { blocked: true });
        
        // Try to login
        await page.goto(DOMAINS.login);
        await page.fill('input[type="email"]', TEST_USER.email);
        await page.fill('input[type="password"]', TEST_USER.password);
        await page.click('button[type="submit"]');
        
        // Should still work with localStorage/sessionStorage
        await page.waitForURL('**/app/**', { timeout: 15000 });
        
        await context.close();
    });
});

test.describe('Authentication Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
        // Login first
        await page.goto(DOMAINS.login);
        await page.fill('input[type="email"]', TEST_USER.email);
        await page.fill('input[type="password"]', TEST_USER.password);
        await page.click('button[type="submit"]');
        
        await page.waitForURL('**/app/**');
        
        // Simulate offline
        await page.context().setOffline(true);
        
        // Try to navigate
        await page.reload().catch(() => {}); // Ignore navigation error
        
        // Go back online
        await page.context().setOffline(false);
        
        // Reload - should still be authenticated
        await page.reload();
        await expect(page.locator('.user-email')).toContainText(TEST_USER.email, { timeout: 10000 });
    });

    test('should handle token expiration', async ({ page }) => {
        // This would require mocking Firebase auth or waiting for actual token expiry
        // For now, we'll test the refresh mechanism exists
        
        await page.goto(DOMAINS.app);
        
        // Check if auth-enhanced.js is loaded
        const hasAuthEnhanced = await page.evaluate(() => {
            return typeof window.pyebwaAuth !== 'undefined';
        });
        
        expect(hasAuthEnhanced).toBe(true);
        
        // Check if refresh token function exists
        const hasRefreshToken = await page.evaluate(() => {
            return typeof window.pyebwaAuth.refreshToken === 'function';
        });
        
        expect(hasRefreshToken).toBe(true);
    });
});