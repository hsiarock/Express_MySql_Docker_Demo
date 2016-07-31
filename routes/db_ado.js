var express = require('express');
var router = express.Router();
var mysql = require('mysql'); // dhsia added
var db ;

var db_conn = function() {

   var connection = mysql.createConnection({
      host     : '172.17.0.2',
      user     : 'david',
      password : '12345678',
      database : 'kphdb'
    });

    connection.connect();

    db = connection ;

    console.log("Open MySql DB successfully");
 
    return db;
} ;

/* Render /db_ado template */
router.get('/', function(req, res, next) {
  res.render('db_ado', { title: 'My DB ADO' });
});

/* Render /db_ado/quotes template, after submit the query */
router.post('/quotes', function(req, res, next) {

  var msg = "Result : " ;

  db.query('SELECT * from kphdb.restaurants where trim(borough) = "Brooklyn"', function(err, results, fields) {
         if (err) throw err;
         //console.log(results);
         res.render('ado_table', { items: results} );
  });
});

module.exports = router;
module.exports.db_conn = db_conn ;
