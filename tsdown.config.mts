import { copyFileSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig[] = defineConfig([{
    entry: ['src/cli.ts'],
    format: ['esm'],
    clean: true,
    dts: false,
    sourcemap: false,
    deps: {
        neverBundle: ['samsung-tv-remote']
    },
    onSuccess: (): void => {
        cpSync('bin', 'dist/bin', { recursive: true });
    }
}, {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    clean: true,
    sourcemap: false,
    dts: {
        sourcemap: false
    },
    onSuccess: (): void => {
        const pkgJson = JSON.parse(readFileSync('package.json', 'utf8')) as Record<string, unknown>;
        const postinstall = (pkgJson['scripts'] as Record<string, string> | undefined)?.['postinstall'];
        if (postinstall) {
            pkgJson['scripts'] = { postinstall };
        } else {
            delete pkgJson['scripts'];
        }
        delete pkgJson['publishConfig'];
        delete pkgJson['devDependencies'];
        writeFileSync('dist/package.json', JSON.stringify(pkgJson, null, 4));

        copyFileSync('README.md', 'dist/README.md');
        copyFileSync('LICENSE', 'dist/LICENSE');
    },
}]);

export default config;
