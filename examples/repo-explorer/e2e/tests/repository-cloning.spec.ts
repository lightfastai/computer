import { test, expect } from '@playwright/test';

test.describe('Repository Cloning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Assume we need to create an instance first
    // In real tests, you might want to set up test data or mock APIs
  });

  test('should display repository cloning section', async ({ page }) => {
    // Check if repository cloning section exists
    await expect(page.getByRole('heading', { name: /Clone Repository/i })).toBeVisible();
  });

  test('should show clone form with required fields', async ({ page }) => {
    // Check for repository URL input
    await expect(page.getByPlaceholder(/github.com/i)).toBeVisible();
    
    // Check for clone button
    await expect(page.getByRole('button', { name: /Clone/i })).toBeVisible();
  });

  test('should validate repository URL format', async ({ page }) => {
    // Enter invalid URL
    const repoInput = page.getByPlaceholder(/github.com/i);
    await repoInput.fill('invalid-url');
    
    // Try to clone
    await page.getByRole('button', { name: /Clone/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/valid.*url/i)).toBeVisible();
  });

  test('should accept valid GitHub repository URL', async ({ page }) => {
    // Enter valid GitHub URL
    const repoInput = page.getByPlaceholder(/github.com/i);
    await repoInput.fill('https://github.com/example/repo');
    
    // Click clone button
    await page.getByRole('button', { name: /Clone/i }).click();
    
    // Should show loading state
    await expect(page.getByText(/cloning/i)).toBeVisible();
  });
});