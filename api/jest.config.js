module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.', // Changed from 'src' to '.'
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage', // Adjusted coverage directory path
  testEnvironment: 'node',
  moduleNameMapper: { // Optional: if you use path aliases like @/src/*
    '^@/(.*)$': '<rootDir>/src/$1', // Adjusted path for alias
  },
};
