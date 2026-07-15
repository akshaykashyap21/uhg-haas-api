import winston from 'winston';

export interface LoggerOptions {
  serviceName: string;
  level?: string;
  nodeEnv?: string;
}

export function createLogger(options: LoggerOptions): winston.Logger {
  const { serviceName, level = 'info', nodeEnv = 'development' } = options;
  const isProd = nodeEnv === 'production' || nodeEnv === 'staging';

  const formats = [
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  ];

  if (!isProd) {
    formats.push(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level: lvl, message, label, stack, metadata }) => {
        const meta = metadata && Object.keys(metadata as object).length
          ? ` ${JSON.stringify(metadata)}`
          : '';
        const stackInfo = stack ? `\n${stack}` : '';
        return `${timestamp} [${label || serviceName}] ${lvl}: ${message}${meta}${stackInfo}`;
      }),
    );
  } else {
    formats.push(winston.format.json());
  }

  return winston.createLogger({
    level,
    defaultMeta: { service: serviceName },
    format: winston.format.combine(...formats),
    transports: [new winston.transports.Console()],
    exitOnError: false,
  });
}
