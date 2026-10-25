const base = require('./jest.config.js');
module.exports = { ...base, testEnvironment: 'node', setupFilesAfterEnv: [], testMatch: ['**/src/__tests__/integration/*.test.ts'], testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'], testTimeout: 30000 };
