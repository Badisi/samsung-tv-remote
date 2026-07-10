import { copyFileSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig[] = defineConfig([{
    entry: ['src/index.ts', 'src/cli.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    onSuccess: (): void => {
        const pkgJson = JSON.parse(readFileSync('package.json', 'utf8')) as Record<string, unknown>;
        delete pkgJson['scripts'];
        delete pkgJson['devDependencies'];
        writeFileSync('dist/package.json', JSON.stringify(pkgJson, null, 4));

        cpSync('bin', 'dist/bin', { recursive: true });
        copyFileSync('README.md', 'dist/README.md');
        copyFileSync('LICENSE', 'dist/LICENSE');
    },
}]);

export default config;
