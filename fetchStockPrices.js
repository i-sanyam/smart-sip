const fs = require('fs');
const axios = require('axios');
const moment = require('moment');
const csvWriter = require('csv-writer');
const csvHelper = require('./csvHelper');

const FILE_PATH = 'stock_prices.csv';
const BASE_FILE_PREFIX = 'stock_prices/';
const NIFTY_STOCK_URL = 'https://www.niftyindices.com/Backpage.aspx/getTotalReturnIndexString';

let waitForApiCall = false;
const SUCCESSIVE_API_CALL_DELAY_MS = 500;

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
};

const waitForNseCall = () => {
	return new Promise(async (resolve) => {
		while (waitForApiCall) {
			console.log('Waiting for NSE API call timer to complete');
			await sleep(500);
		}
		resolve();
	});
};

const setTimerForNseCall = () => {
	waitForApiCall = true;
	setTimeout(() => {
		waitForApiCall = false;
	}, SUCCESSIVE_API_CALL_DELAY_MS);
};

const fetchIndexHistoryFromNSE = async (indexName, startDate, endDate) => {
	await waitForNseCall();
	console.log('Calling NSE');
	const response = await axios.post(NIFTY_STOCK_URL, {
		name: indexName,
		startDate: moment(startDate).format('DD-MMM-YYYY'),
		endDate: moment(endDate).format('DD-MMM-YYYY'),
	}, {
		headers: {
			'Accept': 'application/json, text/javascript, */*; q=0.01',
			'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
			'Connection': 'keep-alive',
			'Content-Type': 'application/json; charset=UTF-8',
			'Origin': 'https://www.niftyindices.com',
			'Referer': 'https://www.niftyindices.com/reports/historical-data',
			'Sec-Fetch-Dest': 'empty',
			'Sec-Fetch-Mode': 'cors',
			'Sec-Fetch-Site': 'same-origin',
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
			'X-Requested-With': 'XMLHttpRequest',
			'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"'
		}
	});
	setTimerForNseCall();

	// Parse the response and extract the stock prices
	if (response.status !== 200 || !response?.data?.d) {
		throw new Error('Failed to fetch stock prices from API');
	}

	const datesData = JSON.parse(response.data.d);
	const stockPrices = datesData.map(({ TotalReturnsIndex, Date: nseDate }) => {
		return {
			INDEX_NAME: indexName,
			PRICE: TotalReturnsIndex,
			DATE: new Date(nseDate).toISOString().slice(0, 10),
			// OPEN: dateData.OPEN,
			// HIGH: dateData.HIGH,
			// LOW: dateData.LOW,
		};
	});
	return stockPrices;
};

const saveStockPrices = async (filePathToUse, stockPrices) => {
	// Store the stock prices in the CSV file
	const fileExists = fs.existsSync(filePathToUse);
	const csvWriteInstance = csvWriter.createObjectCsvWriter({
		path: filePathToUse,
		header: [
			{ id: 'INDEX_NAME', title: 'INDEX_NAME' },
			{ id: 'DATE', title: 'DATE' },
			{ id: 'PRICE', title: 'PRICE' },
		],
		append: fileExists,
	});
	await csvWriteInstance.writeRecords(stockPrices);
};

const fetchStockPrices = async (indexName, startDate, endDate) => {
	// Check if stock prices are already available in the CSV file
	indexName = indexName.toUpperCase();
	const filePathToUse = `${BASE_FILE_PREFIX}${indexName}_${FILE_PATH}`;
	const results = await csvHelper.readFromCSV(filePathToUse, (data) => {
		if (data.DATE >= startDate && data.DATE <= endDate) {
			return true;
		}
		return false;
	});
	// if (results.length > 0) {
	//   console.log(indexName, startDate, endDate, 'Stock prices found in CSV file:', results.length);
	// }

	if (results.length === 0) {
		// If stock prices are not available in the CSV file, fetch them from the API
		const stockPrices = await fetchIndexHistoryFromNSE(indexName, startDate, endDate);
		await saveStockPrices(filePathToUse, stockPrices);
		console.log(indexName, startDate, endDate, 'Stock prices fetched from API:', stockPrices.length);
		results.push(...stockPrices);
	}
	return results;;
};

module.exports = { fetchStockPrices, };