export default {
  transform: {
    "^.+\\.[j]s$": "babel-jest", // Tells Jest to use Babel to transpile JavaScript
  },
  testEnvironment: "node",
  moduleFileExtensions: ["jsx", "js"],
  modulePathIgnorePatterns: ["dist/.*/.*.d.ts"],
  testPathIgnorePatterns: ["dist/.*/.*.d.ts"],
};
