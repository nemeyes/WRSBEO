const rootPath = require("app-root-path");

// dayjs
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

// logger
const logger = require(`${rootPath}/config/winston`)('RESPONSE_DATA');


module.exports = function(data, isSuccess, err, paging) {

    const error = {};
    if (err) {
        error.reqID = err.reqID;
        error.errUrl = err.errUrl;
        error.user_seq = err.user_seq;
        error.errMsgs = [];
        error.errCodes = [];
        error.queryParams = err.queryParams;
        error.bodyParams = err.bodyParams;

        if (err.errors) {
            err.errors.forEach(function (item, index, arr2) {
                error.errMsgs.push(item.message);
                error.errCodes.push(item.errCode);
            });
        }
        if (err.message) {
            error.errMsgs.push(err.message.message || err.message);
        }
        if (err.messages) {
            err.messages.forEach(function (item, index, arr2) {
                error.errMsgs.push(item);
            });
        }

        if (err.code) {
            error.errCodes.push(err.code);
        }
        if (err.codes) {
            err.codes.forEach(function (item, index, arr2) {
                error.errCodes.push(item);
            });
        }
    }
    logger.error(`error = ${JSON.stringify(error)}`);

    const resData = {
        data: data,
        error: error,
        paging: paging,
    };

    return resData;
};
