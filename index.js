const START_DATE = '2006-04-01';
const END_DATE = '2023-03-31';
const SWITCH = false;
const USE_CLOSING_MONTH_PRICE_FOR_BEARISH_INDICES = true;

const INVESTMENT_DETAILS_FILE_PATH = 'investment_details.csv';

const Finance = require('financejs');
const lodash = require('lodash');
const moment = require('moment');
const { fetchStockPrices } = require('./fetchStockPrices');
const csvHelper = require('./csvHelper');

const getIndexToMonthStockPricesMap = async (indexes, currentDate) => {
	const startDate = moment(currentDate).startOf('month').format('YYYY-MM-DD');
	const endDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');
	const indexToStockPricesMap = {};
	for (const index of indexes) {
		const stockPrices = await fetchStockPrices(index, startDate, endDate);
		indexToStockPricesMap[index] = stockPrices;
	}
	return indexToStockPricesMap;
};

const getStockPriceFromMap = (stockPricesArray, date) => {
	const stockPrice = stockPricesArray.find(stockPrice => stockPrice.DATE === date);
	if (!stockPrice) {
		let minDiff = Number.MAX_SAFE_INTEGER; let usedRecord;
		for (const stockRecord of stockPricesArray) {
			const diff = Math.abs(moment(date).diff(stockRecord.DATE, 'days'));
			if (diff < minDiff) {
				minDiff = diff;
				usedRecord = stockRecord;
			}
		}
		// console.error(`Stock price not found for date: ${date}, so I am using ${usedRecord.DATE}`);
		return { PRICE: usedRecord.PRICE, DATE: usedRecord.DATE, };
	}
	return { PRICE: stockPrice.PRICE, DATE: stockPrice.DATE, };
};

const addToInvestedMap = (map, index, amount, units) => {
	if (!map[index]) {
		map[index] = { amount: 0, units: 0, buyAverage: 0, };
	}
	const mapIndex = map[index];
	mapIndex.amount += amount;
	mapIndex.units += units;
	mapIndex.buyAverage = mapIndex.amount / mapIndex.units;
};

const generateReturnFilesMap = async (indexes) => {
	const prefixFilePath = 'returns/';
	const indexToReturnsFileMap = {};
	const header = [
		{ id: 'INDEX_NAME', title: 'Index Name' },
		{ id: 'DATE', title: 'Date' },
		{ id: 'PRICE', title: 'Price' },
		{ id: 'UNITS', title: 'Units', },
		{ id: 'INVESTED_AMOUNT', title: 'Amount', },
		{ id: 'GAIN', title: 'GAIN', },
		{ id: 'GAIN_PERCENTAGE', title: 'GAIN_PERCENTAGE', },
		{ id: 'XIRR', title: 'XIRR', },
	];
	for (const index of indexes) {
		const returnFile = await csvHelper.initialise(`${prefixFilePath}${index}_returns.csv`, {
			header, append: false,
		});
		indexToReturnsFileMap[index] = returnFile;
	};
	indexToReturnsFileMap.total = await csvHelper.initialise(`${prefixFilePath}total_returns.csv`, {
		header, append: false,
	});
	return indexToReturnsFileMap;
};

const generateBearishIndexesMap = async (indexes, inputCurrentDate) => {
	// date is always first of month
	const date = moment(inputCurrentDate).startOf('month').format('YYYY-MM-DD');
	const bearishIndexesMap = {};
	const datesToCheck = [1, 2, 3].map((num) => {
		if (USE_CLOSING_MONTH_PRICE_FOR_BEARISH_INDICES) {
			return moment(date).subtract(num, 'month').endOf('month').format('YYYY-MM-DD');
		}
		return moment(date).subtract(num, 'month').startOf('month').format('YYYY-MM-DD');
	});

	// const indexesStockPriceMap = {};

	for (const index of indexes) {
		let minPrice = Number.MAX_SAFE_INTEGER, maxPrice = 0;
		for (const dateToCheck of datesToCheck) {
			const indexToStockMap = await getIndexToMonthStockPricesMap([index], dateToCheck);
			const stockPriceAndDate = getStockPriceFromMap(indexToStockMap[index], dateToCheck);
			const stockPrice = stockPriceAndDate.PRICE;
			if (stockPrice < minPrice) {
				minPrice = stockPrice;
			}
			if (stockPrice > maxPrice) {
				maxPrice = stockPrice;
			}
		}
		const indexToStockMap = await getIndexToMonthStockPricesMap([index], date);
		const stockPriceAndDate = getStockPriceFromMap(indexToStockMap[index], date);
		const stockPrice = stockPriceAndDate.PRICE;
		if (index === 'NIFTY200MOMENTM30' && stockPrice > 1.2 * minPrice) {
			bearishIndexesMap[index] = { positive: 1, };
		}
		if (index === 'NIFTY500 VALUE 50' && stockPrice < 0.8 * maxPrice) {
			bearishIndexesMap[index] = { positive: 1, };
		}
	}

	return bearishIndexesMap;
};

