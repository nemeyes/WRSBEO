const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tb_containers', {
    seq: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    uuid: {
      type: DataTypes.STRING(300),
      allowNull: false
    },
    fk_coordinator_uuid: {
      type: DataTypes.STRING(300),
      allowNull: false
    },
    fk_client_uuid: {
      type: DataTypes.STRING(300),
      allowNull: false
    },
    coordinator_port_num: {
      type: DataTypes.MEDIUMINT.UNSIGNED,
      allowNull: false
    },
    video_codec: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    audio_codec: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    video_width: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    video_height: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    released_yn: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    },
    released_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('current_timestamp')
    }
  }, {
    sequelize,
    tableName: 'tb_containers',
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
