const { Pool } = require("pg");
require("dotenv").config();

const poolDb1 = new Pool({
  user: process.env.USERNAME_POSTGRESQL,

  host: "localhost",
  database: "database1",
  password: process.env.PASSWORD_POSTGRESQL,
  port: process.env.PORT_POSTGRESQL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
