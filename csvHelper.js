const csvWriter = require('csv-writer');

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


module.exports = {
  initialise, write,
}