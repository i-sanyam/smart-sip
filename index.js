const START_DATE = '2021-01-01';
const END_DATE = '2021-05-01';
const SIP_DETAILS = [
  { day: 1, amount: 5000, index: 'NIFTY200MOMENTM30' },
];

const INVESTMENT_DETAILS_FILE_PATH = 'investment_details.csv';

const lodash = require('lodash');
const { fetchStockPrices } = require('./fetchStockPrices');
const csvHelper = require('./csvHelper');

const getIndexToMonthStockPricesMap = async (indexes, date) => {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const startDate = new Date(currentYear, currentMonth, 1).toISOString().slice(0, 10);
  const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10);
  const indexToStockPricesMap = {};
  for (const index of indexesToFetch) {
    const stockPrices = await fetchStockPrices(index, startDate, endDate);
    indexToStockPricesMap[index] = stockPrices;
  }
  return indexToStockPricesMap;
};

const getStockPriceFromMap = (stockPricesArray, date) => {
  const stockPrice = stockPricesArray.find(stockPrice => stockPrice.DATE === date);
  if (!stockPrice) {
    throw new Error(`Stock price not found for date: ${date}`);
  }
  return stockPrice;
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
    { id: 'TODAY_PRICE', title: 'Price' },
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
  const indexesToFetch = lodash.uniq(investmentPattern.map(({ index }) => index));
  const indexToReturnsFileMap = await generateReturnFilesMap(indexesToFetch);

  const investedMap = {};

  while (currentDate <= endDate) {
    const indexToStockPricesMap = await getIndexToMonthStockPricesMap(indexesToFetch, currentDate);
    // calculate returns until now
    const firstDateMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().slice(0, 10);
    let totalGainAtEOM = 0;
    let totalInvestedAtEOM = 0;
    for (const index of indexesToFetch) {
      const indexInvestmentDetails = investedMap[index];
      if (!indexInvestmentDetails) {
        continue;
      }
      const { amount, units, } = indexInvestmentDetails;
      const todayStockPrice = getStockPriceFromMap(indexToStockPricesMap[index], firstDateMonth);
      const gainAmount = (units * todayPrice) - amount;
      const gainPercentage = (gainAmount / amount) * 100;

      totalGainAtEOM += gainAmount;
      totalInvestedAtEOM += amount;

      await csvHelper.write(indexToReturnsFileMap[index], [
        { 
          INDEX_NAME: index,
          DATE: firstDateMonth,
          TODAY_PRICE: todayStockPrice.PRICE,
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
        TODAY_PRICE: 'Not Valid',
        UNITS: 'Not Valid',
        INVESTED_AMOUNT: totalInvestedAtEOM,
        GAIN: totalGainAtEOM,
        GAIN_PERCENTAGE: 100 * (totalGainAtEOM / totalInvestedAtEOM),
      }
    ]);
    
    // make sips for month
    for (const { index, day, amount, } of sipDetails) {
      const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = thisDate.toISOString().slice(0, 10);

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
};

generateInvestmentPattern(START_DATE, END_DATE, SIP_DETAILS);