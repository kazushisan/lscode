import { describe, it } from 'node:test';
import assert from 'node:assert';
import { add } from './add.js';

describe('add function', () => {
  it('should add two positive numbers', () => {
    assert.strictEqual(add(2, 3), 5);
  });

  it('should add two negative numbers', () => {
    assert.strictEqual(add(-2, -3), -5);
  });

  it('should add a positive and a negative number', () => {
    assert.strictEqual(add(5, -3), 2);
  });

  it('should add zero to a number', () => {
    assert.strictEqual(add(5, 0), 5);
    assert.strictEqual(add(0, 5), 5);
  });

  it('should add two zeros', () => {
    assert.strictEqual(add(0, 0), 0);
  });

  it('should add decimal numbers', () => {
    assert.strictEqual(add(1.5, 2.5), 4);
    assert.strictEqual(add(0.1, 0.2), 0.30000000000000004); // JavaScript floating point
  });

  it('should handle large numbers', () => {
    assert.strictEqual(add(1000000, 2000000), 3000000);
  });

  it('should handle negative result', () => {
    assert.strictEqual(add(-10, 5), -5);
  });
});
