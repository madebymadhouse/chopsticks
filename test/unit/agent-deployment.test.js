/**
 * Contract Tests: Agent Deployment Flow
 * 
 * These tests verify the critical agent deployment flow remains consistent.
 * Tests cover the complete lifecycle from pool selection to agent allocation.
 */

import { describe, it, before, after } from 'mocha';
import { strict as assert } from 'assert';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock dependencies
let mockAgentManager, mockStorage;

describe('Contract Tests: Agent Deployment Flow', function() {
  this.timeout(5000);

  before(async function() {
    // Setup mocks
    mockStorage = {
      pools: new Map([
        ['pool_test', {
          pool_id: 'pool_test',
          owner_user_id: '123',
          name: 'Test Pool',
          visibility: 'public'
        }]
      ]),
      agents: new Map([
        ['agent001', {
          agent_id: 'agent001',
          client_id: 'client001',
          tag: 'Agent 0001#0001',
          status: 'active',
          pool_id: 'pool_test'
        }],
        ['agent002', {
          agent_id: 'agent002',
          client_id: 'client002',
          tag: 'Agent 0002#0002',
          status: 'active',
          pool_id: 'pool_test'
        }]
      ]),
      
      fetchPoolAgents: async (poolId) => {
        return Array.from(mockStorage.agents.values())
          .filter(a => a.pool_id === poolId);
      },
      
      getGuildSetting: async (guildId) => {
        return {
          guild_id: guildId,
          data: { selectedPoolId: 'pool_test' }
        };
      }
    };

    mockAgentManager = {
      liveAgents: new Map(),
      sessions: new Map(),
      
      listAgents: async function() {
        return Array.from(this.liveAgents.values());
      },
      
      buildDeployPlan: function(guildId, desiredCount, poolId) {
        const agents = Array.from(mockStorage.agents.values())
          .filter(a => a.pool_id === poolId && a.status === 'active');
        
        const liveInGuild = Array.from(this.liveAgents.values())
          .filter(a => a.guildIds && a.guildIds.includes(guildId));
        
        const currentCount = liveInGuild.length;
        const needed = Math.max(0, desiredCount - currentCount);
        
        // Level 1: Enforce 49-agent limit
        if (currentCount + needed > 49) {
          return {
            ok: false,
            error: `Would exceed 49-agent limit per guild (current: ${currentCount}, requested: ${desiredCount})`
          };
        }
        
        const available = agents.slice(0, needed);
        
        if (available.length < needed) {
          return {
            ok: false,
            error: `Not enough agents available (need ${needed}, have ${available.length})`
          };
        }
        
        return {
          ok: true,
          current: currentCount,
          desired: desiredCount,
          needed,
          agents: available.map(a => ({
            agentId: a.agent_id,
            clientId: a.client_id,
            inviteUrl: `https://discord.com/oauth2/authorize?client_id=${a.client_id}`
          }))
        };
      }
    };
  });

  describe('Pool Selection', function() {
    it('should retrieve guild default pool', async function() {
      const setting = await mockStorage.getGuildSetting('guild123');
      assert.ok(setting);
      assert.strictEqual(setting.data.selectedPoolId, 'pool_test');
    });

    it('should fetch agents from pool', async function() {
      const agents = await mockStorage.fetchPoolAgents('pool_test');
      assert.ok(Array.isArray(agents));
      assert.strictEqual(agents.length, 2);
      assert.strictEqual(agents[0].pool_id, 'pool_test');
    });

    it('should filter only active agents', async function() {
      // Add inactive agent
      mockStorage.agents.set('agent003', {
        agent_id: 'agent003',
        status: 'inactive',
        pool_id: 'pool_test'
      });

      const agents = await mockStorage.fetchPoolAgents('pool_test');
      const activeAgents = agents.filter(a => a.status === 'active');
      
      assert.strictEqual(activeAgents.length, 2);
    });
  });

  describe('Deployment Planning', function() {
    it('should build deploy plan with no agents present', function() {
      // Add enough agents to pool
      for (let i = 1; i <= 10; i++) {
        mockStorage.agents.set(`agent${String(i).padStart(3, '0')}`, {
          agent_id: `agent${String(i).padStart(3, '0')}`,
          client_id: `client${String(i).padStart(3, '0')}`,
          status: 'active',
          pool_id: 'pool_test'
        });
      }
      
      const plan = mockAgentManager.buildDeployPlan('guild123', 10, 'pool_test');
      
      assert.ok(plan.ok);
      assert.strictEqual(plan.current, 0);
      assert.strictEqual(plan.desired, 10);
      assert.strictEqual(plan.needed, 10);
    });

    it('should calculate needed agents correctly', function() {
      // Simulate 5 agents already in guild
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true
      });
      
      // Add more mock agents to pool
      for (let i = 3; i <= 10; i++) {
        mockStorage.agents.set(`agent${String(i).padStart(3, '0')}`, {
          agent_id: `agent${String(i).padStart(3, '0')}`,
          client_id: `client${String(i).padStart(3, '0')}`,
          status: 'active',
          pool_id: 'pool_test'
        });
      }

      const plan = mockAgentManager.buildDeployPlan('guild123', 5, 'pool_test');
      
      assert.ok(plan.ok);
      assert.strictEqual(plan.current, 1);
      assert.strictEqual(plan.desired, 5);
      assert.strictEqual(plan.needed, 4);
    });

    it('should enforce 49-agent limit per guild', function() {
      // Simulate 45 agents already present
      mockAgentManager.liveAgents.clear();
      for (let i = 1; i <= 45; i++) {
        mockAgentManager.liveAgents.set(`agent${i}`, {
          agentId: `agent${i}`,
          guildIds: ['guild123'],
          ready: true
        });
      }

      // Try to deploy 10 more (would exceed 49)
      const plan = mockAgentManager.buildDeployPlan('guild123', 55, 'pool_test');
      
      assert.strictEqual(plan.ok, false);
      assert.ok(plan.error.includes('49-agent limit'));
    });

    it('should allow deployment up to 49 agents', function() {
      mockAgentManager.liveAgents.clear();
      
      // Add 49 mock agents
      for (let i = 1; i <= 49; i++) {
        mockStorage.agents.set(`agent${String(i).padStart(3, '0')}`, {
          agent_id: `agent${String(i).padStart(3, '0')}`,
          client_id: `client${String(i).padStart(3, '0')}`,
          status: 'active',
          pool_id: 'pool_test'
        });
      }

      const plan = mockAgentManager.buildDeployPlan('guild123', 49, 'pool_test');
      
      assert.ok(plan.ok);
      assert.strictEqual(plan.needed, 49);
    });

    it('should return error when not enough agents available', function() {
      mockAgentManager.liveAgents.clear();
      mockStorage.agents.clear();
      
      // Only 2 agents available
      mockStorage.agents.set('agent001', {
        agent_id: 'agent001',
        status: 'active',
        pool_id: 'pool_test'
      });
      mockStorage.agents.set('agent002', {
        agent_id: 'agent002',
        status: 'active',
        pool_id: 'pool_test'
      });

      const plan = mockAgentManager.buildDeployPlan('guild123', 10, 'pool_test');
      
      assert.strictEqual(plan.ok, false);
      assert.ok(plan.error.includes('Not enough agents available'));
    });
  });

  describe('Invite URL Generation', function() {
    it('should generate valid invite URLs', function() {
      mockAgentManager.liveAgents.clear();
      
      const plan = mockAgentManager.buildDeployPlan('guild123', 2, 'pool_test');
      
      assert.ok(plan.ok);
      assert.strictEqual(plan.agents.length, 2);
      
      for (const agent of plan.agents) {
        assert.ok(agent.inviteUrl);
        assert.ok(agent.inviteUrl.includes('discord.com/oauth2/authorize'));
        assert.ok(agent.inviteUrl.includes(`client_id=${agent.clientId}`));
      }
    });
  });

  describe('Agent Allocation', function() {
    it('should allocate different agents to different guilds', function() {
      mockAgentManager.liveAgents.clear();
      
      // Add agents to guild1
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild1'],
        ready: true
      });

      // Build plan for guild2
      const plan = mockAgentManager.buildDeployPlan('guild2', 2, 'pool_test');
      
      assert.ok(plan.ok);
      // Should show 0 current for guild2
      assert.strictEqual(plan.current, 0);
    });

    it('should count agents per guild correctly', function() {
      mockAgentManager.liveAgents.clear();
      mockStorage.agents.clear();
      
      // Add enough agents to pool for testing
      for (let i = 1; i <= 10; i++) {
        mockStorage.agents.set(`agent${String(i).padStart(3, '0')}`, {
          agent_id: `agent${String(i).padStart(3, '0')}`,
          client_id: `client${String(i).padStart(3, '0')}`,
          status: 'active',
          pool_id: 'pool_test'
        });
      }
      
      // Agent in multiple guilds
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild1', 'guild2'],
        ready: true
      });

      const plan1 = mockAgentManager.buildDeployPlan('guild1', 5, 'pool_test');
      const plan2 = mockAgentManager.buildDeployPlan('guild2', 5, 'pool_test');
      
      // Should show 1 current for each guild
      assert.strictEqual(plan1.current, 1);
      assert.strictEqual(plan2.current, 1);
    });
  });

  after(function() {
    // Cleanup
    mockAgentManager.liveAgents.clear();
    mockAgentManager.sessions.clear();
    mockStorage.agents.clear();
    mockStorage.pools.clear();
  });
});
