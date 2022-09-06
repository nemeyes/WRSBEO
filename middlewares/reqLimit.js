const rootPath = require('app-root-path');
const RateLimit = require('express-rate-limit');
const ResData = require(`${rootPath}/middlewares/ResData`);

// windowMs(기준 시간), max(허용횟수), delayMs(호출 간격), handler(제한 초과 시 콜백 함수)
exports.apiLimiter = RateLimit({
    windowMs: 60 * 1000, // 1분
    max: 100, // 100번
    // delayMs: 1000, // 1초
    handler(req, res) {
        const resData = new ResData(null, false, '', null);
        return res.status(this.statusCode).json({
            code: this.statusCode,
            message: '요청이 너무 많습니다'
        });
    }
});

// deprecated
exports.deprecated = function(req, res) {
    const resData = new ResData(null, false, '새로운 버전이 나왔습니다. 새로운 버전을 사용하세요.', null);
    return res.status(410).send(resData);
};

