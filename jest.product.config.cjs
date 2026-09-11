const base = require('./jest.config.js');
module.exports = { ...base, testEnvironment: 'node', setupFilesAfterEnv: [], testMatch: ['<rootDir>/src/__tests__/integration/product-workflows.test.ts'], testPathIgnorePatterns: ['/node_modules/'], testTimeout: 30000 };
