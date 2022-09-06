const winston = require('winston');
const winstonDaily = require('winston-daily-rotate-file');
const rootPath = require('app-root-path');
const fs = require("fs")
const {level} = require("winston");
const rTracer = require('cls-rtracer');

const logDir = `${rootPath}/logs`;
const { combine, timestamp, printf, label } = winston.format;
const colorize = winston.format.colorize();

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir)
}

// 기본설정을 사용하면 로그레벨만 색상이 적용되어 출력되는 로그를 재정의하였다.
// Define log format
const logFormat = printf(({ level, message, label, timestamp }) => {
    const rid = rTracer.id();
    if(rid) {
        return `${colorize.colorize(level, `[${timestamp}] [request-id: ${rid}] [${level.toUpperCase()}] ${label ? label : 'default'}: `)} ${message}`;
    } else {
        return `${colorize.colorize(level, `[${timestamp}] [${level.toUpperCase()}] ${label ? label : 'default'}: `)} ${message}`;
    }
});

/**
 * winston 로그 사용
 * @param path{string}: label
 * @returns {Logger}
 */
const getLogger = (path) => {
    /**
     * Log Level
     * error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
     */
    const logger = winston.createLogger({
        format: combine(
            label({ label: path }), // 로그 출력시 라벨링 설정
            timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            logFormat,
        ),
        transports: [
            // info 레벨
            new winstonDaily({
                level: 'info',
                datePattern: 'YYYY-MM-DD',
                dirname: logDir,
                filename: `%DATE%.info.log`,
                maxFiles: 30, // 30일치 로그만 저장
                zippedArchive: true
            }),
            // error 레벨
            new winstonDaily({
                level: 'error',
                datePattern: 'YYYY-MM-DD',
                dirname: logDir,
                filename: `%DATE%.error.log`,
                maxFiles: 30, // 30일치 로그만 저장
                zippedArchive: true
            })
        ]
    });

    // /**
    //  * http log
    //  */
    // const httpLogger = winston.createLogger({
    //     format: combine(
    //         label({ label: 'http' }),
    //         timestamp({
    //             format: 'YYYY-MM-DD HH:mm:ss.SSS',
    //         }),
    //         logFormat,
    //     ),
    //     transports: [
    //         // info
    //         new winstonDaily({
    //             level: 'info',
    //             datePattern: 'YYYY-MM-DD',
    //             dirname: logDir,
    //             filename: `%DATE%.http-info.log`,
    //             maxFiles: 30,  // 30일치 로그 파일 저장
    //             zippedArchive: true,
    //         }),
    //
    //         // error
    //         new winstonDaily({
    //             level: 'error',
    //             datePattern: 'YYYY-MM-DD',
    //             dirname: logDir,
    //             filename: `%DATE%.http-error.log`,
    //             maxFiles: 30,  // 30일치 로그 파일 저장
    //             zippedArchive: true,
    //         })
    //     ]
    // });
    //
    // logger.stream = {
    //     write: (message, encoding) => {
    //         httpLogger.info(message);
    //     }
    // };

    // Production 환경이 아닌 경우(dev 등) - Console 로그 출력
    if (process.env.NODE_ENV !== 'production') {
        logger.add(new winston.transports.Console({
            // // handleExceptions: true,
            // // json: false,
            // format: combine(
            //     label({ label: path }),
            //     timestamp(),
            //     logFormat,
            //     // `${info.level}: ${info.message} JSON.stringify({ ...rest })` 포맷으로 출력
            //     // winston.format.simple(),
            // )
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }));
    }

    return logger;
}

module.exports = getLogger;
