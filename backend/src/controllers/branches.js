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
exports.listSpacesOfBranch = exports.deleteBranch = exports.updateBranch = exports.getBranch = exports.createBranch = exports.listBranches = void 0;
var db_js_1 = require("../config/db.js");
var uuid_1 = require("uuid");
var listBranches = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, state, city, filters, params, where, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, state = _a.state, city = _a.city;
                filters = [];
                params = [];
                if (state) {
                    params.push(state);
                    filters.push("state = $".concat(params.length));
                }
                if (city) {
                    params.push(city);
                    filters.push("city  = $".concat(params.length));
                }
                where = filters.length ? "WHERE ".concat(filters.join(' AND ')) : '';
                return [4 /*yield*/, db_js_1.pool.query("SELECT * FROM branches ".concat(where, " ORDER BY name ASC"), params)];
            case 1:
                rows = (_b.sent()).rows;
                res.json(rows);
                return [2 /*return*/];
        }
    });
}); };
exports.listBranches = listBranches;
var createBranch = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, state, city, address, id, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, name = _a.name, state = _a.state, city = _a.city, address = _a.address;
                id = (0, uuid_1.v4)();
                return [4 /*yield*/, db_js_1.pool.query("INSERT INTO branches (id,name,state,city,address) VALUES ($1,$2,$3,$4,$5)", [id, name, state, city, address])];
            case 1:
                _b.sent();
                return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM branches WHERE id = $1', [id])];
            case 2:
                rows = (_b.sent()).rows;
                res.status(201).json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.createBranch = createBranch;
var getBranch = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM branches WHERE id = $1', [req.params.id])];
            case 1:
                rows = (_a.sent()).rows;
                if (!rows[0])
                    return [2 /*return*/, res.status(404).json({ error: 'branch not found' })];
                res.json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.getBranch = getBranch;
var updateBranch = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, name, state, city, address, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.body, name = _a.name, state = _a.state, city = _a.city, address = _a.address;
                return [4 /*yield*/, db_js_1.pool.query("UPDATE branches SET name = COALESCE($2,name), state = COALESCE($3,state),\n     city = COALESCE($4,city), address = COALESCE($5,address), updated_at = NOW() WHERE id = $1", [id, name, state, city, address])];
            case 1:
                _b.sent();
                return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM branches WHERE id = $1', [id])];
            case 2:
                rows = (_b.sent()).rows;
                if (!rows[0])
                    return [2 /*return*/, res.status(404).json({ error: 'branch not found' })];
                res.json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.updateBranch = updateBranch;
var deleteBranch = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rowCount;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_js_1.pool.query('DELETE FROM branches WHERE id = $1', [req.params.id])];
            case 1:
                rowCount = (_a.sent()).rowCount;
                if (!rowCount)
                    return [2 /*return*/, res.status(404).json({ error: 'branch not found' })];
                res.status(204).send();
                return [2 /*return*/];
        }
    });
}); };
exports.deleteBranch = deleteBranch;
var listSpacesOfBranch = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_js_1.pool.query('SELECT * FROM spaces WHERE branch_id = $1 ORDER BY name ASC', [req.params.id])];
            case 1:
                rows = (_a.sent()).rows;
                res.json(rows);
                return [2 /*return*/];
        }
    });
}); };
exports.listSpacesOfBranch = listSpacesOfBranch;
