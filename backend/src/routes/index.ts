import { Router } from "express";
import { tokenValidation, authorize } from "../middleware/auth";
import { listBranches, createBranch, getBranch, updateBranch, deleteBranch, listSpacesOfBranch } from "../controllers/branches";
import { listSpaces, createSpace, getSpace, updateSpace, activateSpace, deleteSpace, listPhotos, addPhoto, deletePhoto, checkAvailability, searchSpaces } from "../controllers/spaces";
import { listUsers, createUser, getUser, updateUser, deleteUser, loginUser } from "../controllers/users";
import { listReservations, createReservation, getReservation, updateReservation, confirmReservation, cancelReservation, listPaymentsOfReservation, byDay } from "../controllers/reservations";
import { createPayment, getPayment, markPaid, deletePayment, webhook } from "../controllers/payment";
import { revenue, utilization } from "../controllers/reports";

const router = Router();

router.post("/auth/login", loginUser);

router.get("/branches", listBranches);
router.get("/branches/:id", getBranch);
router.get("/branches/:id/spaces", listSpacesOfBranch);
router.post("/branches", tokenValidation(), authorize("ADMIN"), createBranch);
router.put("/branches/:id", tokenValidation(), authorize("ADMIN", "MANAGER"), updateBranch);
router.delete("/branches/:id", tokenValidation(), authorize("ADMIN"), deleteBranch);

router.get("/spaces", listSpaces);
router.get("/spaces/:id", getSpace);
router.get("/spaces/:id/photos", listPhotos);
router.get("/spaces/:id/availability", checkAvailability);
router.get("/spaces/search", searchSpaces);
router.post("/spaces", tokenValidation(), authorize("ADMIN", "MANAGER"), createSpace);
router.put("/spaces/:id", tokenValidation(), authorize("ADMIN", "MANAGER"), updateSpace);
router.patch("/spaces/:id/activate", tokenValidation(), authorize("ADMIN", "MANAGER"), activateSpace);
router.delete("/spaces/:id", tokenValidation(), authorize("ADMIN", "MANAGER"), deleteSpace);
router.post("/spaces/:id/photos", tokenValidation(), authorize("ADMIN", "MANAGER"), addPhoto);
router.delete("/spaces/:id/photos/:photoId", tokenValidation(), authorize("ADMIN", "MANAGER"), deletePhoto);

router.post("/users", createUser);
router.get("/users", tokenValidation(), authorize("ADMIN", "MANAGER"), listUsers);
router.get("/users/:id", tokenValidation(), authorize("ADMIN", "MANAGER", "CUSTOMER"), getUser);
router.put("/users/:id", tokenValidation(), authorize("ADMIN", "MANAGER", "CUSTOMER"), updateUser);
router.delete("/users/:id", tokenValidation(), authorize("ADMIN"), deleteUser);

router.get("/reservations", tokenValidation(), authorize("ADMIN", "MANAGER", "CUSTOMER"), listReservations);
router.post("/reservations", tokenValidation(), authorize("CUSTOMER", "ADMIN", "MANAGER"), createReservation);
router.get("/reservations/:id", tokenValidation(), authorize("ADMIN", "MANAGER", "CUSTOMER"), getReservation);
router.put("/reservations/:id", tokenValidation(), authorize("ADMIN", "MANAGER"), updateReservation);
router.patch("/reservations/:id/confirm", tokenValidation(), authorize("ADMIN", "MANAGER"), confirmReservation);
router.patch("/reservations/:id/cancel", tokenValidation(), authorize("ADMIN", "MANAGER", "CUSTOMER"), cancelReservation);
router.get("/reservations/:id/payments", tokenValidation(), authorize("ADMIN", "MANAGER", "CUSTOMER"), listPaymentsOfReservation);
router.get("/reservations/by-day", tokenValidation(), authorize("ADMIN", "MANAGER"), byDay);

router.post("/reservations/:id/payments", tokenValidation(), authorize("CUSTOMER", "ADMIN", "MANAGER"), createPayment);
router.get("/payments/:id", tokenValidation(), authorize("ADMIN", "MANAGER", "CUSTOMER"), getPayment);
router.patch("/payments/:id/mark-paid", tokenValidation(), authorize("ADMIN", "MANAGER"), markPaid);
router.delete("/payments/:id", tokenValidation(), authorize("ADMIN"), deletePayment);
router.post("/payments/webhook", webhook);

router.get("/reports/revenue", tokenValidation(), authorize("ADMIN", "MANAGER"), revenue);
router.get("/reports/utilization", tokenValidation(), authorize("ADMIN", "MANAGER"), utilization);

export default router;
