"use strict";
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
exports.utilization = exports.revenue = void 0;
var db_js_1 = require("../config/db.js");
/**
 * receita: soma de pagamentos PAID no período (por filial/espaço opcional)
 */
var revenue = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, from, to, branchId, params, branchFilter, sql, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, from = _a.from, to = _a.to, branchId = _a.branchId;
                if (!from || !to)
                    return [2 /*return*/, res.status(400).json({ error: 'from & to required (YYYY-MM-DD)' })];
                params = [from, to];
                branchFilter = branchId ? (params.push(branchId), 'AND r.branch_id = $3') : '';
                sql = "\n    SELECT r.branch_id, b.name AS branch_name,\n           r.space_id,  s.name AS space_name,\n           SUM(p.amount)::numeric(12,2) AS revenue\n    FROM payments p\n    JOIN reservations r ON r.id = p.reservation_id\n    JOIN branches b ON b.id = r.branch_id\n    JOIN spaces   s ON s.id = r.space_id\n    WHERE p.status = 'PAID'\n      AND p.paid_at::date BETWEEN $1 AND $2\n      ".concat(branchFilter, "\n    GROUP BY r.branch_id, b.name, r.space_id, s.name\n    ORDER BY branch_name, space_name\n  ");
                return [4 /*yield*/, db_js_1.pool.query(sql, params)];
            case 1:
                rows = (_b.sent()).rows;
                res.json(rows);
                return [2 /*return*/];
        }
    });
}); };
exports.revenue = revenue;
/**
 * utilização: horas reservadas / horas disponíveis no período
 * simplificação: considera disponibilidade 24h/dia (sem horário comercial)
 */
var utilization = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, from, to, branchId, spaceId, params, joinFilter, sql, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, from = _a.from, to = _a.to, branchId = _a.branchId, spaceId = _a.spaceId;
                if (!from || !to)
                    return [2 /*return*/, res.status(400).json({ error: 'from & to required (YYYY-MM-DD)' })];
                params = [from, to];
                joinFilter = '';
                if (branchId) {
                    params.push(branchId);
                    joinFilter += " AND s.branch_id = $".concat(params.length);
                }
                if (spaceId) {
                    params.push(spaceId);
                    joinFilter += " AND s.id        = $".concat(params.length);
                }
                sql = "\n    WITH hours_reserved AS (\n      SELECT r.space_id,\n             SUM(EXTRACT(EPOCH FROM (r.end_time - r.start_time))/3600.0) AS hrs\n      FROM reservations r\n      WHERE r.date BETWEEN $1 AND $2 AND r.status <> 'CANCELLED'\n      GROUP BY r.space_id\n    ),\n    spaces_set AS (\n      SELECT s.id, s.branch_id FROM spaces s WHERE 1=1 ".concat(joinFilter, "\n    )\n    SELECT\n      ss.branch_id,\n      b.name AS branch_name,\n      ss.id   AS space_id,\n      s.name  AS space_name,\n      COALESCE(hr.hrs, 0)               AS hours_reserved,\n      ((DATE $2 - DATE $1) + 1) * 24.0  AS hours_possible,\n      CASE\n        WHEN ((DATE $2 - DATE $1) + 1) * 24.0 = 0 THEN 0\n        ELSE COALESCE(hr.hrs,0) / (((DATE $2 - DATE $1) + 1) * 24.0)\n      END AS utilization\n    FROM spaces_set ss\n    JOIN spaces s   ON s.id = ss.id\n    JOIN branches b ON b.id = ss.branch_id\n    LEFT JOIN hours_reserved hr ON hr.space_id = ss.id\n    ORDER BY branch_name, space_name\n  ");
                return [4 /*yield*/, db_js_1.pool.query(sql, params)];
            case 1:
                rows = (_b.sent()).rows;
                res.json(rows);
                return [2 /*return*/];
        }
    });
}); };
exports.utilization = utilization;
