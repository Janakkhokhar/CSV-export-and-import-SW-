const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1/CSVExportimport");

const db = mongoose.connection;

db.once('open', (err) => {
    err ? console.log("db not connect") : console.log("db is connect");
})


module.exports = db;