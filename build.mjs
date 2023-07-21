/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/naming-convention, no-underscore-dangle */

import colors from '@colors/colors/safe.js';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve as pathResolve } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import cpy from 'cpy';

const { green, magenta } = colors;
const __dirname = dirname(fileURLToPath(import.meta.url));

const DIST_PATH = pathResolve(__dirname, './dist');

const log = str => console.log(magenta(str));

const execCmd = (cmd, opts) => new Promise((resolve, reject) => {
    exec(cmd, opts, (err, stdout, stderr) => {
        if (err) {
            console.error(stdout, stderr);
            return reject(err);
        }
        return resolve(stdout);
    });
});

const cleanDir = path => new Promise(resolve => {
    const exists = existsSync(path);
    if (exists) {
        rmSync(path, { recursive: true, cwd: __dirname });
    }
    // Gives time to rmSync to unlock the file on Windows
    setTimeout(() => {
        mkdirSync(path, { recursive: true, cwd: __dirname });
        resolve();
    }, exists ? 1000 : 0);
});

const copyAssets = async () => {
    await cpy('README.md', DIST_PATH, { flat: true });
    await cpy('LICENSE', DIST_PATH, { flat: true });
    await cpy('package.json', DIST_PATH, { flat: true });
};

const customizePackageJson = () => {
    const pkgJsonPath = pathResolve(DIST_PATH, 'package.json');
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, { encoding: 'utf8' }));
    delete pkgJson.scripts;
    delete pkgJson.devDependencies;
    writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 4), { encoding: 'utf8' });
};

const build = async () => {
    log('> Cleaning..');
    await cleanDir(DIST_PATH);

    log('> Building library..');
    await execCmd('tsc --project tsconfig.json', { cwd: __dirname });

    log('> Copying assets..');
    await copyAssets();

    log('> Customizing package.json..');
    customizePackageJson();

    log(`> ${green('Done!')}\n`);
};

void (async () => {
    try {
        await build();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
