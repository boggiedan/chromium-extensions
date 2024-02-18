const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const baseConfig = require('./webpack.config.js');

const MODE = "development";

module.exports = (env) => {
  const devConfig = {
    mode: 'development',
    devServer: {
      open: true,
      hot: true,
    },
    entry: env.POPUP ? './src/popup/index.tsx' : './src/app/index.tsx',
    plugins: [
      new webpack.DefinePlugin({
        'process.env.ENV': `'${MODE}'`,
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'public/images/logo.png', to: env.POPUP ? 'popup' : 'app' },
        ],
      }),
    ],
  };

  return {
    ...baseConfig,
    ...devConfig,
  };
};
