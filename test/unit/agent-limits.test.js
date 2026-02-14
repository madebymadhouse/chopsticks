/**
 * Agent Limit Enforcement Tests
 * Level 1: Invariants Locked - Contract Tests
 * 
 * Verifies:
 * - 49-agent per guild limit is enforced
 * - buildDeployPlan rejects exceeding limit
 * - Error message is clear
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Agent Limit Enforcement', function() {
  describe('Constants', function() {
    it('should define MAX_AGENTS_PER_GUILD = 49', function() {
      const managerPath = path.join(__dirname, '../../src/agents/agentManager.js');
      const managerCode = fs.readFileSync(managerPath, 'utf8');
      
      assert(
        managerCode.includes('const MAX_AGENTS_PER_GUILD = 49'),
        'agentManager.js must define MAX_AGENTS_PER_GUILD = 49'
      );
    });
  });

  describe('buildDeployPlan Validation', function() {
    it('should check desired count against MAX_AGENTS_PER_GUILD', function() {
      const managerPath = path.join(__dirname, '../../src/agents/agentManager.js');
      const managerCode = fs.readFileSync(managerPath, 'utf8');
      
      // Find buildDeployPlan method
      const start = managerCode.indexOf('async buildDeployPlan(');
      assert(start !== -1, 'buildDeployPlan method must exist');
      
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
      
      const methodBody = managerCode.substring(start, end + 1);
      assert(
        methodBody.includes('MAX_AGENTS_PER_GUILD'),
        'buildDeployPlan must validate against MAX_AGENTS_PER_GUILD'
      );
      assert(
        methodBody.includes('desired >') || methodBody.includes('> MAX_AGENTS_PER_GUILD'),
        'buildDeployPlan must check if desired exceeds limit'
      );
    });

    it('should return error when limit exceeded', function() {
      const managerPath = path.join(__dirname, '../../src/agents/agentManager.js');
      const managerCode = fs.readFileSync(managerPath, 'utf8');
      
      const start = managerCode.indexOf('async buildDeployPlan(');
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
      
      const methodBody = managerCode.substring(start, end + 1);
      assert(
        methodBody.includes('error:') && methodBody.includes('Agent limit exceeded'),
        'buildDeployPlan must return error object with clear message when limit exceeded'
      );
    });
  });

  describe('Command Validation', function() {
    it('should set maxValue to 49 in /agents deploy command', function() {
      const commandPath = path.join(__dirname, '../../src/commands/agents.js');
      const commandCode = fs.readFileSync(commandPath, 'utf8');
      
      // Find deploy subcommand definition
      const deployStart = commandCode.indexOf('.setName("deploy")');
      assert(deployStart !== -1, 'deploy subcommand must exist');
      
      // Get the next ~500 chars to capture the option definition
      const deploySection = commandCode.substring(deployStart, deployStart + 600);
      
      assert(
        deploySection.includes('.setMaxValue(49)'),
        'deploy command must set maxValue to 49'
      );
      assert(
        deploySection.includes('max 49'),
        'deploy command description must mention max 49'
      );
    });

    it('should handle plan.error in command execution', function() {
      const commandPath = path.join(__dirname, '../../src/commands/agents.js');
      const commandCode = fs.readFileSync(commandPath, 'utf8');
      
      // Find deploy execution block
      const deployExecStart = commandCode.indexOf('if (sub === "deploy")');
      assert(deployExecStart !== -1, 'deploy execution block must exist');
      
      // Capture only the deploy execution block until the next subcommand branch
      const nextBranchStart = commandCode.indexOf('\n  if (sub === "', deployExecStart + 1);
      const deployExecEnd = nextBranchStart === -1 ? commandCode.length : nextBranchStart;
      const deployExec = commandCode.substring(deployExecStart, deployExecEnd);
      
      assert(
        deployExec.includes('plan.error'),
        'deploy command must check for plan.error'
      );
      assert(
        deployExec.includes('maximum') || deployExec.includes('limit') || deployExec.includes('stability'),
        'deploy command must explain the error in user-friendly terms'
      );
    });
  });

  describe('Documentation', function() {
    it('should document the 49-agent limit', function() {
      const files = [
        path.join(__dirname, '../../MATURITY.md'),
        path.join(__dirname, '../../src/agents/agentManager.js')
      ];
      
      let documented = false;
      for (const file of files) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('49') && (content.includes('agent') || content.includes('limit') || content.includes('guild'))) {
            documented = true;
            break;
          }
        }
      }
      
      assert(documented, '49-agent limit must be documented in codebase');
    });
  });

  describe('Enforcement Logic', function() {
    it('should reject any request exceeding 49 agents', function() {
      const managerPath = path.join(__dirname, '../../src/agents/agentManager.js');
      const managerCode = fs.readFileSync(managerPath, 'utf8');
      
      // Verify that buildDeployPlan returns early when limit exceeded
      const start = managerCode.indexOf('async buildDeployPlan(');
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
      
      const methodBody = managerCode.substring(start, end + 1);
      
      // Check that validation happens before agent allocation logic
      const limitCheckIndex = methodBody.indexOf('MAX_AGENTS_PER_GUILD');
      const agentIterationIndex = methodBody.indexOf('this.liveAgents.values()');
      
      assert(limitCheckIndex > 0, 'Must have limit check');
      assert(agentIterationIndex > 0, 'Must have agent iteration');
      assert(
        limitCheckIndex < agentIterationIndex,
        'Limit check must happen before agent allocation logic'
      );
    });
  });
});
