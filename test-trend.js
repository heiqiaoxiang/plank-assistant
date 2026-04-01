import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 打开页面
  await page.goto('http://localhost:23367/');
  await page.waitForTimeout(1000);
  
  // 模拟完成几次训练
  for (let i = 0; i < 3; i++) {
    await page.click('#startBtn');
    await page.waitForTimeout(500);
    
    await page.evaluate(() => {
      if (window.app) {
        window.app.state.duration = 1;
        window.app.completeSession();
      }
    });
    await page.waitForTimeout(500);
  }
  
  // 打开历史面板
  await page.click('#historyBtn');
  await page.waitForTimeout(500);
  
  // 点击趋势 tab
  await page.click('[data-tab="trend"]');
  await page.waitForTimeout(1000);
  
  // 检查 canvas
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.getElementById('trendChart');
    const panel = document.getElementById('trendPanel');
    return {
      canvasExists: !!canvas,
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      panelVisible: panel?.style.display !== 'none',
      panelHTML: panel?.innerHTML?.substring(0, 300)
    };
  });
  
  console.log('=== Canvas Info ===');
  console.log(JSON.stringify(canvasInfo, null, 2));
  
  // 检查 app 实例
  const appState = await page.evaluate(() => {
    if (window.app) {
      return {
        hasTrendChart: !!window.app.trendChartInstance,
        chartType: window.app.trendChartInstance?.config?.type,
        dataPoints: window.app.trendChartInstance?.data?.datasets?.[0]?.data?.length,
        historyLength: window.app.data?.history?.length,
        elsTrendChart: !!window.app.els?.trendChart
      };
    }
    return { appExists: false };
  });
  
  console.log('\n=== App State ===');
  console.log(JSON.stringify(appState, null, 2));
  
  // 截图
  await page.screenshot({ path: 'test-trend.png', fullPage: true });
  console.log('\nScreenshot saved to test-trend.png');
  
  await browser.close();
})();
