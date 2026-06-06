import { describe, expect, it } from 'vitest';
import { extractOscCwd } from '../lib/terminal';

describe('extractOscCwd', () => {
  it('extracts and decodes an OSC 7 working directory', () => {
    expect(extractOscCwd('\u001b]7;file://localhost/Users/test/My%20Project\u0007')).toBe(
      '/Users/test/My Project',
    );
  });

  it('ignores unrelated terminal output', () => {
    expect(extractOscCwd('build complete')).toBeNull();
  });
});
