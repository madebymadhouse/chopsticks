/**
 * Protocol Versioning Tests
 * Level 1: Invariants Locked - Contract Tests
 * 
 * Verifies:
 * - Protocol version constants exist
 * - Hello message includes protocolVersion
 * - Controller validates version compatibility
 * - Incompatible versions are rejected
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Protocol Versioning', function() {
  describe('Version Constants', function() {
    it('should have PROTOCOL_VERSION in agentRunner.js', function() {
      const runnerPath = path.join(__dirname, '../../src/agents/agentRunner.js');
      const runnerCode = fs.readFileSync(runnerPath, 'utf8');
      
      assert(
        runnerCode.includes('const PROTOCOL_VERSION = "1.0.0"'),
        'agentRunner.js must define PROTOCOL_VERSION = "1.0.0"'
      );
    });

    it('should have PROTOCOL_VERSION in agentManager.js', function() {
      const managerPath = path.join(__dirname, '../../src/agents/agentManager.js');
      const managerCode = fs.readFileSync(managerPath, 'utf8');
      
      assert(
        managerCode.includes('const PROTOCOL_VERSION = "1.0.0"'),
        'agentManager.js must define PROTOCOL_VERSION = "1.0.0"'
      );
    });

    it('should have SUPPORTED_VERSIONS in agentManager.js', function() {
      const managerPath = path.join(__dirname, '../../src/agents/agentManager.js');
      const managerCode = fs.readFileSync(managerPath, 'utf8');
      
      assert(
        managerCode.includes('SUPPORTED_VERSIONS'),
        'agentManager.js must define SUPPORTED_VERSIONS'
      );
    });
  });

  describe('Hello Message Format', function() {
    it('should include protocolVersion in sendHello', function() {
      const runnerPath = path.join(__dirname, '../../src/agents/agentRunner.js');
      const runnerCode = fs.readFileSync(runnerPath, 'utf8');
      
      // Find sendHello function
      const sendHelloMatch = runnerCode.match(/function sendHello\(\)[^}]*\{([\s\S]*?)\n\s*\}/);
      assert(sendHelloMatch, 'sendHello function must exist');
      
      const sendHelloBody = sendHelloMatch[1];
      assert(
        sendHelloBody.includes('protocolVersion'),
        'sendHello must include protocolVersion field'
      );
      assert(
        sendHelloBody.includes('PROTOCOL_VERSION'),
        'sendHello must use PROTOCOL_VERSION constant'
      );
    });
  });

  describe('Version Validation', function() {
    it('should validate protocol version in handleHello', function() {
      const managerPath = path.join(__dirname, '../../src/agents/agentManager.js');
      const managerCode = fs.readFileSync(managerPath, 'utf8');
      
      // Extract handleHello method body
      const start = managerCode.indexOf('handleHello(ws, msg) {');
      assert(start !== -1, 'handleHello method must exist');
      
      // Find end by counting braces
      let braceCount = 0;
      let inMethod = false;
      let end = start;
      for (let i = start; i < managerCode.length; i++) {
        if (managerCode[i] === '{') {
          braceCount++;
          inMethod = true;
        } else if (managerCode[i] === '}') {
          braceCount--;
          if (inMethod && braceCount === 0) {
            end = i;
            break;
          }
        }
      }
      
      const handleHelloBody = managerCode.substring(start, end + 1);
      assert(
        handleHelloBody.includes('protocolVersion'),
        'handleHello must check protocolVersion'
      );
      assert(
        handleHelloBody.includes('SUPPORTED_VERSIONS'),
        'handleHello must validate against SUPPORTED_VERSIONS'
      );
    });

    it('should reject connections without protocolVersion', function() {
      const managerPath = path.join(__dirname, '../../src/agents/agentManager.js');
      const managerCode = fs.readFileSync(managerPath, 'utf8');
      
      const start = managerCode.indexOf('handleHello(ws, msg) {');
      let braceCount = 0;
      let inMethod = false;
      let end = start;
      for (let i = start; i < managerCode.length; i++) {
        if (managerCode[i] === '{') {
          braceCount++;
          inMethod = true;
        } else if (managerCode[i] === '}') {
          braceCount--;
          if (inMethod && braceCount === 0) {
            end = i;
            break;
          }
        }
      }
      const handleHelloBody = managerCode.substring(start, end + 1);
      
      assert(
        handleHelloBody.includes('!agentVersion'),
        'handleHello must check for missing protocolVersion'
      );
      assert(
        handleHelloBody.includes('ws.close(1008'),
        'handleHello must close connection with code 1008 for version errors'
      );
    });

    it('should reject incompatible versions', function() {
      const managerPath = path.join(__dirname, '../../src/agents/agentManager.js');
      const managerCode = fs.readFileSync(managerPath, 'utf8');
      
      const start = managerCode.indexOf('handleHello(ws, msg) {');
      let braceCount = 0;
      let inMethod = false;
      let end = start;
      for (let i = start; i < managerCode.length; i++) {
        if (managerCode[i] === '{') {
          braceCount++;
          inMethod = true;
        } else if (managerCode[i] === '}') {
          braceCount--;
          if (inMethod && braceCount === 0) {
            end = i;
            break;
          }
        }
      }
      const handleHelloBody = managerCode.substring(start, end + 1);
      
      assert(
        handleHelloBody.includes('SUPPORTED_VERSIONS.has'),
        'handleHello must check if version is supported'
      );
      assert(
        handleHelloBody.includes('Incompatible protocol version'),
        'handleHello must send error message for incompatible versions'
      );
    });
  });

  describe('Version Storage', function() {
    it('should store agent protocolVersion in controller', function() {
      const managerPath = path.join(__dirname, '../../src/agents/agentManager.js');
      const managerCode = fs.readFileSync(managerPath, 'utf8');
      
      const start = managerCode.indexOf('handleHello(ws, msg) {');
      let braceCount = 0;
      let inMethod = false;
      let end = start;
      for (let i = start; i < managerCode.length; i++) {
        if (managerCode[i] === '{') {
          braceCount++;
          inMethod = true;
        } else if (managerCode[i] === '}') {
          braceCount--;
          if (inMethod && braceCount === 0) {
            end = i;
            break;
          }
        }
      }
      const handleHelloBody = managerCode.substring(start, end + 1);
      
      assert(
        handleHelloBody.includes('protocolVersion:'),
        'handleHello must store protocolVersion in agent object'
      );
    });
  });

  describe('Protocol Documentation', function() {
    it('should have AGENT_PROTOCOL.md documentation', function() {
      const docPath = path.join(__dirname, '../../docs/AGENT_PROTOCOL.md');
      assert(
        fs.existsSync(docPath),
        'docs/AGENT_PROTOCOL.md must exist'
      );
      
      const docContent = fs.readFileSync(docPath, 'utf8');
      assert(
        docContent.includes('protocolVersion'),
        'AGENT_PROTOCOL.md must document protocolVersion field'
      );
      assert(
        docContent.includes('1.0.0'),
        'AGENT_PROTOCOL.md must specify version 1.0.0'
      );
      assert(
        docContent.includes('SUPPORTED_VERSIONS'),
        'AGENT_PROTOCOL.md must document version compatibility'
      );
    });
  });
});
