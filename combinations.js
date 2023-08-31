const { indexArrayToFetch, specialStartDates, } = require('./indexMapping');

const MONTHLY_INVESTMENT = 18000;

const getAllCombinations = (completeDataIndices) => {
  const toRetCombinationsArray = [];
  const startDate = 1, endDate = 1;
  for (let MONTHLY_INVESTMENT_DATE = startDate; MONTHLY_INVESTMENT_DATE <= endDate; MONTHLY_INVESTMENT_DATE++) {
    for (let i = 0; i < completeDataIndices.length; i++) {
      // single index combinations
      toRetCombinationsArray.push([
        { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 1, index: completeDataIndices[i] }
      ]);
      for (let j = i + 1; j < completeDataIndices.length; j++) {
        // two index combinations
        toRetCombinationsArray.push([
          { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 2, index: completeDataIndices[i] },
          { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 2, index: completeDataIndices[j] },
        ]);
        for (let k = j + 1; k < completeDataIndices.length; k++) {
          // three index combinations
          toRetCombinationsArray.push([
            { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 3, index: completeDataIndices[i] },
            { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 3, index: completeDataIndices[j] },
            { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 3, index: completeDataIndices[k] },
          ]);
          for (let l = k + 1; l < completeDataIndices.length; l++) {
            // four index combinations
            toRetCombinationsArray.push([
              { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 4, index: completeDataIndices[i] },
              { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 4, index: completeDataIndices[j] },
              { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 4, index: completeDataIndices[k] },
              { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 4, index: completeDataIndices[l] },
            ]);
          }
        }
      }
    };
  }
  return toRetCombinationsArray;
};

// const allSipCombinationsToTry = [1,1,1,1,1,1];
const allSipCombinationsToTry = getAllCombinations(indexArrayToFetch);

const sipsForInitialize = indexArrayToFetch.map((index) => {
  const sipToReturn = { day: 1, amount: MONTHLY_INVESTMENT, index, };
  if (specialStartDates[index]) {
    sipToReturn.startDate = specialStartDates[index];
  }
  return sipToReturn;
});

module.exports = { allSipCombinationsToTry, sipsForInitialize, };