const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

const examplePackageJson = require('./config/package.json');

const configFiles = [
  '.babelrc',
  '.eslintrc.js',
  'postcss.config.js',
  'prettier.config.js',
  'tsconfig.json',
  'webpack.config.js'
];

const foldersToCopy = ['public', 'src'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  let entries = await fs.readdir(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    entry.isDirectory()
      ? await copyDirectory(srcPath, destPath)
      : await fs.copyFile(srcPath, destPath);
  }
}

function installDependencies(dirPath) {
  return new Promise((resolve, reject) => {
    exec('yarn install', { cwd: dirPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject(error);
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
      resolve();
    });
  });
}

rl.question('Enter the name of the extension: ', async (extensionName) => {
  try {
    const dirPath = path.join(__dirname, '..', 'extensions', extensionName);

    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(path.join(dirPath, 'package.json'), JSON.stringify({ ...examplePackageJson, name: extensionName }, null, 2));

    for (let file of configFiles) {
      await fs.copyFile(path.join(__dirname, 'config', file), path.join(dirPath, file));
    }

    for (let folder of foldersToCopy) {
      await copyDirectory(path.join(__dirname, 'config', folder), path.join(dirPath, folder));
    }

    console.log(`Extension '${extensionName}' has been created successfully. Installing dependencies...`);

    await installDependencies(dirPath);

    console.log('Dependencies installed successfully.');
  } catch (error) {
    console.error(`Error during extension creation: ${error}`);
  } finally {
    rl.close();
  }
});
