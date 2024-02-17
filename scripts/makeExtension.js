const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

// Import the example package.json content
const examplePackageJson = require('./config/package.json'); // Adjust the path as necessary

// Define the configuration files to be copied
const configFiles = [
  '.babelrc',
  '.eslintrc.js',
  'postcss.config.js',
  'prettier.config.js',
  'tsconfig.json',
  'webpack.config.js'
];

// Define folders to be copied
const foldersToCopy = ['public', 'src'];

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to recursively copy directories
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

// Function to run yarn install
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

// Ask the user for the extension name
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

    // Run yarn install
    await installDependencies(dirPath);

    console.log('Dependencies installed successfully.');
  } catch (error) {
    console.error(`Error during extension creation: ${error}`);
  } finally {
    rl.close();
  }
});
