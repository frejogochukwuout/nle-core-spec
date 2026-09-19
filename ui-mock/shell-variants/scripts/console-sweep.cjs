#!/usr/bin/env node
/* R23 quick console-error sweep: boots each target story through the same
 * playwright path the VLM harness uses, collects page errors + console
 * errors (the live-verification gate). Usage:
 *   node scripts/console-sweep.cjs "story-id,another-id"   */
const { chromium } = require(require('fs').existsSync('/home/z/node_modules/playwright')
  ? '/home/z/node_modules/playwright'
  : '/home/z/.npm-global/lib/node_modules/playwright');

const TARGETS = (process.argv[2] || 'shell-appshell--fx,shell-appshell--edit,shell-appshell--color,shell-appshell--audio,shell-appshell--deliver').split(',');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const report = [];
  for (const id of TARGETS) {
    const errors = [];
    const onErr = (e) => errors.push(String(e).slice(0, 160));
    const onCon = (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); };
    page.on('pageerror', onErr); page.on('console', onCon);
    await page.goto(`http://localhost:3000/?path=/story/${id}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1600); // iframe render settle
    page.off('pageerror', onErr); page.off('console', onCon);
    report.push({ id, errors });
    console.log(`${errors.length === 0 ? 'OK ' : 'ERR'} ${id} — ${errors.length} error(s)`);
    errors.slice(0, 3).forEach((e) => console.log('     ', e));
  }
  await browser.close();
  require('fs').writeFileSync(__dirname + '/../r23-analysis/console-sweep.json', JSON.stringify(report, null, 2));
})();
