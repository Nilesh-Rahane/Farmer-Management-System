#!/usr/bin/env node
/**
 * Farm Ledger - Standard Model Context Protocol (MCP) Server
 * Transport: Standard Input / Standard Output (JSON-RPC 2.0)
 * Allows external LLMs (Claude Desktop, Cursor, Antigravity IDE, etc.) to securely query Farm Ledger
 */

require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { MCP_TOOL_DEFINITIONS, executeTool } = require('../utils/assistantTools');

let activeFarmer = null;

async function bootstrap() {
  await connectDB();

  // Find farmer from environment or default to first farmer
  const farmerEmail = process.env.FARMER_EMAIL;
  if (farmerEmail) {
    activeFarmer = await User.findOne({ email: farmerEmail, role: 'farmer' });
  }
  if (!activeFarmer) {
    activeFarmer = await User.findOne({ role: 'farmer' });
  }

  if (!activeFarmer) {
    process.stderr.write('Warning: No farmer account found in database.\n');
  } else {
    process.stderr.write(`Farm Ledger MCP Server active for farmer: ${activeFarmer.name} (${activeFarmer.email})\n`);
  }
}

// Set up stdio JSON-RPC listener
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on('line', async (line) => {
  if (!line || !line.trim()) return;

  try {
    const request = JSON.parse(line.trim());
    const response = await handleRpcMessage(request);
    if (response) {
      process.stdout.write(JSON.stringify(response) + '\n');
    }
  } catch (err) {
    process.stderr.write(`JSON-RPC Parse Error: ${err.message}\n`);
  }
});

async function handleRpcMessage(request) {
  const { id, method, params } = request;

  switch (method) {
    // 1. MCP Handshake / Initialize
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'farm-ledger-mcp-server',
            version: '1.0.0',
          },
        },
      };

    case 'notifications/initialized':
      return null;

    // 2. Tools Listing
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOL_DEFINITIONS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      };

    // 3. Tool Execution
    case 'tools/call': {
      if (!activeFarmer) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: 'Error: No active farmer account configured.' }],
            isError: true,
          },
        };
      }

      const { name, arguments: toolArgs } = params || {};
      try {
        const result = await executeTool(name, toolArgs || {}, activeFarmer._id);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        };
      } catch (err) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Tool execution failed: ${err.message}` }],
            isError: true,
          },
        };
      }
    }

    // Ping
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}

bootstrap().catch((err) => {
  process.stderr.write(`MCP Bootstrap Error: ${err.message}\n`);
});
