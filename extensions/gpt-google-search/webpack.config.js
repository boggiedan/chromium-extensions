const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

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
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@app': path.resolve(__dirname, 'src/app'),
      '@popup': path.resolve(__dirname, 'src/popup'),
    },
    extensions: ['.tsx', '.ts', '.js', '.css'],
    fallback: {
      'process/browser': require.resolve('process/browser')
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.ENV': `'${MODE}'`,
      'process.env.API_URL': `'${process.env.API_URL}'`,
      'process.env.API_KEY': `'${process.env.API_KEY}'`,
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: './popup/index.html',
      chunks: ['popup'],
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
