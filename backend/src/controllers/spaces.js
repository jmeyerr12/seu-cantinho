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
exports.searchSpaces = exports.checkAvailability = exports.deletePhoto = exports.addPhoto = exports.listPhotos = exports.deleteSpace = exports.activateSpace = exports.updateSpace = exports.getSpace = exports.createSpace = exports.listSpaces = void 0;
var db_1 = require("../db");
var uuid_1 = require("uuid");
/* helpers */
var toBool = function (v) { return (typeof v === 'string' ? v === 'true' : !!v); };
var listSpaces = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, branchId, minCapacity, active, filters, params, where, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, branchId = _a.branchId, minCapacity = _a.minCapacity, active = _a.active;
                filters = [];
                params = [];
                if (branchId) {
                    params.push(branchId);
                    filters.push("branch_id = $".concat(params.length));
                }
                if (minCapacity) {
                    params.push(Number(minCapacity));
                    filters.push("capacity >= $".concat(params.length));
                }
                if (active !== undefined) {
                    params.push(toBool(active));
                    filters.push("active = $".concat(params.length));
                }
                where = filters.length ? "WHERE ".concat(filters.join(' AND ')) : '';
                return [4 /*yield*/, db_1.pool.query("SELECT * FROM spaces ".concat(where, " ORDER BY name ASC"), params)];
            case 1:
                rows = (_b.sent()).rows;
                res.json(rows);
                return [2 /*return*/];
        }
    });
}); };
exports.listSpaces = listSpaces;
var createSpace = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, branch_id, name, description, capacity, base_price_per_hour, _b, active, id, rows;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, branch_id = _a.branch_id, name = _a.name, description = _a.description, capacity = _a.capacity, base_price_per_hour = _a.base_price_per_hour, _b = _a.active, active = _b === void 0 ? true : _b;
                id = (0, uuid_1.v4)();
                return [4 /*yield*/, db_1.pool.query("INSERT INTO spaces (id,branch_id,name,description,capacity,base_price_per_hour,active)\n     VALUES ($1,$2,$3,$4,$5,$6,$7)", [id, branch_id, name, description !== null && description !== void 0 ? description : null, capacity, base_price_per_hour, active])];
            case 1:
                _c.sent();
                return [4 /*yield*/, db_1.pool.query('SELECT * FROM spaces WHERE id = $1', [id])];
            case 2:
                rows = (_c.sent()).rows;
                res.status(201).json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.createSpace = createSpace;
var getSpace = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, rows, photos;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                return [4 /*yield*/, db_1.pool.query('SELECT * FROM spaces WHERE id = $1', [id])];
            case 1:
                rows = (_a.sent()).rows;
                if (!rows[0])
                    return [2 /*return*/, res.status(404).json({ error: 'space not found' })];
                return [4 /*yield*/, db_1.pool.query('SELECT * FROM photos WHERE space_id = $1 ORDER BY "order" ASC', [id])];
            case 2:
                photos = _a.sent();
                res.json(__assign(__assign({}, rows[0]), { photos: photos.rows }));
                return [2 /*return*/];
        }
    });
}); };
exports.getSpace = getSpace;
var updateSpace = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, name, description, capacity, base_price_per_hour, active, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.body, name = _a.name, description = _a.description, capacity = _a.capacity, base_price_per_hour = _a.base_price_per_hour, active = _a.active;
                return [4 /*yield*/, db_1.pool.query("UPDATE spaces SET\n      name = COALESCE($2,name),\n      description = COALESCE($3,description),\n      capacity = COALESCE($4,capacity),\n      base_price_per_hour = COALESCE($5,base_price_per_hour),\n      active = COALESCE($6,active),\n      updated_at = NOW()\n     WHERE id = $1", [id, name, description, capacity, base_price_per_hour, active])];
            case 1:
                _b.sent();
                return [4 /*yield*/, db_1.pool.query('SELECT * FROM spaces WHERE id = $1', [id])];
            case 2:
                rows = (_b.sent()).rows;
                if (!rows[0])
                    return [2 /*return*/, res.status(404).json({ error: 'space not found' })];
                res.json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.updateSpace = updateSpace;
var activateSpace = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, active, rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                active = req.body.active;
                return [4 /*yield*/, db_1.pool.query('UPDATE spaces SET active = $2, updated_at = NOW() WHERE id = $1', [id, active])];
            case 1:
                _a.sent();
                return [4 /*yield*/, db_1.pool.query('SELECT * FROM spaces WHERE id = $1', [id])];
            case 2:
                rows = (_a.sent()).rows;
                if (!rows[0])
                    return [2 /*return*/, res.status(404).json({ error: 'space not found' })];
                res.json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.activateSpace = activateSpace;
