import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import { data as agentsCommand, handleSelect, handleButton } from '../../src/commands/agents.js';

describe('Agents command definition', function () {
  it('includes idle policy subcommand', function () {
    const json = agentsCommand.toJSON();
    const names = new Set((json.options || []).map(o => o.name));
    assert.ok(names.has('idle_policy'));
    assert.ok(names.has('panel'));        // unified deployment panel (replaced deploy_ui + advisor_ui)
    assert.ok(names.has('advisor'));
    assert.ok(!names.has('deploy_ui'),  'deploy_ui removed — superseded by panel');
    assert.ok(!names.has('advisor_ui'), 'advisor_ui removed — superseded by panel');
  });

  it('idle policy exposes expected options', function () {
    const json = agentsCommand.toJSON();
    const idle = (json.options || []).find(o => o.name === 'idle_policy');
    assert.ok(idle);
    const optionNames = new Set((idle.options || []).map(o => o.name));
    assert.ok(optionNames.has('minutes'));
    assert.ok(optionNames.has('use_default'));
    assert.ok(optionNames.has('disable'));
  });

  it('exports deploy ui component handlers', function () {
    assert.equal(typeof handleSelect, 'function');
    assert.equal(typeof handleButton, 'function');
  });

  it('advisor exposes expected options', function () {
    const json = agentsCommand.toJSON();
    const advisor = (json.options || []).find(o => o.name === 'advisor');
    assert.ok(advisor);
    const optionNames = new Set((advisor.options || []).map(o => o.name));
    assert.ok(optionNames.has('desired_total'));
    assert.ok(optionNames.has('set_best_default'));
  });
});
