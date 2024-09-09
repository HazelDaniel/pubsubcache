export default {
  transform: {
    "^.+\\.[t]s$": "ts-jest"  // Tells Jest to use Babel to transpile JavaScript
  },
  testEnvironment: "node",
  moduleFileExtensions: ['ts', 'tsx', 'jsx', 'js'],
};
