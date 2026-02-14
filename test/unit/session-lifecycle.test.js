/**
 * Contract Tests: Music Session Lifecycle
 * 
 * These tests verify the music session allocation, usage, and cleanup flow.
 * Critical for Level 1: ensures session state doesn't leak or become inconsistent.
 */

import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { strict as assert } from 'assert';

let mockAgentManager;

describe('Contract Tests: Music Session Lifecycle', function() {
  this.timeout(5000);

  beforeEach(function() {
    // Create fresh agent manager mock for each test
    mockAgentManager = {
      liveAgents: new Map(),
      sessions: new Map(),        // sessionKey -> agentId
      assistantSessions: new Map(), // assistantKey -> agentId
      
      // Helper to create session key
      sessionKey: (guildId, voiceChannelId) => `${guildId}:${voiceChannelId}`,
      
      // Ensure a session agent is allocated
      ensureSessionAgent: function(guildId, voiceChannelId, options = {}) {
        const key = this.sessionKey(guildId, voiceChannelId);
        
        // Check if session already exists
        const existingAgentId = this.sessions.get(key);
        if (existingAgentId) {
          const agent = this.liveAgents.get(existingAgentId);
          if (agent && agent.ready) {
            return { ok: true, agentId: existingAgentId, agent };
          }
        }
        
        // Find available agents in guild
        const availableAgents = Array.from(this.liveAgents.values())
          .filter(a => {
            // Must be in the guild
            if (!a.guildIds || !a.guildIds.includes(guildId)) return false;
            // Must be ready
            if (!a.ready) return false;
            // Must not be busy (no busyKey)
            if (a.busyKey) return false;
            return true;
          });
        
        if (availableAgents.length === 0) {
          const totalInGuild = Array.from(this.liveAgents.values())
            .filter(a => a.guildIds && a.guildIds.includes(guildId)).length;
          
          if (totalInGuild === 0) {
            return { ok: false, reason: 'no-agents-in-guild' };
          }
          return { ok: false, reason: 'no-free-agents' };
        }
        
        // Allocate first available agent
        const agent = availableAgents[0];
        agent.busyKey = key;
        agent.busyKind = 'music';
        this.sessions.set(key, agent.agentId);
        
        return { ok: true, agentId: agent.agentId, agent };
      },
      
      // Get existing session agent
      getSessionAgent: function(guildId, voiceChannelId) {
        const key = this.sessionKey(guildId, voiceChannelId);
        const agentId = this.sessions.get(key);
        
        if (!agentId) {
          return { ok: false, reason: 'no-session' };
        }
        
        const agent = this.liveAgents.get(agentId);
        if (!agent || !agent.ready) {
          return { ok: false, reason: 'agent-offline' };
        }
        
        return { ok: true, agentId, agent };
      },
      
      // Release session
      releaseSession: function(guildId, voiceChannelId) {
        const key = this.sessionKey(guildId, voiceChannelId);
        const agentId = this.sessions.get(key);
        
        if (agentId) {
          const agent = this.liveAgents.get(agentId);
          if (agent) {
            agent.busyKey = null;
            agent.busyKind = null;
          }
          this.sessions.delete(key);
        }
      },
      
      // Cleanup agent on disconnect
      _cleanupAgentOnDisconnect: function(agentId) {
        const agent = this.liveAgents.get(agentId);
        if (!agent) return;
        
        // Release all sessions held by this agent
        for (const [key, aId] of this.sessions.entries()) {
          if (aId === agentId) {
            this.sessions.delete(key);
          }
        }
        
        for (const [key, aId] of this.assistantSessions.entries()) {
          if (aId === agentId) {
            this.assistantSessions.delete(key);
          }
        }
        
        this.liveAgents.delete(agentId);
      }
    };
  });

  afterEach(function() {
    mockAgentManager.liveAgents.clear();
    mockAgentManager.sessions.clear();
    mockAgentManager.assistantSessions.clear();
  });

  describe('Session Allocation', function() {
    it('should allocate agent to new session', function() {
      // Setup: 1 agent available in guild
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true,
        busyKey: null
      });

      const result = mockAgentManager.ensureSessionAgent('guild123', 'voice456');
      
      assert.ok(result.ok);
      assert.strictEqual(result.agentId, 'agent001');
      assert.ok(result.agent);
    });

    it('should mark agent as busy after allocation', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true,
        busyKey: null
      });

      mockAgentManager.ensureSessionAgent('guild123', 'voice456');
      
      const agent = mockAgentManager.liveAgents.get('agent001');
      assert.strictEqual(agent.busyKey, 'guild123:voice456');
      assert.strictEqual(agent.busyKind, 'music');
    });

    it('should return existing session if already allocated', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true,
        busyKey: 'guild123:voice456',
        busyKind: 'music'
      });
      mockAgentManager.sessions.set('guild123:voice456', 'agent001');

      const result = mockAgentManager.ensureSessionAgent('guild123', 'voice456');
      
      assert.ok(result.ok);
      assert.strictEqual(result.agentId, 'agent001');
    });

    it('should return error when no agents in guild', function() {
      const result = mockAgentManager.ensureSessionAgent('guild123', 'voice456');
      
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, 'no-agents-in-guild');
    });

    it('should return error when all agents busy', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true,
        busyKey: 'guild123:other-voice',
        busyKind: 'music'
      });

      const result = mockAgentManager.ensureSessionAgent('guild123', 'voice456');
      
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, 'no-free-agents');
    });

    it('should not allocate agents not in the guild', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['other-guild'],
        ready: true,
        busyKey: null
      });

      const result = mockAgentManager.ensureSessionAgent('guild123', 'voice456');
      
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, 'no-agents-in-guild');
    });

    it('should not allocate agents that are not ready', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: false,  // Not ready yet
        busyKey: null
      });

      const result = mockAgentManager.ensureSessionAgent('guild123', 'voice456');
      
      assert.strictEqual(result.ok, false);
    });
  });

  describe('Session Retrieval', function() {
    it('should retrieve existing session', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true
      });
      mockAgentManager.sessions.set('guild123:voice456', 'agent001');

      const result = mockAgentManager.getSessionAgent('guild123', 'voice456');
      
      assert.ok(result.ok);
      assert.strictEqual(result.agentId, 'agent001');
    });

    it('should return error when no session exists', function() {
      const result = mockAgentManager.getSessionAgent('guild123', 'voice456');
      
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, 'no-session');
    });

    it('should return error when agent offline', function() {
      mockAgentManager.sessions.set('guild123:voice456', 'agent001');
      // Agent not in liveAgents (offline)

      const result = mockAgentManager.getSessionAgent('guild123', 'voice456');
      
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, 'agent-offline');
    });
  });

  describe('Session Release', function() {
    it('should release session and free agent', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true,
        busyKey: 'guild123:voice456',
        busyKind: 'music'
      });
      mockAgentManager.sessions.set('guild123:voice456', 'agent001');

      mockAgentManager.releaseSession('guild123', 'voice456');
      
      // Session should be removed
      assert.strictEqual(mockAgentManager.sessions.has('guild123:voice456'), false);
      
      // Agent should be freed
      const agent = mockAgentManager.liveAgents.get('agent001');
      assert.strictEqual(agent.busyKey, null);
      assert.strictEqual(agent.busyKind, null);
    });

    it('should handle release of non-existent session', function() {
      // Should not throw
      assert.doesNotThrow(() => {
        mockAgentManager.releaseSession('guild123', 'voice456');
      });
    });

    it('should allow agent reuse after release', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true,
        busyKey: 'guild123:voice456',
        busyKind: 'music'
      });
      mockAgentManager.sessions.set('guild123:voice456', 'agent001');

      // Release first session
      mockAgentManager.releaseSession('guild123', 'voice456');
      
      // Allocate new session
      const result = mockAgentManager.ensureSessionAgent('guild123', 'voice789');
      
      assert.ok(result.ok);
      assert.strictEqual(result.agentId, 'agent001');
      assert.strictEqual(mockAgentManager.sessions.get('guild123:voice789'), 'agent001');
    });
  });

  describe('Agent Disconnect Cleanup', function() {
    it('should remove all sessions when agent disconnects', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true
      });
      
      // Agent holds 2 sessions
      mockAgentManager.sessions.set('guild123:voice1', 'agent001');
      mockAgentManager.sessions.set('guild123:voice2', 'agent001');

      mockAgentManager._cleanupAgentOnDisconnect('agent001');
      
      // All sessions should be removed
      assert.strictEqual(mockAgentManager.sessions.size, 0);
      assert.strictEqual(mockAgentManager.liveAgents.size, 0);
    });

    it('should only remove sessions for disconnected agent', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true
      });
      mockAgentManager.liveAgents.set('agent002', {
        agentId: 'agent002',
        guildIds: ['guild123'],
        ready: true
      });
      
      mockAgentManager.sessions.set('guild123:voice1', 'agent001');
      mockAgentManager.sessions.set('guild123:voice2', 'agent002');

      mockAgentManager._cleanupAgentOnDisconnect('agent001');
      
      // Only agent001 session should be removed
      assert.strictEqual(mockAgentManager.sessions.size, 1);
      assert.strictEqual(mockAgentManager.sessions.get('guild123:voice2'), 'agent002');
    });

    it('should cleanup assistant sessions as well', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true
      });
      
      mockAgentManager.sessions.set('guild123:voice1', 'agent001');
      mockAgentManager.assistantSessions.set('guild123:assist1', 'agent001');

      mockAgentManager._cleanupAgentOnDisconnect('agent001');
      
      assert.strictEqual(mockAgentManager.sessions.size, 0);
      assert.strictEqual(mockAgentManager.assistantSessions.size, 0);
    });
  });

  describe('Session Isolation', function() {
    it('should isolate sessions by guild', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild1', 'guild2'],
        ready: true,
        busyKey: null
      });

      const result1 = mockAgentManager.ensureSessionAgent('guild1', 'voice1');
      
      // Should not find session in different guild
      const result2 = mockAgentManager.getSessionAgent('guild2', 'voice1');
      
      assert.ok(result1.ok);
      assert.strictEqual(result2.ok, false);
      assert.strictEqual(result2.reason, 'no-session');
    });

    it('should isolate sessions by voice channel', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true,
        busyKey: null
      });

      mockAgentManager.ensureSessionAgent('guild123', 'voice1');
      
      // Should not find session in different voice channel
      const result = mockAgentManager.getSessionAgent('guild123', 'voice2');
      
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, 'no-session');
    });
  });

  describe('Concurrent Sessions', function() {
    it('should support multiple concurrent sessions in same guild', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true,
        busyKey: null
      });
      mockAgentManager.liveAgents.set('agent002', {
        agentId: 'agent002',
        guildIds: ['guild123'],
        ready: true,
        busyKey: null
      });

      const result1 = mockAgentManager.ensureSessionAgent('guild123', 'voice1');
      const result2 = mockAgentManager.ensureSessionAgent('guild123', 'voice2');
      
      assert.ok(result1.ok);
      assert.ok(result2.ok);
      assert.notStrictEqual(result1.agentId, result2.agentId);
      assert.strictEqual(mockAgentManager.sessions.size, 2);
    });

    it('should fail when not enough agents for concurrent sessions', function() {
      mockAgentManager.liveAgents.set('agent001', {
        agentId: 'agent001',
        guildIds: ['guild123'],
        ready: true,
        busyKey: null
      });

      const result1 = mockAgentManager.ensureSessionAgent('guild123', 'voice1');
      const result2 = mockAgentManager.ensureSessionAgent('guild123', 'voice2');
      
      assert.ok(result1.ok);
      assert.strictEqual(result2.ok, false);
      assert.strictEqual(result2.reason, 'no-free-agents');
    });
  });
});
