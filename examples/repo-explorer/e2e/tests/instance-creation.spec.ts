import { test, expect } from '@playwright/test';

test.describe('Instance Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    // Click create button without filling form
    await page.getByRole('button', { name: /Create Instance/i }).click();
    
    // Should show validation messages (assuming form validation is implemented)
    // This test might need adjustment based on actual validation implementation
    await expect(page.getByText(/required/i)).toBeVisible();
  });

  test('should fill and submit instance creation form', async ({ page }) => {
    // Fill instance name
    await page.getByLabel(/Instance Name/i).fill('test-instance');
    
    // Fill API token (using a mock token for testing)
    await page.getByLabel(/Fly.io API Token/i).fill('fly_test_token_123');
    
    // Submit form
    await page.getByRole('button', { name: /Create Instance/i }).click();
    
    // Wait for potential API response
    // Note: In a real test, you might want to mock the API response
    await page.waitForTimeout(1000);
    
    // Check for success message or instance list update
    // This assertion might need adjustment based on actual UI behavior
    await expect(page.getByText(/test-instance/)).toBeVisible();
  });

  test('should disable create button while processing', async ({ page }) => {
    // Fill form
    await page.getByLabel(/Instance Name/i).fill('test-instance');
    await page.getByLabel(/Fly.io API Token/i).fill('fly_test_token_123');
    
    // Click create button
    const createButton = page.getByRole('button', { name: /Create Instance/i });
    await createButton.click();
    
    // Check if button is disabled during processing
    await expect(createButton).toBeDisabled();
  });
});