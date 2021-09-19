const fs = require('fs');
const path = require('path');
const request = require('request');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const cron = require('node-cron');

const amazonURL = 'https://www.amazon.in/';
const flipkartURL = 'https://www.flipkart.com/';
const ebayURL = 'https://www.ebay.com/';

const product = 'iphone 12 pro max 256gb';

let amazon;     // Page-1 name in browser
let flipkart;   // Page-2 name in browser
let ebay;       // Page-3 name in browser

let priceOnAmazon;      // Price of product on Amazon
let priceOnFlipkart;    // Price of product on Flipkart
let priceOnEbay;        // Price of product on Ebay

configureBrowser();

async function configureBrowser() {
    const browser = await puppeteer.launch(
        {
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        }
    );
    const pages = await browser.pages();

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
    console.log(priceOnAmazon);
    await amazon.close();

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
    console.log(priceOnFlipkart);
    await flipkart.close();

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
    console.log(priceOnEbay);
    await ebay.close();
    minPrice();
    automateNotifications();
};

async function minPrice() {
    if (priceOnAmazon < priceOnFlipkart) {
        if (priceOnAmazon < priceOnEbay) {
            console.log('Buy from Amazon on', priceOnAmazon);
        } else {
            console.log('Buy from Ebay on', priceOnEbay);
        }
    } else {
        if (priceOnFlipkart < priceOnEbay) {
            console.log('Buy from FLipkart on', priceOnFlipkart);
        } else {
            console.log('Buy from Ebay on', priceOnEbay);
        }
    }
}

async function automateNotifications() {
    cron.schedule("*/10 * * * * *", function () {

        // Data to write on file
        let data = `${new Date().toUTCString()} 
                    : Server is working\n`;

        // Appending data to logs.txt file
        fs.appendFile("logs.txt", data, function (err) {

            if (err) throw err;

            console.log("Status Logged!");
        });
    });
};