const { Builder } = require("selenium-webdriver");
const chrome = require('selenium-webdriver/chrome');

async function navigateToApplication() {
    // Set Chrome options to accept insecure certificates (bypass SSL validation)
    let options = new chrome.Options().setAcceptInsecureCerts(true);

    // Launch the Chrome browser with the specified options
    let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

    try {
        // Navigate to your web application
        await driver.get('https://localhost:5000');

        // Wait for a few seconds to see the page (optional)
        await driver.sleep(3000);
    } catch (error) {
        console.error('Error occurred:', error);
    } finally {
        // Close the browser after navigation
        await driver.quit();
    }
}

navigateToApplication();