var deleteSpace = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rowCount;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_1.pool.query('DELETE FROM spaces WHERE id = $1', [req.params.id])];
            case 1:
                rowCount = (_a.sent()).rowCount;
                if (!rowCount)
                    return [2 /*return*/, res.status(404).json({ error: 'space not found' })];
                res.status(204).send();
                return [2 /*return*/];
        }
    });
}); };
exports.deleteSpace = deleteSpace;
/* Photos */
var listPhotos = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_1.pool.query('SELECT * FROM photos WHERE space_id = $1 ORDER BY "order" ASC', [req.params.id])];
            case 1:
                rows = (_a.sent()).rows;
                res.json(rows);
                return [2 /*return*/];
        }
    });
}); };
exports.listPhotos = listPhotos;
var addPhoto = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var spaceId, _a, url, caption, _b, order, photoId, rows;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                spaceId = req.params.id;
                _a = req.body, url = _a.url, caption = _a.caption, _b = _a.order, order = _b === void 0 ? 0 : _b;
                photoId = (0, uuid_1.v4)();
                return [4 /*yield*/, db_1.pool.query('INSERT INTO photos (id, space_id, url, caption, "order") VALUES ($1,$2,$3,$4,$5)', [photoId, spaceId, url, caption !== null && caption !== void 0 ? caption : null, order])];
            case 1:
                _c.sent();
                return [4 /*yield*/, db_1.pool.query('SELECT * FROM photos WHERE id = $1', [photoId])];
            case 2:
                rows = (_c.sent()).rows;
                res.status(201).json(rows[0]);
                return [2 /*return*/];
        }
    });
}); };
exports.addPhoto = addPhoto;
var deletePhoto = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, spaceId, photoId, rowCount;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.params, spaceId = _a.id, photoId = _a.photoId;
                return [4 /*yield*/, db_1.pool.query('DELETE FROM photos WHERE id = $1 AND space_id = $2', [photoId, spaceId])];
            case 1:
                rowCount = (_b.sent()).rowCount;
                if (!rowCount)
                    return [2 /*return*/, res.status(404).json({ error: 'photo not found' })];
                res.status(204).send();
                return [2 /*return*/];
        }
    });
}); };
exports.deletePhoto = deletePhoto;
/* Availability & Search */
var checkAvailability = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, date, start, end, q, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.query, date = _a.date, start = _a.start, end = _a.end;
                if (!date || !start || !end)
                    return [2 /*return*/, res.status(400).json({ error: 'date, start, end required' })];
                q = "\n    SELECT 1 FROM reservations\n    WHERE space_id = $1 AND date = $2 AND status <> 'CANCELLED'\n      AND NOT (end_time <= $3::time OR start_time >= $4::time)\n    LIMIT 1\n  ";
                return [4 /*yield*/, db_1.pool.query(q, [id, date, start, end])];
            case 1:
                rows = (_b.sent()).rows;
                res.json({ available: rows.length === 0 });
                return [2 /*return*/];
        }
    });
}); };
exports.checkAvailability = checkAvailability;
var searchSpaces = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, city, state, capacity, date, start, end, params, filters, availabilityClause, where, sql, rows;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, city = _a.city, state = _a.state, capacity = _a.capacity, date = _a.date, start = _a.start, end = _a.end;
                params = [];
                filters = ['s.active = TRUE'];
                if (capacity) {
                    params.push(Number(capacity));
                    filters.push("s.capacity >= $".concat(params.length));
                }
                if (state) {
                    params.push(state);
                    filters.push("b.state = $".concat(params.length));
                }
                if (city) {
                    params.push(city);
                    filters.push("b.city  = $".concat(params.length));
                }
                availabilityClause = '';
                if (date && start && end) {
                    params.push(date, start, end);
                    availabilityClause = "\n      AND NOT EXISTS (\n        SELECT 1 FROM reservations r\n        WHERE r.space_id = s.id AND r.date = $".concat(params.length - 2, " AND r.status <> 'CANCELLED'\n          AND NOT (r.end_time <= $").concat(params.length - 1, "::time OR r.start_time >= $").concat(params.length, "::time)\n      )\n    ");
                }
                where = filters.length ? "WHERE ".concat(filters.join(' AND ')) : '';
                sql = "\n    SELECT s.*, b.name AS branch_name, b.city, b.state\n    FROM spaces s\n    JOIN branches b ON b.id = s.branch_id\n    ".concat(where, " ").concat(availabilityClause, "\n    ORDER BY s.name ASC\n  ");
                return [4 /*yield*/, db_1.pool.query(sql, params)];
            case 1:
                rows = (_b.sent()).rows;
                res.json(rows);
                return [2 /*return*/];
        }
    });
}); };
exports.searchSpaces = searchSpaces;
