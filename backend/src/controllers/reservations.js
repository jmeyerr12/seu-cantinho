"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.byDay = exports.listPaymentsOfReservation = exports.cancelReservation = exports.confirmReservation = exports.updateReservation = exports.createReservation = exports.getReservation = exports.listReservations = void 0;
var db_js_1 = require("../config/db.js");
var uuid_1 = require("uuid");
/* utils */
var parseTime = function (t) {
    var _a = t.split(':').map(Number), h = _a[0], m = _a[1];
    return h * 60 + (m || 0);
};
var durationHours = function (start, end) { return Math.max(0, (parseTime(end) - parseTime(start)) / 60); };
/* list & get */
var listReservations = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, branchId, spaceId, customerId, status, date, filters, params, where, sql, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, branchId = _a.branchId, spaceId = _a.spaceId, customerId = _a.customerId, status = _a.status, date = _a.date;
                filters = [];
                params = [];
                if (branchId) {
                    params.push(branchId);
                    filters.push("branch_id = $".concat(params.length));
                }
                if (spaceId) {
                    params.push(spaceId);
                    filters.push("space_id = $".concat(params.length));
                }
                if (customerId) {
                    params.push(customerId);
                    filters.push("customer_id = $".concat(params.length));
                }
                if (status) {
                    params.push(status);
                    filters.push("status = $".concat(params.length));
                }
                if (date) {
                    params.push(date);
                    filters.push("date = $".concat(params.length));
                }
                where = filters.length ? "WHERE ".concat(filters.join(' AND ')) : '';
                sql = "\n    SELECT r.*, u.name AS customer_name, s.name AS space_name, b.name AS branch_name\n    FROM reservations r\n    JOIN users u ON u.id = r.customer_id\n    JOIN spaces s ON s.id = r.space_id\n    JOIN branches b ON b.id = r.branch_id\n    ".concat(where, "\n    ORDER BY r.date DESC, r.start_time DESC\n  ");
                return [4 /*yield*/, db_js_1.pool.query(sql, params)];
            case 1:
                rows = (_b.sent()).rows;
                res.json(rows);
                return [2 /*return*/];
        }
    });
}); };
exports.listReservations = listReservations;
var getReservation = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, sql, rows, pays;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                sql = "\n    SELECT r.*, u.name AS customer_name, s.name AS space_name, b.name AS branch_name\n    FROM reservations r\n    JOIN users u ON u.id = r.customer_id\n    JOIN spaces s ON s.id = r.space_id\n    JOIN branches b ON b.id = r.branch_id\n    WHERE r.id = $1\n  ";
                return [4 /*yield*/, db_js_1.pool.query(sql, [id])];
            case 1:
                rows = (_a.sent()).rows;
                if (!rows[0])
                    return [2 /*return*/, res.status(404).json({ error: 'reservation not found' })];
                return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM payments WHERE reservation_id = $1 ORDER BY created_at ASC', [id])];
            case 2:
                pays = _a.sent();
                res.json(__assign(__assign({}, rows[0]), { payments: pays.rows }));
                return [2 /*return*/];
        }
    });
}); };
exports.getReservation = getReservation;
/* create */
var createReservation = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, space_id, branch_id, customer_id, date, start_time, end_time, _b, deposit_required_pct, notes, conflictSql, conflict, space, hours, total, id, sql, rows;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, space_id = _a.space_id, branch_id = _a.branch_id, customer_id = _a.customer_id, date = _a.date, start_time = _a.start_time, end_time = _a.end_time, _b = _a.deposit_required_pct, deposit_required_pct = _b === void 0 ? 0 : _b, notes = _a.notes;
                conflictSql = "\n    SELECT 1 FROM reservations\n    WHERE space_id = $1 AND date = $2 AND status <> 'CANCELLED'\n      AND NOT (end_time <= $3::time OR start_time >= $4::time)\n    LIMIT 1\n  ";
                return [4 /*yield*/, db_js_1.pool.query(conflictSql, [space_id, date, start_time, end_time])];
            case 1:
                conflict = _c.sent();
                if (conflict.rowCount)
                    return [2 /*return*/, res.status(409).json({ error: 'time slot unavailable' })];
                return [4 /*yield*/, db_js_1.pool.query('SELECT base_price_per_hour FROM spaces WHERE id = $1', [space_id])];
            case 2:
                space = _c.sent();
                if (!space.rows[0])
                    return [2 /*return*/, res.status(400).json({ error: 'invalid space' })];
                hours = durationHours(start_time, end_time);
                total = Number(space.rows[0].base_price_per_hour) * hours;
                id = (0, uuid_1.v4)();
                sql = "\n    INSERT INTO reservations\n      (id, space_id, branch_id, customer_id, date, start_time, end_time,\n       status, total_amount, deposit_required_pct, notes)\n    VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',$8,$9,$10)\n  ";
                return [4 /*yield*/, db_js_1.pool.query(sql, [
                        id, space_id, branch_id, customer_id, date, start_time, end_time,
                        total, deposit_required_pct,
                        notes !== null && notes !== void 0 ? notes : null
                    ])];
            case 3:
                _c.sent();
                return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM reservations WHERE id = $1', [id])];
            case 4:
                rows = (_c.sent()).rows;
                res.status(201).json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.createReservation = createReservation;
