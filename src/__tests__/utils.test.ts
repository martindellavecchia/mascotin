import { safeJsonParse, safeParseImages, safeParseActivities } from '../lib/utils';

describe('utils', () => {
  describe('safeJsonParse', () => {
    it('parses valid JSON correctly', () => {
      const result = safeJsonParse('{"key": "value"}', {});
      expect(result).toEqual({ key: 'value' });
    });

    it('returns default value for invalid JSON', () => {
      const result = safeJsonParse('invalid json', { default: true });
      expect(result).toEqual({ default: true });
    });

    it('returns default value for null input', () => {
      const result = safeJsonParse(null, 'default');
      expect(result).toEqual('default');
    });

    it('returns default value for undefined input', () => {
      const result = safeJsonParse(undefined, []);
      expect(result).toEqual([]);
    });
  });

  describe('safeParseImages', () => {
    it('parses valid image array JSON', () => {
      const result = safeParseImages('["img1.jpg", "img2.png"]');
      expect(result).toEqual(['img1.jpg', 'img2.png']);
    });

    it('returns empty array for invalid JSON', () => {
      const result = safeParseImages('invalid');
      expect(result).toEqual([]);
    });

    it('filters out non-string values', () => {
      const result = safeParseImages('["valid.jpg", 123, null]');
      expect(result).toEqual(['valid.jpg']);
    });

    it('returns empty array for null', () => {
      const result = safeParseImages(null);
      expect(result).toEqual([]);
    });
  });

  describe('safeParseActivities', () => {
    it('parses valid activities array JSON', () => {
      const result = safeParseActivities('["walking", "playing"]');
      expect(result).toEqual(['walking', 'playing']);
    });

    it('returns empty array for invalid JSON', () => {
      const result = safeParseActivities('invalid');
      expect(result).toEqual([]);
    });

    it('returns empty array for null', () => {
      const result = safeParseActivities(null);
      expect(result).toEqual([]);
    });
  });
});