const appRoot = require('app-root-path');
const winston = require('winston');
const process = require('process');

const { combine, timestamp, label, printf } = winston.format;

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const options = {
    file: {
        level: 'info',
        filename: `${appRoot}/logs/winston-test.log`,
        handleExceptions: true,
        json: false,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        colorize: false,
        format: combine(
            label({ label: 'winston-test' }),
            timestamp(),
            myFormat
        )
    },
    console: {
        level: 'debug',
        handleExceptions: true,
        json: false,
        colorize: true,
        format: combine(
            label({ label: 'api' }),
            timestamp(),
            myFormat
        )
    }
};

let logger = new winston.createLogger({
    transports: [
        // 중요! 위에서 선언한 option으로 로그 파일 관리 모듈 transport
        new winston.transports.File(options.file)
    ],
    exitOnError: false,
});

if (process.env.NODE_ENV != 'production') {
    logger.add(new winston.transports.Console(options.console))
}

logger.stream = {
    write: function(message, encoding) {
        // 단순히 message를 default 포맷으로 출력
        logger.info(message);
    }
};

module.exports = logger;
