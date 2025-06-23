import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check if the main heading is visible
    await expect(page.getByRole('heading', { name: /Repository Explorer/i })).toBeVisible();
    
    // Check if the instance creation form is visible
    await expect(page.getByRole('heading', { name: /Create New Instance/i })).toBeVisible();
  });

  test('should display theme toggle', async ({ page }) => {
    await page.goto('/');
    
    // Check if theme toggle button exists
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();
    
    // Test theme switching
    await themeToggle.click();
    // Wait for theme transition
    await page.waitForTimeout(300);
  });

  test('should show instance creation form with required fields', async ({ page }) => {
    await page.goto('/');
    
    // Check for instance name input
    await expect(page.getByLabel(/Instance Name/i)).toBeVisible();
    
    // Check for API token input
    await expect(page.getByLabel(/Fly.io API Token/i)).toBeVisible();
    
    // Check for create button
    await expect(page.getByRole('button', { name: /Create Instance/i })).toBeVisible();
  });
});