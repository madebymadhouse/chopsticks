import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import { data as commandsData, handleButton, handleSelect } from '../../src/commands/commands.js';

describe('Commands UI definition', function () {
  it('includes the ui subcommand', function () {
    const json = commandsData.toJSON();
    const names = new Set((json.options || []).map(o => o.name));
    assert.ok(names.has('ui'));
  });

  it('exports component handlers', function () {
    assert.equal(typeof handleButton, 'function');
    assert.equal(typeof handleSelect, 'function');
  });
});
