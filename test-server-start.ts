#!/usr/bin/env bun
/**
 * Test SDK server start
 */

import { createOpencode } from "@opencode-ai/sdk";

async function test() {
  console.log("Testing SDK server start...\n");
  
  try {
    console.log("Creating SDK instance on port 4102...");
    const opencode = await createOpencode({
      hostname: "127.0.0.1",
      port: 4102,
      timeout: 10000, // 10 second timeout
      config: {
        permission: {
          read: "allow",
          edit: "allow",
          bash: "allow",
        },
      },
    });
    
    console.log(`✅ Server started at ${opencode.server.url}`);
    
    // Create a quick session to verify it works
    const session = await opencode.client.session.create({
      body: { title: "Test" },
    });
    console.log(`✅ Session created: ${session.data.id}`);
    
    opencode.server.close();
    console.log("\n✅ Server test PASSED!");
    
  } catch (error) {
    console.error("\n❌ Server test FAILED:", error);
    process.exit(1);
  }
}

test();
