// Auth Route Smoke Suite
// Verifies the clean auth routes and public-site redirects.

const { test, expect } = require('@playwright/test');

const DOMAINS = {
    main: 'https://pyebwa.com',
    app: 'https://rasin.pyebwa.com/app',
    login: 'https://rasin.pyebwa.com/login',
    signup: 'https://rasin.pyebwa.com/signup',
    resetPassword: 'https://rasin.pyebwa.com/reset-password'
};

test.describe('Auth Route Surface', () => {
    test.beforeEach(async ({ page }) => {
        await page.context().clearCookies();
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    test('should serve the clean login route', async ({ page }) => {
        await page.goto(DOMAINS.login);
        await expect(page).toHaveURL(/\/login(\?|$)/);
        await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test('should redirect legacy login html route to clean login route', async ({ page }) => {
        await page.goto('https://rasin.pyebwa.com/login.html');
        await expect(page).toHaveURL(/\/login(\?|$)/);
    });

    test('should serve signup and reset-password on clean routes', async ({ page }) => {
        await page.goto(DOMAINS.signup);
        await expect(page).toHaveURL(/\/signup(\?|$)/);

        await page.goto(DOMAINS.resetPassword);
        await expect(page).toHaveURL(/\/reset-password(\?|$)/);
    });

    test('public site login shim should point to clean login route', async ({ page }) => {
        await page.goto('https://pyebwa.com/login/');
        await expect(page).toHaveURL(/rasin\.pyebwa\.com\/login(\?|$)/);
    });

    test('app should redirect unauthenticated requests to clean login route', async ({ page }) => {
        await page.goto(DOMAINS.app);
        await expect(page).toHaveURL(/\/login(\?|$)/);
    });
});
