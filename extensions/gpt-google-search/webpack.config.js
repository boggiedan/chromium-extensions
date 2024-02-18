const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

const MODE = "production";

module.exports = {
  mode: MODE,
  entry: {
    popup: './src/popup/index.tsx',
    app: './src/app/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]/index.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        include: path.resolve(__dirname, 'src'),
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.css'],
  },
  plugins: [
    new webpack.ProvidePlugin(
      {
        process: 'process/browser',
      }
    ),
    new webpack.DefinePlugin({
      'process.env.ENV': `'${MODE}'`,
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: './popup/index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/manifest.json', to: '' },
        { from: 'public/images', to: 'popup' },
        { from: 'public/images/logo.png', to: 'app' },
      ],
    }),
  ],
};
