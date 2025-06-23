import { Page } from '@playwright/test';

export async function createTestInstance(page: Page, name: string, token: string) {
  await page.getByLabel(/Instance Name/i).fill(name);
  await page.getByLabel(/Fly.io API Token/i).fill(token);
  await page.getByRole('button', { name: /Create Instance/i }).click();
  
  // Wait for instance creation to complete
  await page.waitForTimeout(2000);
}

export async function cloneRepository(page: Page, repoUrl: string) {
  await page.getByPlaceholder(/github.com/i).fill(repoUrl);
  await page.getByRole('button', { name: /Clone/i }).click();
  
  // Wait for cloning to start
  await page.waitForTimeout(1000);
}

export async function waitForInstanceReady(page: Page, instanceName: string) {
  // Wait for instance to appear in the list and be ready
  await page.waitForSelector(`text=${instanceName}`, { timeout: 30000 });
}

export async function selectInstance(page: Page, instanceName: string) {
  // Click on the instance in the list
  await page.click(`text=${instanceName}`);
}