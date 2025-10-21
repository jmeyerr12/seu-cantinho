"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
// db.ts
var pg_1 = require("pg");
exports.pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
