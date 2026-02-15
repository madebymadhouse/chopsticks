import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import { data as helpCommand } from '../../src/commands/help.js';

describe('Help command definition', function () {
  it('is a single /help command with no options', function () {
    const json = helpCommand.toJSON();
    const options = json.options || [];
    assert.equal(json.name, 'help');
    assert.equal(options.length, 0);
  });
});
