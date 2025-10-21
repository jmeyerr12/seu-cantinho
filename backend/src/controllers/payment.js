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
exports.webhook = exports.deletePayment = exports.markPaid = exports.getPayment = exports.createPayment = void 0;
var db_js_1 = require("../config/db.js");
var uuid_1 = require("uuid");
var createPayment = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var reservationId, _a, amount, method, purpose, external_ref, id, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                reservationId = req.params.id;
                _a = req.body, amount = _a.amount, method = _a.method, purpose = _a.purpose, external_ref = _a.external_ref;
                id = (0, uuid_1.v4)();
                return [4 /*yield*/, db_js_1.pool.query("INSERT INTO payments (id, reservation_id, amount, method, status, purpose, external_ref)\n     VALUES ($1,$2,$3,$4,'PENDING',$5,$6)", [id, reservationId, amount, method, purpose, external_ref !== null && external_ref !== void 0 ? external_ref : null])];
            case 1:
                _b.sent();
                return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM payments WHERE id = $1', [id])];
            case 2:
                rows = (_b.sent()).rows;
                res.status(201).json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.createPayment = createPayment;
var getPayment = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id])];
            case 1:
                rows = (_a.sent()).rows;
                if (!rows[0])
                    return [2 /*return*/, res.status(404).json({ error: 'payment not found' })];
                res.json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.getPayment = getPayment;
var markPaid = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, external_ref, rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                external_ref = req.body.external_ref;
                return [4 /*yield*/, db_js_1.pool.query("UPDATE payments SET status = 'PAID', paid_at = NOW(), external_ref = COALESCE($2, external_ref) WHERE id = $1", [id, external_ref !== null && external_ref !== void 0 ? external_ref : null])];
            case 1:
                _a.sent();
                return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM payments WHERE id = $1', [id])];
            case 2:
                rows = (_a.sent()).rows;
                if (!rows[0])
                    return [2 /*return*/, res.status(404).json({ error: 'payment not found' })];
                res.json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.markPaid = markPaid;
var deletePayment = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var check;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_js_1.pool.query('SELECT status FROM payments WHERE id = $1', [req.params.id])];
            case 1:
                check = _a.sent();
                if (!check.rows[0])
                    return [2 /*return*/, res.status(404).json({ error: 'payment not found' })];
                if (check.rows[0].status === 'PAID')
                    return [2 /*return*/, res.status(400).json({ error: 'cannot delete a paid payment' })];
                return [4 /*yield*/, db_js_1.pool.query('DELETE FROM payments WHERE id = $1', [req.params.id])];
            case 2:
                _a.sent();
                res.status(204).send();
                return [2 /*return*/];
        }
    });
}); };
exports.deletePayment = deletePayment;
var webhook = function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // trate provedor externo aqui (verifique assinatura, etc.)
        res.status(200).send('ok');
        return [2 /*return*/];
    });
}); };
exports.webhook = webhook;
