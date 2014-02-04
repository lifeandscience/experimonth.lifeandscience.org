var mongoose = require('mongoose');

// Database
var db = process.env.MONGOHQ_URL || 'mongodb://localhost/experimonth';
module.exports = mongoose.connect(db);