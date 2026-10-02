const fs = require("fs");
const path = require("path");

const enableTls = process.env.DB_TLS_ENABLED === "true";

/**
 * Читает файл сертификата или приватного ключа по указанному пути.
 *
 * @param {string|undefined} filePath - путь к файлу; если не задан, возвращается null
 * @param {string} label - человекочитаемое название для сообщения об ошибке
 * @returns {string|null} - содержимое файла или null, если путь не задан
 * @throws {Error} - если путь задан, но файл недоступен для чтения
 */
const readTlsFile = (filePath, label) => {
  if (!filePath) {
    return null;
  }

  const resolvedPath = path.resolve(filePath);

  try {
    return fs.readFileSync(resolvedPath, "utf8");
  } catch (error) {
    throw new Error(
        `Failed to read ${label} from "${resolvedPath}": ${error.message}`
    );
  }
};

/**
 * Формирует конфигурацию TLS для пула подключений PostgreSQL.
 *
 * Согласно документации по TLS/mTLS в PostgreSQL, сертификаты выпускаются
 * через ЕСАУС/ЦУГИ. Для проверки подлинности сервера используется
 * корневой CA-сертификат. Для mTLS дополнительно предъявляются
 * клиентский сертификат и приватный ключ.
 *
 * Поддерживаемые переменные окружения:
 *   - DB_TLS_ENABLED: "true" для включения TLS (по умолчанию TLS выключен)
 *   - DB_TLS_CA_CERT_PATH: путь к корневому CA-сертификату для проверки
 *     подлинности сертификата сервера
 *   - DB_TLS_CLIENT_CERT_PATH: путь к клиентскому сертификату (для mTLS)
 *   - DB_TLS_CLIENT_KEY_PATH: путь к приватному ключу клиента (для mTLS)
 *   - DB_TLS_SERVERNAME: имя сервера для SNI и проверки hostname в сертификате
 *
 * @returns {false|Object} - конфигурация TLS для pg.Pool или false, если TLS выключен
 * @throws {Error} - при некорректной конфигурации (например, указан только
 *   один из пары DB_TLS_CLIENT_CERT_PATH/DB_TLS_CLIENT_KEY_PATH)
 */
const buildTlsConfig = () => {
  if (!enableTls) {
    return false;
  }

  const ca = readTlsFile(process.env.DB_TLS_CA_CERT_PATH, "CA certificate");
  const cert = readTlsFile(
      process.env.DB_TLS_CLIENT_CERT_PATH,
      "client certificate"
  );
  const key = readTlsFile(
      process.env.DB_TLS_CLIENT_KEY_PATH,
      "client private key"
  );

  // Для mTLS клиентский сертификат и ключ должны передаваться парой.
  // Это исключает запуск приложения в неконсистентной конфигурации.
  if ((cert && !key) || (!cert && key)) {
    throw new Error(
        "Both DB_TLS_CLIENT_CERT_PATH and DB_TLS_CLIENT_KEY_PATH must be provided together for mTLS"
    );
  }

  const sslConfig = {
    // Проверка подлинности сертификата сервера включена всегда,
    // когда TLS включён. Это соответствует требованиям документации
    // о защите от подмены сервера (MITM).
    rejectUnauthorized: true,
  };

  if (ca) {
    sslConfig.ca = ca;
  }

  if (cert) {
    sslConfig.cert = cert;
  }

  if (key) {
    sslConfig.key = key;
  }

  // SNI: имя сервера, которое передаётся в TLS-хендшейке.
  // Также используется Node.js для проверки hostname в сертификате сервера.
  // Требуется, когда подключение идёт по IP, а сертификат выпущен на FQDN.
  if (process.env.DB_TLS_SERVERNAME) {
    sslConfig.servername = process.env.DB_TLS_SERVERNAME;
  }

  return sslConfig;
};

module.exports = {
  poolConfig: {
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGSCHEMA,
    idleTimeoutMillis: parseInt(process.env.POOL_QUEUE_TIMEOUT) || 10000,
    max: parseInt(process.env.POOL_MAX) || 50,
    allowExitOnIdle: false,
    ssl: buildTlsConfig(),
  },
  retryConfig: {
    retries: parseInt(process.env.ATTEMPT) || 3,
  },
  callTimeout: parseInt(process.env.CALL_TIMEOUT) || 10 * 10000,
};
