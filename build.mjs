import { build, context } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');

async function assemble(js) {
  const [template, css] = await Promise.all([readFile('src/index.html', 'utf8'), readFile('src/styles.css', 'utf8')]);
  const page = template
    .replace('/*ALGES_CSS*/', () => css)
    .replace('/*ALGES_JS*/', () => js.replaceAll('</script', '<\\/script'));
  await mkdir('dist', { recursive: true });
  // The page as published, and a standalone copy for GitHub Pages or opening from disk.
  await writeFile('dist/alges.html', page);
  await writeFile('dist/index.html', `<!doctype html>\n<html lang="en">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${page}\n</html>\n`);
  console.log(`built dist/index.html, ${(page.length / 1024).toFixed(1)} KB`);
}

const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  write: false,
  minify: !watch,
  format: 'iife',
  target: 'es2022',
  platform: 'browser',
  plugins: [{ name: 'page', setup(b) { b.onEnd(async (r) => { if (!r.errors.length) await assemble(r.outputFiles[0].text); }); } }],
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('watching for changes');
} else {
  await build(options);
}
