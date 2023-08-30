const START_DATE = '2020-08-01';
const END_DATE = '2023-08-31';
const SWITCH = true;

const INVESTMENT_DETAILS_FILE_PATH = 'investment_details.csv';

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
    return usedRecord.PRICE;
  }
  return stockPrice.PRICE;
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
  const indexToReturnsFileMap = {};
  const header = [
    { id: 'INDEX_NAME', title: 'Index Name' },
    { id: 'DATE', title: 'Date' },
    { id: 'PRICE', title: 'Price' },
    { id: 'UNITS', title: 'Units', },
    { id: 'INVESTED_AMOUNT', title: 'Amount', },
    { id: 'GAIN', title: 'GAIN', },
    { id: 'GAIN_PERCENTAGE', title: 'GAIN_PERCENTAGE', },
  ];
  for (const index of indexes) {
    const returnFile = await csvHelper.initialise(`${index}_returns.csv`, {
      header, append: false,
    });
    indexToReturnsFileMap[index] = returnFile;
  };
  indexToReturnsFileMap.total = await csvHelper.initialise(`total_returns.csv`, {
    header, append: false,
  });
  return indexToReturnsFileMap;
};

const generateBearishIndexesMap = async (indexes, date) => {
  // date is always first of month
  const bearishIndexesMap = {};
  const datesToCheck = [1,2,3].map((num) => {
    return moment(date).subtract(num,'month').endOf('month').format('YYYY-MM-DD');
  });

  const indexesStockPriceMap = {};

  for (const index of indexes) {
    let minPrice = Number.MAX_SAFE_INTEGER, maxPrice = 0;
    for (const dateToCheck of datesToCheck) {
      const indexToStockMap = await getIndexToMonthStockPricesMap([index], dateToCheck);
      const stockPrice = getStockPriceFromMap(indexToStockMap[index], dateToCheck);
      if (stockPrice < minPrice) {
        minPrice = stockPrice;
      }
      if (stockPrice > maxPrice) {
        maxPrice = stockPrice;
      }
    }
    const indexToStockMap = await getIndexToMonthStockPricesMap([index], date);
    const stockPrice = getStockPriceFromMap(indexToStockMap[index], date);
    if (stockPrice > 1.2 * minPrice) {
      bearishIndexesMap[index] = { positive: 1, };
    }
    if ( stockPrice < 0.8 * maxPrice) {
      bearishIndexesMap[index] = { negative: 1, };
    }
  }
  
  return bearishIndexesMap;
};

const generateInvestmentPattern = async (startDate, endDate, sipDetails) => {
  const investmentDetailsFile = await csvHelper.initialise(INVESTMENT_DETAILS_FILE_PATH, {
    header: [
      { id: 'INDEX_NAME', title: 'Index Name' },
      { id: 'DATE', title: 'Date' },
      { id: 'PRICE', title: 'Price' },
      { id: 'AMOUNT', title: 'Amount'},
      { id: 'UNITS', title: 'Units', },
    ],
    append: false,
  });

  const currentDate = new Date(startDate);
  const indexesToFetch = lodash.uniq(sipDetails.map(({ index }) => index));
  const indexToReturnsFileMap = await generateReturnFilesMap(indexesToFetch);

  const investedMap = {};
  let toRet = 0;
  let lastSip;

  while (currentDate <= endDate) {
    const indexToStockPricesMap = await getIndexToMonthStockPricesMap(indexesToFetch, currentDate);
    // calculate returns until now
    const firstDateMonth = moment(currentDate).startOf('month').format('YYYY-MM-DD');
    let totalGainAtEOM = 0;
    let totalInvestedAtEOM = 0;
    for (const index of indexesToFetch) {
      const indexInvestmentDetails = investedMap[index];
      if (!indexInvestmentDetails) {
        continue;
      }
      const { amount, units, } = indexInvestmentDetails;
      const todayStockPrice = getStockPriceFromMap(indexToStockPricesMap[index], firstDateMonth);
      const gainAmount = (units * todayStockPrice) - amount;
      const gainPercentage = (gainAmount / amount) * 100;

      totalGainAtEOM += gainAmount;
      totalInvestedAtEOM += amount;

      await csvHelper.write(indexToReturnsFileMap[index], [
        { 
          INDEX_NAME: index,
          DATE: firstDateMonth,
          PRICE: todayStockPrice,
          UNITS: units,
          INVESTED_AMOUNT: amount,
          GAIN: gainAmount,
          GAIN_PERCENTAGE: gainPercentage,
        }
      ]);
    };

    // summarize
    await csvHelper.write(indexToReturnsFileMap.total, [
      { 
        INDEX_NAME: 'total',
        DATE: firstDateMonth,
        PRICE: 'Not Valid',
        UNITS: 'Not Valid',
        INVESTED_AMOUNT: totalInvestedAtEOM,
        GAIN: totalGainAtEOM,
        GAIN_PERCENTAGE: 100 * (totalGainAtEOM / totalInvestedAtEOM),
      }
    ]);
    toRet = 100 * totalGainAtEOM/totalInvestedAtEOM;

    // const bearishIndexesMap = generateBearishIndexesMap(indexesToFetch, firstDateMonth);
    
    // make sips for month
    for (const { index, day, amount, } of sipDetails) {
      if (SWITCH) {

      }
      const dateStr = moment(currentDate).set('date', day).format('YYYY-MM-DD');

      // calculate the units to buy for sip
      const price = getStockPriceFromMap(indexToStockPricesMap[index], dateStr);
      const units = amount / price;

      // logging & make sip for today
      addToInvestedMap(investedMap, index, amount, units);
      await csvHelper.write(investmentDetailsFile, [
        {
          INDEX_NAME: index,
          DATE: dateStr,
          PRICE: price,
          AMOUNT: amount,
          UNITS: units,
        }
      ]);
    }
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return toRet;
};

(async () => {
  try {
    const SIP_DETAILS = [
      // { day: 1, amount: 5000, index: 'NIFTY200MOMENTM30' },
      // { day: 1, amount: 5000, index: 'NIFTY500 VALUE 50' },
      { day: 1, amount: 5000, index: 'NIFTY 50' },
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