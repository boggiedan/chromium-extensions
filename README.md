# New Extension Creator

## Overview

The `yarn generate:extension` command streamlines the creation of new browser extensions within the `extensions` folder. Designed for small chromium extensions creation, this tool automatically sets up a TypeScript application configured with Webpack and Babel, incorporating TailwindCSS for styling and React. Upon execution, it generates base configuration files, dependencies, and a `manifest.json` file, ensuring a quick start to development. The primary component for development is `App.tsx`, where you can begin crafting your extension's functionality immediately.

## Getting Started with Your Extension

After running `yarn make:extension`, navigate to the newly created extension directory. You'll find the essential structure in place, including configuration for TypeScript, Webpack, Babel, and TailwindCSS. Start by editing `App.tsx` to develop your extension's features.

## Icon Generator

Included in the `scripts` folder is a Python-based icon generator tool, essential for creating icons for your extension. To use this tool, ensure that Python 3 is installed on your system.

### Usage

The icon generator script transforms an image into various sizes suitable for a browser extension. To use the script, execute the following command:

```bash
yarn generate:icon logo.png
```
