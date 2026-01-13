const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // Often needed in some environments
  });
  const page = await browser.newPage();

  // Set viewport large enough
  await page.setViewport({ width: 1200, height: 1500, deviceScaleFactor: 2 });

  const absolutePath =
    "/home/Storage/Projects/From-Scratch/doc-exp-tracker/fake_documents/template.html";
  const fileUrl = `file://${absolutePath}`;

  console.log(`Navigating to ${fileUrl}...`);
  await page.goto(fileUrl, { waitUntil: "networkidle0" });

  // Selectors for the elements
  const elements = [
    { id: "#license", name: "fake_driving_license.png" },
    { id: "#passport", name: "fake_passport.png" },
    { id: "#bluebook", name: "fake_bluebook.png" },
  ];

  for (const item of elements) {
    const element = await page.$(item.id);
    if (element) {
      const outputPath = path.join(__dirname, item.name);
      await element.screenshot({ path: outputPath });
      console.log(`Captured ${item.name} at ${outputPath}`);
    } else {
      console.error(`Element ${item.id} not found`);
    }
  }

  await browser.close();
  console.log("Done.");
})();
