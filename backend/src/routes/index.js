"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/index.ts
var express_1 = require("express");
var branches_js_1 = require("../controllers/branches.js");
var spaces_js_1 = require("../controllers/spaces.js");
var users_js_1 = require("../controllers/users.js");
var reservations_js_1 = require("../controllers/reservations.js");
var payment_js_1 = require("../controllers/payment.js");
var reports_js_1 = require("../controllers/reports.js");
var router = (0, express_1.Router)();
/* branches */
router.get('/branches', branches_js_1.listBranches);
router.post('/branches', branches_js_1.createBranch);
router.get('/branches/:id', branches_js_1.getBranch);
router.put('/branches/:id', branches_js_1.updateBranch);
router.delete('/branches/:id', branches_js_1.deleteBranch);
router.get('/branches/:id/spaces', branches_js_1.listSpacesOfBranch);
/* spaces */
router.get('/spaces', spaces_js_1.listSpaces);
router.post('/spaces', spaces_js_1.createSpace);
router.get('/spaces/:id', spaces_js_1.getSpace);
router.put('/spaces/:id', spaces_js_1.updateSpace);
router.patch('/spaces/:id/activate', spaces_js_1.activateSpace);
router.delete('/spaces/:id', spaces_js_1.deleteSpace);
router.get('/spaces/:id/photos', spaces_js_1.listPhotos);
router.post('/spaces/:id/photos', spaces_js_1.addPhoto);
router.delete('/spaces/:id/photos/:photoId', spaces_js_1.deletePhoto);
router.get('/spaces/:id/availability', spaces_js_1.checkAvailability);
router.get('/spaces/search', spaces_js_1.searchSpaces);
/* users */
router.get('/users', users_js_1.listUsers);
router.post('/users', users_js_1.createUser);
router.get('/users/:id', users_js_1.getUser);
router.put('/users/:id', users_js_1.updateUser);
router.delete('/users/:id', users_js_1.deleteUser);
/* reservations */
router.get('/reservations', reservations_js_1.listReservations);
router.post('/reservations', reservations_js_1.createReservation);
router.get('/reservations/:id', reservations_js_1.getReservation);
router.put('/reservations/:id', reservations_js_1.updateReservation);
router.patch('/reservations/:id/confirm', reservations_js_1.confirmReservation);
router.patch('/reservations/:id/cancel', reservations_js_1.cancelReservation);
router.get('/reservations/:id/payments', reservations_js_1.listPaymentsOfReservation);
router.get('/reservations/by-day', reservations_js_1.byDay);
/* payments */
router.post('/reservations/:id/payments', payment_js_1.createPayment);
router.get('/payments/:id', payment_js_1.getPayment);
router.patch('/payments/:id/mark-paid', payment_js_1.markPaid);
router.delete('/payments/:id', payment_js_1.deletePayment);
router.post('/payments/webhook', payment_js_1.webhook);
/* reports */
router.get('/reports/revenue', reports_js_1.revenue);
router.get('/reports/utilization', reports_js_1.utilization);
exports.default = router;
