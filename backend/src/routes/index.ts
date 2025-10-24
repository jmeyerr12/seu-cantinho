import { Router } from "express";

import { tokenValidation } from "../middleware/auth";

import {
  listBranches,
  createBranch,
  getBranch,
  updateBranch,
  deleteBranch,
  listSpacesOfBranch,
} from "../controllers/branches";

import {
  listSpaces,
  createSpace,
  getSpace,
  updateSpace,
  activateSpace,
  deleteSpace,
  listPhotos,
  addPhoto,
  deletePhoto,
  checkAvailability,
  searchSpaces,
} from "../controllers/spaces";

import {
  listUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  loginUser
} from "../controllers/users";

import {
  listReservations,
  createReservation,
  getReservation,
  updateReservation,
  confirmReservation,
  cancelReservation,
  listPaymentsOfReservation,
  byDay,
} from "../controllers/reservations";

import {
  createPayment,
  getPayment,
  markPaid,
  deletePayment,
  webhook,
} from "../controllers/payment";

import {
  revenue,
  utilization,
} from "../controllers/reports";

const router = Router();

/* branches */
router.get("/branches", listBranches);
router.post("/branches", createBranch);
router.get("/branches/:id", getBranch);
router.put("/branches/:id", updateBranch);
router.delete("/branches/:id", deleteBranch);
router.get("/branches/:id/spaces", listSpacesOfBranch);

/* spaces */
router.get("/spaces", listSpaces);
router.post("/spaces", createSpace);
router.get("/spaces/:id", getSpace);
router.put("/spaces/:id", updateSpace);
router.patch("/spaces/:id/activate", activateSpace);
router.delete("/spaces/:id", deleteSpace);
router.get("/spaces/:id/photos", listPhotos);
router.post("/spaces/:id/photos", addPhoto);
router.delete("/spaces/:id/photos/:photoId", deletePhoto);
router.get("/spaces/:id/availability", checkAvailability);
router.get("/spaces/search", searchSpaces);

/* users */
router.post('/auth/login', loginUser);
router.get("/users", listUsers);
router.post("/users", createUser);
router.get("/users/:id", getUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

/* reservations */
router.get("/reservations", listReservations);
router.post("/reservations", createReservation);
router.get("/reservations/:id", getReservation);
router.put("/reservations/:id", updateReservation);
router.patch("/reservations/:id/confirm", confirmReservation);
router.patch("/reservations/:id/cancel", cancelReservation);
router.get("/reservations/:id/payments", listPaymentsOfReservation);
router.get("/reservations/by-day", byDay);

/* payments */
router.post("/reservations/:id/payments", createPayment);
router.get("/payments/:id", getPayment);
router.patch("/payments/:id/mark-paid", markPaid);
router.delete("/payments/:id", deletePayment);
router.post("/payments/webhook", webhook);

/* reports */
router.get("/reports/revenue", revenue);
router.get("/reports/utilization", utilization);

export default router;
