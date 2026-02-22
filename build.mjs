import { exec } from 'node:child_process';
import { cp } from 'node:fs/promises';
import { styleText } from 'node:util';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DIST_PATH = pathResolve(__dirname, './dist');

const log = str => console.log(styleText('magenta', str));

const execCmd = (cmd, opts) =>
    new Promise((resolve, reject) => {
        exec(cmd, opts, (err, stdout, stderr) => {
            if (err) {
                console.error(stdout, stderr);
                return reject(err);
            }
            return resolve(stdout);
        });
    });

const cleanDir = path =>
    new Promise(resolve => {
        const exists = existsSync(path);
        if (exists) {
            rmSync(path, { recursive: true, cwd: __dirname });
        }
        // Gives time to rmSync to unlock the file on Windows
        setTimeout(
            () => {
                mkdirSync(path, { recursive: true, cwd: __dirname });
                resolve();
            },
            exists ? 1000 : 0
        );
    });

const copyAssets = async () => {
    await cp('bin', pathResolve(DIST_PATH, 'bin'), { recursive: true });
    await cp('package.json', pathResolve(DIST_PATH, 'package.json'));
    await cp('README.md', pathResolve(DIST_PATH, 'README.md'));
    await cp('LICENSE', pathResolve(DIST_PATH, 'LICENSE'));
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

    log(`> ${styleText('green', 'Done!')}\n`);
};

void (async () => {
    try {
        await build();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
