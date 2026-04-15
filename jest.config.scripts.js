module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.scripts.json' }] },
  testMatch: ['**/scripts/**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
};
