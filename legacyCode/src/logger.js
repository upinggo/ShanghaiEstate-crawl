const winston = require('winston');
const path = require('path');

// Create logs directory
const logDir = './logs';

// Define custom log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
};

// Define custom colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

winston.addColors(colors);

// Create the logger
const logger = winston.createLogger({
    level: 'info',
    levels,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ all: true }),
                winston.format.simple()
            )
        }),
        
        // Write all logs to file
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: '20m',
            maxFiles: '14d'
        }),
        
        // Write error logs to separate file
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: '20m',
            maxFiles: '30d'
        })
    ]
});

// Handle uncaught exceptions
logger.exceptions.handle(
    new winston.transports.File({
        filename: path.join(logDir, 'exceptions.log')
    })
);

// Handle unhandled rejections
logger.rejections.handle(
    new winston.transports.File({
        filename: path.join(logDir, 'rejections.log')
    })
);

// Add stream for morgan (HTTP logging)
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

module.exports = logger;