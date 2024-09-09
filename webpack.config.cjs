const path = require("path");

module.exports = {
  mode: "development", // or 'production'
  entry: "./dist/core.js", // Entry point for Webpack
  output: {
    filename: "src/core.js",
    path: path.resolve(__dirname, "dist"),
    library: {
      type: "module", // Output as ES module
    },
    module: true,
  },
  experiments: {
    outputModule: true, // Enable ES module output
  },
  resolve: {
    extensions: [".js"], // Resolve JS files
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Handle JS files
        use: "babel-loader", // Optional, only if you need further processing
        exclude: /node_modules/,
      },
    ],
  },
  externals: [], // No externals, bundle everything
};
