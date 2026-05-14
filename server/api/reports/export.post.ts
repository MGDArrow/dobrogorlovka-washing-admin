// server/api/reports/export.post.ts
import { getRequestURL, readBody } from 'h3';
import puppeteer from 'puppeteer';

let browser: puppeteer.Browser | null = null;

async function getBrowser() {
  if (!browser) {
    let executablePath: string | undefined;
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      executablePath =
        'C:/Program Files/Yandex/YandexBrowser/Application/browser.exe';
    } else if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ...(executablePath && { executablePath }),
    });
  }
  return browser;
}

export default defineEventHandler(async (event) => {
  const { start, end, periodType } = await readBody(event);
  if (!start || !end || !periodType) {
    throw createError({ statusCode: 400, message: 'Не указан период' });
  }

  const origin = getRequestURL(event).origin;
  const reportUrl = new URL('/reports', origin);
  reportUrl.searchParams.set('start', start);
  reportUrl.searchParams.set('end', end);
  reportUrl.searchParams.set('periodType', periodType);

  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    await page.goto(reportUrl.href, { waitUntil: 'networkidle0' });
    await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 5 });
    await page.waitForFunction(() => (window as any).reportReady === true, {
      timeout: 10000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
    });

    setResponseHeader(event, 'Content-Type', 'application/pdf');
    setResponseHeader(
      event,
      'Content-Disposition',
      'attachment; filename="report.pdf"',
    );
    return pdfBuffer;
  } finally {
    await page.close();
  }
});
