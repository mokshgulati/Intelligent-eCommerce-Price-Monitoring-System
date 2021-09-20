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
    browser = await puppeteer.launch(
        {
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        }
    );
    pages = await browser.pages();

    await dancingAround();
}

async function dancingAround() {
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
};

async function dataLoggingNdNotify() {
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
}

async function minPrice() {
    if (priceOnAmazon < priceOnFlipkart) {
        if (priceOnAmazon < priceOnEbay) {
            console.log('***** Buy from Amazon on', priceOnAmazon, '*****');
            minPriceAmount = priceOnAmazon;
            minPriceSeller = 'AMAZON';
            minPriceURL = 'https://www.amazon.in/s?k=iphone+12+pro+max+256gb&ref=nb_sb_noss_1';
        } else {
            console.log('***** Buy from Ebay on', priceOnEbay, '*****');
            minPriceAmount = priceOnEbay;
            minPriceSeller = 'EBAY';
            minPriceURL = 'https://www.ebay.com/sch/i.html?_from=R40&_trksid=p2334524.m570.l1313&_nkw=iphone+12+pro+max+256gb&_sacat=0&LH_TitleDesc=0&_odkw=iphone+12+pro+max+256+gb&_osacat=0';
        }
    } else {
        if (priceOnFlipkart < priceOnEbay) {
            console.log('***** Buy from FLipkart on', priceOnFlipkart, '*****');
            minPriceAmount = priceOnFlipkart;
            minPriceSeller = 'FLIPKART';
            minPriceURL = 'https://www.flipkart.com/search?q=iphone%2012%20pro%20max%20256gb&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=off&as=off';
        } else {
            console.log('***** Buy from Ebay on', priceOnEbay, '*****');
            minPriceAmount = priceOnEbay;
            minPriceSeller = 'EBAY';
            minPriceURL = 'https://www.ebay.com/sch/i.html?_from=R40&_trksid=p2334524.m570.l1313&_nkw=iphone+12+pro+max+256gb&_sacat=0&LH_TitleDesc=0&_odkw=iphone+12+pro+max+256+gb&_osacat=0';
        }
    }
}

async function closeUnnecessaryTabs() {
    if (minPriceSeller == 'AMAZON') {
        await flipkart.close();
        await ebay.close();
    } else if (minPriceSeller == 'FLIPKART') {
        await amazon.close();
        await ebay.close();
    } else {
        await amazon.close();
        await flipkart.close();
    }
}

async function automation() {
    // Timer interval is set for every 1 minute (for experimental purposes), It can be changed accordingly
    cron.schedule("* * * * *", async function () {
        await browser.close();
        await configureBrowser();
    });
};

async function sendNotification() {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'amangoel124@gmail.com',
            pass: 'goelaman'
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
}

async function automateMonitoring() {
    await configureBrowser();
    await automation();
}

automateMonitoring();