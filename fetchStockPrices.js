const csvParser = require('csv-parser');
const fs = require('fs');
const axios = require('axios');
const csvWriter = require('csv-writer');

const FILE_PATH = 'stock_prices.csv';
const fetchIndexHistoryFromNSE = async (indexName = 'NIFTY200MOMENTM30', startDate, endDate) => {
  const response = await axios.post('https://www.niftyindices.com/Backpage.aspx/getHistoricaldatatabletoString', {
    name: indexName, startDate, endDate,
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

  // Parse the response and extract the stock prices
  if (response.status !== 200 || !response?.data?.d) {
    throw new Error('Failed to fetch stock prices from API');
  }

  const datesData = JSON.parse(response.data.d);
  const stockPrices = datesData.map(({ INDEX_NAME, CLOSE, HistoricalDate }) => {
    return {
      INDEX_NAME,
      PRICE: CLOSE,
      DATE: new Date(HistoricalDate).toISOString().slice(0, 10),
      // OPEN: dateData.OPEN,
      // HIGH: dateData.HIGH,
      // LOW: dateData.LOW,
    };
  });
  return stockPrices;
};

const saveStockPrices = async (stockPrices) => {
  // Store the stock prices in the CSV file
  const csvWriteInstance = csvWriter.createObjectCsvWriter({
    path: FILE_PATH,
    header: [
      { id: 'INDEX_NAME', title: 'Index Name' },
      { id: 'DATE', title: 'Date' },
      { id: 'PRICE', title: 'Price' }
    ],
    append: true
  });
  await csvWriteInstance.writeRecords(stockPrices);
};

const fetchStockPrices = async (indexName, startDate, endDate) => {
  // Check if stock prices are already available in the CSV file
  const results = [];
  const csvStream = fs.createReadStream(FILE_PATH)
    .pipe(csvParser())
    .on('data', (data) => {
      if (data.DATE >= startDate && data.DATE <= endDate) {
        results.push(data);
      }
    })
    .on('end', async () => {
      if (results.length > 0) {
        console.log('Stock prices found in CSV file:', results[0].prices);
        return;
      }
      // If stock prices are not available in the CSV file, fetch them from the API
      const stockPrices = await fetchIndexHistoryFromNSE(indexName, startDate, endDate);
      await saveStockPrices(stockPrices);
      console.log('Stock prices fetched from API:', stockPrices);
      results.push(...stockPrices);
      return;
    });
  return results;;
};

module.exports = { fetchStockPrices, };