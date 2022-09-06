const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tb_coordinators', {
    seq: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    uuid: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
      unique: true
    },
    ip: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    domain: {
      type: DataTypes.STRING(300),
      allowNull: false
    },
    port_num: {
      type: DataTypes.MEDIUMINT.UNSIGNED,
      allowNull: false
    },
    available_containers: {
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    deleted_yn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('current_timestamp')
    },
    last_alive_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tb_coordinators',
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
