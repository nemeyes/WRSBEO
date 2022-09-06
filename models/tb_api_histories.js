const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tb_api_histories', {
    seq: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    method: {
      type: DataTypes.ENUM('POST','DELETE','GET','PATCH','PUT'),
      allowNull: false
    },
    api_url: {
      type: DataTypes.STRING(300),
      allowNull: false
    },
    user_os: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    user_platform: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    user_browser: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    user_version: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    request_headers: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    body_params: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    response_data: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('current_timestamp')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  }, {
    sequelize,
    tableName: 'tb_api_histories',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "seq" },
        ]
      },
    ]
  });
};
