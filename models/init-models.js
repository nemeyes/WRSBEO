var DataTypes = require("sequelize").DataTypes;
var _tb_api_histories = require("./tb_api_histories");
var _tb_containers = require("./tb_containers");
var _tb_coordinators = require("./tb_coordinators");

function initModels(sequelize) {
  var tb_api_histories = _tb_api_histories(sequelize, DataTypes);
  var tb_containers = _tb_containers(sequelize, DataTypes);
  var tb_coordinators = _tb_coordinators(sequelize, DataTypes);


  return {
    tb_api_histories,
    tb_containers,
    tb_coordinators,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
