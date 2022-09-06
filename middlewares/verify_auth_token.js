const rootPath = require("app-root-path");
const config = require(`${rootPath}/envs/.${
  process.env.NODE_ENV || "development"
}`);

// sequelize
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require(`${rootPath}/models`);
const models = db.models;

// middlewares
const jwt = require(`${rootPath}/utils/jwt`);
const rTracer = require("cls-rtracer");

// package libs
const dayjs = require("dayjs");
dayjs.extend(require("dayjs/plugin/utc"));
dayjs.extend(require("dayjs/plugin/timezone"));

// // response format
// const ResData = require(`${rootPath}/middlewares/ResData`);
//
// // types (ENUM)
// const Errors = require(`${rootPath}/types/Errors`);

// logger
const logger = require(`${rootPath}/config/winston`)("JWT");

module.exports = async function (uuidToken) {

  // not token, error...
  if (!uuidToken) {
    const err = {
      reqID: rTracer.id(),
      errUrl: req.originalUrl,
      message: 'UUID 값이 존재하지 않습니다.',
      code: 'fail',
      user_seq: req.user ? req.user.seq : 0,
      queryParams: req.query,
      bodyParams: req.body,
    };
    logger.error(JSON.stringify(err));

    // const resData = {
    //   code: 'fail',
    //   message: 'UUID 값이 존재하지 않습니다.',
    // };
    // return res.status(200).send(resData);
    return false;
  }

  try {
    const verified = jwt.verify(uuidToken);
    // if (!verified.ok) {
    //   // const err = {
    //   //   reqID: rTracer.id(),
    //   //   errUrl: req.originalUrl,
    //   //   message: 'UUID 가 올바르지 않습니다.',
    //   //   code: 'fail',
    //   //   user_seq: req.user ? req.user.seq : 0,
    //   //   queryParams: req.query,
    //   //   bodyParams: req.body,
    //   // };
    //   // logger.error(JSON.stringify(err));
    //   //
    //   // const resData = {
    //   //   code: 'fail',
    //   //   message: 'UUID 가 올바르지 않습니다.'
    //   // }
    //   // return res.status(200).send(resData);
    //   return false;
    // }

    logger.debug(`Verified Token: ${verified.token}`);
    logger.debug(`user_seq in Token: ${verified.seq}`);
    logger.debug(
      `iat in Token: ${verified.iat}, ${dayjs("1970-01-01")
        .add(verified.iat, "second")
        .format("YYYY-MM-DD HH:MM:SS")}`
    );
    logger.debug(
      `expire in Token: ${verified.exp}, ${dayjs("1970-01-01")
        .add(verified.exp, "second")
        .format("YYYY-MM-DD HH:MM:SS")}`
    );

    // token의 DB검증이 아닌, token자체가 유효하다면 token의 user_seq로 검증
    // const userByToken = await models.tb_users.findOne({
    //     include: [
    //         {
    //             model: models.tb_roles,
    //             as: "role",
    //             required: true
    //         }
    //     ],
    //     where: {
    //         seq: verified.seq,
    //         status: {[Op.in]: ['ACTIVE', 'STANDBY']}
    //     }
    // });
    // if (!userByToken) {
    //     const err = {
    //         reqID: rTracer.id(),
    //         errUrl: req.originalUrl,
    //         message: Errors.NOT_CORRECT_TOKEN.MSG,
    //         code: Errors.NOT_CORRECT_TOKEN.CODE,
    //         params: req.query
    //     };
    //     logger.error(JSON.stringify(err));
    //
    //     const resData = new ResData(null, false, err, null);
    //     return res.status(Errors.NOT_CORRECT_TOKEN.HTTP_CODE).send(resData);
    // }

    // req.data = {};
    // req.user = verified;
    // // req.user.token = verified;
    //
    // next();
    return verified;
  } catch (error) {
    logger.error(error);

    // const resData = new ResData(null, false, error, null);
    // res.status(500).send(resData);
    return false;
  }
};