const caculateXirr = (transactions, { currentPrice, currentDate }) => {
	const finance = new Finance();
	const allAmounts = transactions.map(({ amount }) => amount);
	const allDates = transactions.map(({ date }) => new Date(date));
	allAmounts.push(-currentPrice);
	allDates.push(new Date(currentDate));
	const xirr = finance.XIRR(allAmounts, allDates, 0);
	return xirr;
};

const summarizeReturns = async (currentDate, indexesToFetch, investedMap, indexToReturnsFileMap, indexToStockPricesMap, trxnDetailsMap) => {
	const firstDateMonth = moment(currentDate).startOf('month').format('YYYY-MM-DD');
	let totalGainAtEOM = 0;
	let totalInvestedAtEOM = 0;
	let returnsCalculatedAtDate = firstDateMonth;
	for (const index of indexesToFetch) {
		const indexInvestmentDetails = investedMap[index];
		if (!indexInvestmentDetails) {
			continue;
		}
		const { amount, units, } = indexInvestmentDetails;
		const { PRICE: todayStockPrice, DATE: usedDate, } = getStockPriceFromMap(indexToStockPricesMap[index], firstDateMonth);
		returnsCalculatedAtDate = usedDate;
		const gainAmount = (units * todayStockPrice) - amount;
		const gainPercentage = (gainAmount / amount) * 100;

		const xirr = caculateXirr(trxnDetailsMap[index], {
			currentPrice: amount + gainAmount,
			currentDate: usedDate,
		});

		totalGainAtEOM += gainAmount;
		totalInvestedAtEOM += amount;

		await csvHelper.write(indexToReturnsFileMap[index], [
			{
				INDEX_NAME: index,
				DATE: usedDate,
				PRICE: todayStockPrice,
				UNITS: units,
				INVESTED_AMOUNT: amount,
				GAIN: gainAmount,
				GAIN_PERCENTAGE: gainPercentage,
				XIRR: xirr,
			}
		]);
	};

	// summarize
	if (totalInvestedAtEOM === 0) {
		return 0; // no investment made yet;
	}

	const totalXirr = caculateXirr(Object.values(trxnDetailsMap).flat(), {
		currentDate: returnsCalculatedAtDate,
		currentPrice: totalInvestedAtEOM + totalGainAtEOM,
	});

	await csvHelper.write(indexToReturnsFileMap.total, [
		{
			INDEX_NAME: 'total',
			DATE: returnsCalculatedAtDate,
			PRICE: 'Not Valid',
			UNITS: 'Not Valid',
			INVESTED_AMOUNT: totalInvestedAtEOM,
			GAIN: totalGainAtEOM,
			GAIN_PERCENTAGE: 100 * (totalGainAtEOM / totalInvestedAtEOM),
			XIRR: totalXirr,
		}
	]);
	toRet = 100 * totalGainAtEOM / totalInvestedAtEOM;
	return toRet;
};

const getThisMonthSip = async (indexesToFetch, currentDate, lastSip) => {
	if (!SWITCH) {
		return false;
	}
	if (moment(currentDate).startOf('month').format('YYYY-MM-DD') === '2021-04-01') {
		// bone of contention;;
		console.log('bone of contention');
	}
	const bearishIndexesMap = await generateBearishIndexesMap(indexesToFetch, currentDate);
	let prefferedSip;
	for (const index in bearishIndexesMap) {
		if (bearishIndexesMap[index].positive) {
			if (prefferedSip) {
				throw new Error('Error: more than one index is positive', currentDate);
			}
			prefferedSip = index;
		}
	}
	return prefferedSip || lastSip;
};

const addToTrxnDetailsMap = (map, index, date, price, amount, units) => {
	if (!map[index]) {
		map[index] = [];
	}
	map[index].push({
		date,
		amount,
	});
};

