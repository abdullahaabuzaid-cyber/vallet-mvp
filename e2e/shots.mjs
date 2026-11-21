/** Screenshot helper shared by phase tests. */
export async function shots(browser, B, prefix, check, list) {
  for (const item of list) {
    const p = await item.c.newPage();
    if (item.mobile) await p.setViewportSize({ width: 412, height: 915 });
    await p.goto(B + item.path);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `shots/${prefix}-${item.name}.png`, fullPage: true });
    check('browser ' + item.name, (await p.locator('#root').innerText()).length > 100);
    await p.close();
  }
}
