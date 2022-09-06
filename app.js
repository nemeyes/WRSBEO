const rootPath = require("app-root-path");
const config = require(`${rootPath}/envs/.${
    process.env.NODE_ENV || "development"
}`);

const createError = require("http-errors");
const express = require("express");
const asyncify = require("express-asyncify");
const app = asyncify(express());

// middlewares
const ResData = require(`${rootPath}/middlewares/ResData`);
const rTracer = require("cls-rtracer");
const useragent = require("express-useragent");
const cors = require("cors");
const url = require("url");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

// swagger
const swaggerUi = require("swagger-ui-express");

// sequelize
const db = require(`${rootPath}/models`);

// utils
const Slack = require("slack-node");
const slack = new Slack(config.slack.oAuthToken);

// logger
const logger = require(`${rootPath}/config/winston`)("api-server");

// app.use
app.use(cors());
app.use(useragent.express());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(bodyParser);
// app.use(cookieParser());
app.use(rTracer.expressMiddleware());


// routes
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(require(`${rootPath}/config/swagger`))
);
app.use("/", require(`./routes/index`));
app.use('/api/coordinators', require('./routes/wrs'));
app.use('/api/containers', require('./routes/containers'));


// 서버 실행시마다 정의된 sequelize model들로 DB Table을 초기화 할지 결정
const node_env = `${process.env.NODE_ENV || "development"}`;
if (node_env === "local" || node_env === "development") {
    db.sequelize
        .sync({ force: config.database.sequelize.resync.force })
        .then(() => {
            logger.info("Sequelize DB 접속 성공");
        })
        .catch((error) => {
            logger.error(`Sequelize DB 접속 실패!: ${error}`);
        });
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    const uuid = req.body.uuid || 'undefied';
    const access_ip =
        req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const uri =
        req.originalUrl.indexOf("?") > 0
            ? req.originalUrl.substr(0, req.originalUrl.indexOf("?"))
            : req.originalUrl;
    const reqUserAgent = req.useragent;
    const userAgent = {
        os: reqUserAgent.os,
        platform: reqUserAgent.platform,
        browser: reqUserAgent.browser,
        browser_version: reqUserAgent.version,
        isMobile: reqUserAgent.isMobile,
        isDesktop: reqUserAgent.isDesktop,
    };
    // const accessToken =
    //     req.header(config["jwt"]["auth_token"]["token_storage_name"]) ||
    //     req.cookies.auth_token;
    const queryParams = url.parse(req.url, true).query;
    const bodyParams = req.body;
    const message = {
        err: err.message,
        ip: access_ip,
        userAgent: userAgent,
        // token: accessToken,
        uuid: uuid,
        uri: uri,
        queryParams: queryParams,
        bodyParams: bodyParams,
    };
    logger.error(`${JSON.stringify(message, null, 2)}`);

    // message to slack
    slack.setWebhook(config.slack.webhookUrl);
    slack.webhook(
        {
            channel: config.slack.channel, // 현 슬랙의 채널
            username: config.slack.username, // 슬랙에서 보여질 웹훅 이름
            text: JSON.stringify(message, null, 2),
        },
        function (err, response) {
            if (response.statusCode !== 200) logger.error(response);
        }
    );

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "local" || req.app.get("env") === "development" ? err : {};

    // render the error page
    const resData = new ResData(null, false, err, null);
    res.status(err.status || 500).send(resData);
    // res.render('error');

    // next();
});

module.exports = app;
