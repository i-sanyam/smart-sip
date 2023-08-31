// const SIP_DETAILS = [
// 	// { day: 1, amount: 10000, index: 'NIFTY200MOMENTM30' }, // data complete
// 	// { day: 1, amount: 10000, index: 'NIFTY500 VALUE 50' }, // data complete
// 	// { day: 1, amount: 10000, index: 'NIFTY50 VALUE 20' },

// 	// { day: 1, amount: 10000, index: 'NIFTY 50' }, // data complete
// 	// { day: 1, amount: 10000, index: 'NIFTY NEXT 50' }, // data complete

// 	{ day: 1, amount: 10000, index: 'NIFTY MIDCAP 150' },
// 	// { day: 1, amount: 10000, index: 'NIFTY MIDCAP 100' },
// 	// { day: 1, amount: 10000, index: 'NIFTY MIDCAP 50' },
// 	// { day: 1, amount: 10000, index: 'NIFTY M150 QLTY50' },
// 	// { day: 1, amount: 10000, index: 'NIFTY MID SELECT' },

// 	// { day: 1, amount: 10000, index: 'NIFTY SMLCAP 50' },
// 	// { day: 1, amount: 10000, index: 'NIFTY SMLCAP 250' }, // data complete

// 	// { day: 1, amount: 10000, index: 'NIFTY LARGEMID250' }, // data complete
// ];

const completeDataIndices = [
  'NIFTY 50',
  'NIFTY NEXT 50',
  'NIFTY200MOMENTM30',
  'NIFTY500 VALUE 50',
  'NIFTY LARGEMID250',
  'NIFTY SMLCAP 250'
];

const MONTHLY_INVESTMENT = 18000;

const allSipCombinationsToTry = [];
for (let MONTHLY_INVESTMENT_DATE = 1; MONTHLY_INVESTMENT_DATE <= 28; MONTHLY_INVESTMENT_DATE++) {
  for (let i = 0; i < completeDataIndices.length; i++) {
    // single index combinations
    allSipCombinationsToTry.push([
      { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 1, index: completeDataIndices[i] }
    ]);
    for (let j = i + 1; j < completeDataIndices.length; j++) {
      // two index combinations
      allSipCombinationsToTry.push([
        { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 2, index: completeDataIndices[i] },
        { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 2, index: completeDataIndices[j] },
      ]);
      for (let k = j + 1; k < completeDataIndices.length; k++) {
        // three index combinations
        allSipCombinationsToTry.push([
          { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 3, index: completeDataIndices[i] },
          { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 3, index: completeDataIndices[j] },
          { day: MONTHLY_INVESTMENT_DATE, amount: MONTHLY_INVESTMENT / 3, index: completeDataIndices[k] },
        ]);
        for (let l = k + 1; l < completeDataIndices.length; l++) {
          // four index combinations
          allSipCombinationsToTry.push([
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

module.exports = { allSipCombinationsToTry, };