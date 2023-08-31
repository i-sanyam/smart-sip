const csvWriter = require('csv-writer');
const csvParser = require('csv-parser');
const fs = require('fs');

const initialise = async (filePath, { header, append = true, }) => {
	return csvWriter.createObjectCsvWriter({
		path: filePath,
		header,
		append,
	});
};

const write = async (instance, records) => {
	await instance.writeRecords(records);
};

const readFromCSV = async (filePathToUse, filterFunction) => {
	const results = await new Promise((resolve) => {
		const fileExists = fs.existsSync(filePathToUse);
		if (!fileExists) {
			return resolve([]);
		}
		const records = [];
		fs.createReadStream(filePathToUse)
			.pipe(csvParser())
			.on('data', (data) => {
				if (filterFunction) {
					const toPush = filterFunction(data);
					if (toPush) {
						records.push(data);
					}
				} else {
					records.push(data);
				}
			})
			.on('end', () => {
				return resolve(records);
			});
	});
	return results;
};


module.exports = {
	initialise, write, readFromCSV,
}