#!/usr/bin/env bun

/**
 * Test script for the Fly.io Workflow Orchestrator API
 * Run this after starting the server with 'bun dev'
 */

const API_URL = "http://localhost:3000/api";
const BASE_URL = "http://localhost:3000";

interface TestResult {
  name: string;
  success: boolean;
  response?: any;
  error?: string;
}

const tests: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<Response>
): Promise<void> {
  console.log(`\n${name}...`);
  try {
    const response = await testFn();
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
    tests.push({ name, success: response.ok, response: data });
  } catch (error) {
    console.error(`Error: ${error}`);
    tests.push({ name, success: false, error: String(error) });
  }
}

async function main() {
  console.log("🧪 Testing Fly.io Workflow Orchestrator API");
  console.log("===========================================");

  // Test 1: Health check
  await runTest("1️⃣  Testing health endpoint", async () => {
    return fetch(`${BASE_URL}/health`);
  });

  // Test 2: API info
  await runTest("2️⃣  Testing API info endpoint", async () => {
    return fetch(API_URL);
  });

  // Test 3: List workflows
  await runTest("3️⃣  Listing available workflows", async () => {
    return fetch(`${API_URL}/workflows`);
  });

  // Test 4: Create a test instance (will fail without valid Fly.io token)
  await runTest(
    "4️⃣  Attempting to create instance (expected to fail without valid token)",
    async () => {
      return fetch(`${API_URL}/instances`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test-instance",
          region: "iad",
          size: "shared-cpu-1x",
          memoryMb: 256,
        }),
      });
    }
  );

  // Test 5: List instances
  await runTest("5️⃣  Listing instances", async () => {
    return fetch(`${API_URL}/instances`);
  });

  // Summary
  console.log("\n✅ Basic API tests complete!");
  console.log("\nTest Summary:");
  const passed = tests.filter((t) => t.success).length;
  console.log(`  Passed: ${passed}/${tests.length}`);

  if (passed < tests.length) {
    console.log("\n  Failed tests:");
    tests
      .filter((t) => !t.success)
      .forEach((t) => console.log(`    - ${t.name}`));
  }

  console.log("\nTo test with a real Fly.io token:");
  console.log("1. Get your token: fly auth token");
  console.log("2. Update FLY_API_TOKEN in .env");
  console.log("3. Restart the server");
  console.log("4. Run this script again: bun run scripts/test-api.ts");
}

// Run the tests
main().catch(console.error);
