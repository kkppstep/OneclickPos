require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/pos',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
};
