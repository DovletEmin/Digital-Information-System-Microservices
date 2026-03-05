const winston = require('winston');
const { Writable } = require('stream');

describe('Logger', () => {
  let logger;
  let logs = [];

  beforeEach(() => {
    logs = [];

    const writeStream = new Writable({
      write(chunk, encoding, callback) {
        logs.push(JSON.parse(chunk.toString()));
        callback();
      }
    });

    logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Stream({ stream: writeStream })
      ]
    });
  });

  test('should log info messages', () => {
    logger.info('Test info message', { extra: 'data' });
    
    expect(logs).toHaveLength(1);
    expect(logs[0]).toHaveProperty('level', 'info');
    expect(logs[0]).toHaveProperty('message', 'Test info message');
    expect(logs[0]).toHaveProperty('extra', 'data');
  });

  test('should log error messages', () => {
    logger.error('Test error message', { error: 'details' });
    
    expect(logs).toHaveLength(1);
    expect(logs[0]).toHaveProperty('level', 'error');
    expect(logs[0]).toHaveProperty('message', 'Test error message');
  });

  test('should log warn messages', () => {
    logger.warn('Test warning');
    
    expect(logs).toHaveLength(1);
    expect(logs[0]).toHaveProperty('level', 'warn');
  });

  test('should not log debug when level is info', () => {
    logger.debug('This should not appear');
    
    expect(logs).toHaveLength(0);
  });
});
