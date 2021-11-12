// <On the console>
// *****   npm i puppeteer      *****
// *****   npm i node-cron      *****
// *****   npm init -y          *****
// *****   npm i nodemailer -S  *****
const fs = require('fs');
const puppeteer = require('puppeteer');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

const amazonURL = 'https://www.amazon.in/';
const flipkartURL = 'https://www.flipkart.com/';
const ebayURL = 'https://www.ebay.com/';
// More websites can be added accordingly

const product = 'new iphone 12 pro max 256gb';      // <Input> (Product name)

let amazon;     // Page-1 in browser
let flipkart;   // Page-2 in browser
let ebay;       // Page-3 in browser

let budgetPrice = 130000;       // Price below which user can afford that product
let priceOnAmazon;              // Price of product on Amazon
let priceOnFlipkart;            // Price of product on Flipkart
let priceOnEbay;                // Price of product on Ebay

let minPriceAmount;     // Minimum price after comparing prices on each website
let minPriceSeller;     // Website which has the lowest price
let minPriceURL;        // URL of the min price website (to the point where you can place order)

let browser;
let pages;

async function configureBrowser() {
    try {
        browser = await puppeteer.launch(
            {
                headless: false,
                defaultViewport: null,
                args: ['--start-maximized']
            }
        );
        pages = await browser.pages();

        await dancingAround();
    } catch (error) {
        console.log('Error!!')
    }
}

async function dancingAround() {
    try {
        amazon = pages[0];
        await amazon.goto(amazonURL);
        await amazon.click('.nav-search-field');
        await amazon.type('.nav-search-field', product);
        await amazon.click('#nav-search-submit-button');
        await amazon.waitForSelector('.a-price-whole');
        let priceArrOnAmazon = await amazon.$$('.a-price-whole');
        priceOnAmazon = await amazon.evaluate(function (elem) {
            return (Number)(elem.textContent.trim().split(',').join(''));
        }, priceArrOnAmazon[0]);
        console.log('Price on Amazon        :      ', priceOnAmazon);

        flipkart = await browser.newPage();
        await flipkart.goto(flipkartURL);
        await flipkart.click('button._2KpZ6l._2doB4z');  // Hides the logIn notification pop-up
        await flipkart.click('._3OO5Xc');
        await flipkart.type('._3OO5Xc', product);
        await flipkart.click('.L0Z3Pu');
        await flipkart.waitForSelector('._30jeq3._1_WHN1');
        let priceArrOnFlipkart = await flipkart.$$('._30jeq3._1_WHN1');
        priceOnFlipkart = await flipkart.evaluate(function (elem) {
            return (Number)(elem.textContent.trim().slice(1).split(',').join(''));
        }, priceArrOnFlipkart[0]);
        console.log('Price on Flipkart      :      ', priceOnFlipkart);

        ebay = await browser.newPage();
        await ebay.goto(ebayURL);
        await ebay.click('#gh-ac-box');
        await ebay.type('#gh-ac-box', product);
        await ebay.click('.btn.btn-prim.gh-spr');
        await ebay.waitForSelector('.s-item__price');
        let priceArrOnEbay = await ebay.$$('.s-item__price');
        priceOnEbay = await ebay.evaluate(function (elem) {
            return (Number)(elem.textContent.trim().slice(1).split(',').join('').split('.')[0]) * 74;
        }, priceArrOnEbay[0]);
        console.log('Price on Ebay          :      ', priceOnEbay);

        await minPrice();
        await closeUnnecessaryTabs();
        await dataLoggingNdNotify();
    } catch (error) {
        console.log('Error!!')
    }
};

async function dataLoggingNdNotify() {
    try {
        // Data to be logged into the file
        let data = `${new Date().toUTCString()} : Current Monitored prices =>\n               Amazon         :   ₹.${priceOnAmazon}\n               Flipkart       :   ₹.${priceOnFlipkart}\n               Ebay           :   ₹.${priceOnEbay}\n\nBest to buy from ${minPriceSeller} at *** ₹.${minPriceAmount} ***\n\n`;
        // Logs data into the file at set time intervals
        fs.appendFile("logs.txt", data, function (err) {
            if (err) throw err;
            console.log("Status Logged!");
        });
        // Send mail on price drops below the set budget price
        if (minPriceAmount < budgetPrice) {
            await sendNotification();
        }
    } catch (error) {
        console.log('Error!!')
    }
}

