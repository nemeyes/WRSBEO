var express = require('express');
var router = express.Router();
const fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
  return res.status(200).send({data: 'OK'});
});


router.get('/loaderio-3b78de2d7f298ffa92c324a033ba9b1e', function(req, res, next) {
  const txt = fs.readFileSync(__dirname + '/../loaderio-3b78de2d7f298ffa92c324a033ba9b1e.txt', 'utf8');
  return res.send(txt);
});

module.exports = router;