const generateInvestmentPattern = async (startDate, endDate, sipDetails) => {
	const investmentDetailsFile = await csvHelper.initialise(INVESTMENT_DETAILS_FILE_PATH, {
		header: [
			{ id: 'INDEX_NAME', title: 'Index Name' },
			{ id: 'DATE', title: 'Date' },
			{ id: 'PRICE', title: 'Price' },
			{ id: 'AMOUNT', title: 'Amount' },
			{ id: 'UNITS', title: 'Units', },
		],
		append: false,
	}); // txn history file

	const currentDate = new Date(startDate);
	const indexesToFetch = lodash.uniq(sipDetails.map(({ index }) => index));
	const indexToReturnsFileMap = await generateReturnFilesMap(indexesToFetch); // calculates returns for only indexes

	const investedMap = {};
	const trxnDetailsMap = {};
	let lastSip = 'NIFTY200MOMENTM30'; // start from momentum
	let nSwitches = 0;
	while (currentDate <= endDate) {
		const indexToStockPricesMap = await getIndexToMonthStockPricesMap(indexesToFetch, currentDate);
		// calculate returns until now & summarize
		const returnsForThisMonth = await summarizeReturns(currentDate, indexesToFetch, investedMap, indexToReturnsFileMap, indexToStockPricesMap, trxnDetailsMap);

		const sipForThisMonth = await getThisMonthSip(indexesToFetch, currentDate, lastSip);
		// make sips for month
		for (const { index, day, amount, } of sipDetails) {
			if (sipForThisMonth && sipForThisMonth !== index) {
				continue;
			}
			if (sipForThisMonth && sipForThisMonth !== lastSip) {
				// got switched
				nSwitches++;
			}
			lastSip = index;

			const dateStr = moment(currentDate).set('date', day).format('YYYY-MM-DD');

			// calculate the units to buy for sip
			const { PRICE: price, DATE: usedDate, } = getStockPriceFromMap(indexToStockPricesMap[index], dateStr);
			const units = amount / price;

			// logging & make sip for today
			addToInvestedMap(investedMap, index, amount, units);
			addToTrxnDetailsMap(trxnDetailsMap, index, usedDate, price, amount, units);
			await csvHelper.write(investmentDetailsFile, [
				{
					INDEX_NAME: index,
					DATE: usedDate,
					PRICE: price,
					AMOUNT: amount,
					UNITS: units,
				}
			]);
		}
		// done for this month, move to next month
		currentDate.setMonth(currentDate.getMonth() + 1);
	}

	const indexToStockPricesMap = await getIndexToMonthStockPricesMap(indexesToFetch, currentDate);
	const toRet = await summarizeReturns(currentDate, indexesToFetch, investedMap, indexToReturnsFileMap, indexToStockPricesMap, trxnDetailsMap);
	if (SWITCH) {
		console.log(`Switches: ${nSwitches}`);
	}
	return toRet;
};

(async () => {
	try {
		const SIP_DETAILS = [
			// { day: 1, amount: 10000, index: 'NIFTY200MOMENTM30' },
			// { day: 1, amount: 10000, index: 'NIFTY500 VALUE 50' },
			// { day: 1, amount: 10000, index: 'NIFTY50 VALUE 20' },

			// { day: 1, amount: 10000, index: 'NIFTY 50' },
			// { day: 1, amount: 10000, index: 'NIFTY NEXT 50' },

			// { day: 1, amount: 10000, index: 'NIFTY MIDCAP 150' },
			// { day: 1, amount: 10000, index: 'NIFTY MIDCAP 100' },
			// { day: 1, amount: 10000, index: 'NIFTY MIDCAP 50' },
			// { day: 1, amount: 10000, index: 'NIFTY M150 QLTY50' },
			// { day: 1, amount: 10000, index: 'NIFTY MID SELECT' },

			// { day: 1, amount: 10000, index: 'NIFTY SMLCAP 50' },
			// { day: 1, amount: 10000, index: 'NIFTY SMLCAP 250' },

			{ day: 1, amount: 10000, index: 'NIFTY LARGEMID250' },
		];
		let currentDay = 1;
		let bestDay = 1;
		let maxGainPercentEnd = 0;
		let minGainPercentEnd = Number.MAX_SAFE_INTEGER;
		let worstDay = 1;
		// while (currentDay < 29) { // if you use while loop that returns sheets do not make sense as of now
		const gainPercentEnd = await generateInvestmentPattern(new Date(START_DATE), new Date(END_DATE), SIP_DETAILS.map(sip => {
			return {
				...sip,
				day: currentDay,
			}
		}));
		if (gainPercentEnd > maxGainPercentEnd) {
			maxGainPercentEnd = gainPercentEnd;
			bestDay = currentDay;
		}
		if (gainPercentEnd < minGainPercentEnd) {
			minGainPercentEnd = gainPercentEnd;
			worstDay = currentDay;
		}
		currentDay++;
		// }
		return console.log(`
			Best day: ${bestDay}, Best gain: ${maxGainPercentEnd}
			Worst day: ${worstDay} Worst gain: ${minGainPercentEnd}
		`);
	} catch (e) {
		console.error(e);
	}
})();