/* update schedule/notes (revalida conflito) */
var updateReservation = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, date, start_time, end_time, notes, deposit_required_pct, rows, spaceId, conflictSql, conflict, out;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.body, date = _a.date, start_time = _a.start_time, end_time = _a.end_time, notes = _a.notes, deposit_required_pct = _a.deposit_required_pct;
                if (!(date && start_time && end_time)) return [3 /*break*/, 3];
                return [4 /*yield*/, db_js_1.pool.query('SELECT space_id FROM reservations WHERE id = $1', [id])];
            case 1:
                rows = (_b.sent()).rows;
                if (!rows[0])
                    return [2 /*return*/, res.status(404).json({ error: 'reservation not found' })];
                spaceId = rows[0].space_id;
                conflictSql = "\n      SELECT 1 FROM reservations\n      WHERE space_id = $1 AND date = $2 AND status <> 'CANCELLED' AND id <> $5\n        AND NOT (end_time <= $3::time OR start_time >= $4::time)\n      LIMIT 1\n    ";
                return [4 /*yield*/, db_js_1.pool.query(conflictSql, [spaceId, date, start_time, end_time, id])];
            case 2:
                conflict = _b.sent();
                if (conflict.rowCount)
                    return [2 /*return*/, res.status(409).json({ error: 'time slot unavailable' })];
                _b.label = 3;
            case 3: return [4 /*yield*/, db_js_1.pool.query("UPDATE reservations SET\n      date = COALESCE($2,date),\n      start_time = COALESCE($3,start_time),\n      end_time = COALESCE($4,end_time),\n      notes = COALESCE($5,notes),\n      deposit_required_pct = COALESCE($6,deposit_required_pct),\n      updated_at = NOW()\n     WHERE id = $1", [id, date !== null && date !== void 0 ? date : null, start_time !== null && start_time !== void 0 ? start_time : null, end_time !== null && end_time !== void 0 ? end_time : null, notes !== null && notes !== void 0 ? notes : null, deposit_required_pct !== null && deposit_required_pct !== void 0 ? deposit_required_pct : null])];
            case 4:
                _b.sent();
                return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM reservations WHERE id = $1', [id])];
            case 5:
                out = (_b.sent()).rows;
                if (!out[0])
                    return [2 /*return*/, res.status(404).json({ error: 'reservation not found' })];
                res.json(out[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.updateReservation = updateReservation;
var confirmReservation = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                return [4 /*yield*/, db_js_1.pool.query("UPDATE reservations SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1", [id])];
            case 1:
                _a.sent();
                return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM reservations WHERE id = $1', [id])];
            case 2:
                rows = (_a.sent()).rows;
                if (!rows[0])
                    return [2 /*return*/, res.status(404).json({ error: 'reservation not found' })];
                res.json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.confirmReservation = confirmReservation;
var cancelReservation = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                return [4 /*yield*/, db_js_1.pool.query("UPDATE reservations SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1", [id])];
            case 1:
                _a.sent();
                return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM reservations WHERE id = $1', [id])];
            case 2:
                rows = (_a.sent()).rows;
                if (!rows[0])
                    return [2 /*return*/, res.status(404).json({ error: 'reservation not found' })];
                res.json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.cancelReservation = cancelReservation;
var listPaymentsOfReservation = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM payments WHERE reservation_id = $1 ORDER BY created_at ASC', [req.params.id])];
            case 1:
                rows = (_a.sent()).rows;
                res.json(rows);
                return [2 /*return*/];
        }
    });
}); };
exports.listPaymentsOfReservation = listPaymentsOfReservation;
var byDay = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, date, branchId, params, branchFilter, sql, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, date = _a.date, branchId = _a.branchId;
                if (!date)
                    return [2 /*return*/, res.status(400).json({ error: 'date required' })];
                params = [date];
                branchFilter = branchId ? (params.push(branchId), 'AND r.branch_id = $2') : '';
                sql = "\n    SELECT r.*, s.name AS space_name, u.name AS customer_name\n    FROM reservations r\n    JOIN spaces s ON s.id = r.space_id\n    JOIN users u ON u.id = r.customer_id\n    WHERE r.date = $1 ".concat(branchFilter, "\n    ORDER BY r.start_time ASC\n  ");
                return [4 /*yield*/, db_js_1.pool.query(sql, params)];
            case 1:
                rows = (_b.sent()).rows;
                res.json(rows);
                return [2 /*return*/];
        }
    });
}); };
exports.byDay = byDay;
