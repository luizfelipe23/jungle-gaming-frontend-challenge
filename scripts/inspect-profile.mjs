import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/login');
  await page.getByLabel('E-mail').fill('luna@demo.kurio');
  await page.getByLabel('Senha').fill('Luna@Kurio2026!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/');
  await page.goto('http://localhost:5173/profile');
  await page.waitForTimeout(2000);

  const matches = await page.getByLabel('Nova senha').all();
  console.log('URL', page.url());
  console.log('MATCH COUNT', matches.length);
  for (const match of matches) {
    console.log(await match.evaluate((node) => ({
      tag: node.tagName,
      id: node.id,
      text: node.textContent,
      ariaLabel: node.getAttribute('aria-label'),
      ariaLabelledBy: node.getAttribute('aria-labelledby'),
      role: node.getAttribute('role'),
      value: 'value' in node ? node.value : undefined,
      type: 'type' in node ? node.type : undefined,
      className: node.className,
    })));
  }
  console.log('LABELS', JSON.stringify(await page.locator('label').allTextContents()));
  const inputs = await page.locator('input').evaluateAll((nodes) => nodes.map((n) => ({
    type: n.type,
    id: n.id,
    name: n.name,
    ariaLabel: n.getAttribute('aria-label'),
    labels: n.labels ? Array.from(n.labels).map((l) => l.textContent) : [],
    value: n.value,
    hidden: n.hidden,
  })));
  console.log('INPUTS', JSON.stringify(inputs, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