async function minPrice() {
    try {
        if (priceOnAmazon < priceOnFlipkart) {
            if (priceOnAmazon < priceOnEbay) {
                console.log('***** Buy from Amazon on', priceOnAmazon, '*****');
                minPriceAmount = priceOnAmazon;
                minPriceSeller = 'AMAZON';
                minPriceURL = 'https://www.amazon.in/New-Apple-iPhone-Pro-256GB/dp/B08L5T31M6/ref=sr_1_1?dchild=1&keywords=iphone+12+pro+max+256gb&qid=1632153792&qsid=257-7075868-1477109&sr=8-1&sres=B08L5T31M6%2CB08L5V825S%2CB08Z6K7Z4S%2CB08L5W2S3Q%2CB08Z72BSJJ%2CB08L5WFZCP%2CB08Z6W92VP%2CB08Z721V2R%2CB08Z6Q456F%2CB08Z6Q456G%2CB08Z6Q7VWS%2CB08L5T2XSF%2CB08L5T44CQ%2CB08L5VPTDK%2CB08L5VF4J4%2CB08L5V6N2K&srpt=CELLULAR_PHONE';
            } else {
                console.log('***** Buy from Ebay on', priceOnEbay, '*****');
                minPriceAmount = priceOnEbay;
                minPriceSeller = 'EBAY';
                minPriceURL = 'https://www.ebay.com/itm/234192276879?epid=8041719568&hash=item3686f28d8f:g:L5wAAOSwMKBhRLs1';
            }
        } else {
            if (priceOnFlipkart < priceOnEbay) {
                console.log('***** Buy from FLipkart on', priceOnFlipkart, '*****');
                minPriceAmount = priceOnFlipkart;
                minPriceSeller = 'FLIPKART';
                minPriceURL = 'https://www.flipkart.com/apple-iphone-12-pro-max-pacific-blue-256-gb/p/itm3a0860c94250e?pid=MOBFWBYZ8STJXCVT&lid=LSTMOBFWBYZ8STJXCVT92HUS8&marketplace=FLIPKART&q=iphone+12+pro+max+256gb&store=tyy%2F4io&srno=s_1_1&otracker=search&otracker1=search&fm=organic&iid=3ba6963b-5669-4e5f-92db-5d8a6d2ac3fa.MOBFWBYZ8STJXCVT.SEARCH&ppt=None&ppn=None&ssid=aye62vtsuo0000001632125115497&qH=68c47abe9cd2f4fc';
            } else {
                console.log('***** Buy from Ebay on', priceOnEbay, '*****');
                minPriceAmount = priceOnEbay;
                minPriceSeller = 'EBAY';
                minPriceURL = 'https://www.ebay.com/itm/234192276879?epid=8041719568&hash=item3686f28d8f:g:L5wAAOSwMKBhRLs1';
            }
        }
    } catch (error) {
        console.log('Error!!')
    }
}

async function closeUnnecessaryTabs() {
    try {
        if (minPriceSeller == 'AMAZON') {
            await flipkart.close();
            await ebay.close();
            await amazon.click('.a-price-whole');
        } else if (minPriceSeller == 'FLIPKART') {
            await amazon.close();
            await ebay.close();
            await flipkart.click('._30jeq3._1_WHN1');
        } else {
            await amazon.close();
            await flipkart.close();
            await ebay.click('.s-item__price');
        }
    } catch (error) {
        console.log('Error!!')
    }
}

async function automation() {
    try {
        // Timer interval is set for every 1 minute (for experimental purposes), It can be changed accordingly
        cron.schedule("* * * * *", async function () {
            await browser.close();
            await configureBrowser();
        });
    } catch (error) {
        console.log('Error!!')
    }
};

async function sendNotification() {
    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'amangoel124@gmail.com',
                pass: '********'
                // Note: Open this link to Allow less secure apps: ON
                // Link: https://myaccount.google.com/lesssecureapps
            }
        });
        let info = await transporter.sendMail({
            from: '"Moksh Gulati" <amangoel124@gmail.com>',
            to: "mokshgulati99@gmail.com",      // The email ID on which you aspire to get the notification mail.
            subject: 'Prices dropped!!! Go get a grab!',
            text: `Price of your ${product} just fell into your budget.\nGo get a grab on before the deal ends.\nCURRENT PRICE :    ${minPriceAmount}\nGoto : ${minPriceURL}`
            // Check spam too for the mail
        });
        console.log("Message sent: ", info.messageId);
    } catch (error) {
        console.log('Error!!')
    }
}

async function automateMonitoring() {
    try {
        await configureBrowser();
        await automation();
    } catch (error) {
        console.log('Error!!')
    }
}

automateMonitoring();