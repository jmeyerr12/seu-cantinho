-- ===========================================
-- Seu Cantinho - init.sql (versão simples, TIMESTAMP)
-- Somente CREATE TABLE + FKs essenciais
-- ===========================================

-- BRANCHES (Branch)
CREATE TABLE branches (
  id          UUID PRIMARY KEY,
  name        TEXT        NOT NULL,
  state       TEXT        NOT NULL,
  city        TEXT        NOT NULL,
  address     TEXT        NOT NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- SPACES (Space) — pertence a uma Branch
CREATE TABLE spaces (
  id                   UUID PRIMARY KEY,
  branch_id            UUID        NOT NULL,
  name                 TEXT        NOT NULL,
  description          TEXT,
  capacity             INT         NOT NULL,
  base_price_per_hour  NUMERIC(10,2) NOT NULL,
  active               BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_spaces_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- PHOTOS (Photo) — pertence a um Space
CREATE TABLE photos (
  id        UUID PRIMARY KEY,
  space_id  UUID NOT NULL,
  url       TEXT NOT NULL,
  caption   TEXT,
  "order"   INT  NOT NULL DEFAULT 0,
  CONSTRAINT fk_photos_space
    FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

-- USERS (User)
CREATE TABLE users (
  id             UUID PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  phone          TEXT,
  role           TEXT NOT NULL DEFAULT 'CUSTOMER',  -- ADMIN | MANAGER | CUSTOMER
  password_hash  TEXT NOT NULL,
  last_login_at  TIMESTAMP,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- RESERVATIONS (Reservation) — feita por um User, para um Space/Branch
CREATE TABLE reservations (
  id                   UUID PRIMARY KEY,
  space_id             UUID NOT NULL,
  branch_id            UUID NOT NULL,
  customer_id          UUID NOT NULL,
  date                 DATE NOT NULL,
  start_time           TIME NOT NULL,
  end_time             TIME NOT NULL,
  status               TEXT NOT NULL,   -- PENDING | CONFIRMED | CANCELLED
  total_amount         NUMERIC(10,2) NOT NULL,
  deposit_required_pct NUMERIC(5,2)  NOT NULL DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_reservations_space
    FOREIGN KEY (space_id)  REFERENCES spaces(id),
  CONSTRAINT fk_reservations_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_reservations_user
    FOREIGN KEY (customer_id) REFERENCES users(id),
  CHECK (end_time > start_time)
);

-- PAYMENTS (Payment) — pertence a uma Reservation
CREATE TABLE payments (
  id             UUID PRIMARY KEY,
  reservation_id UUID NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  method         TEXT NOT NULL,   -- PIX | CARD | BOLETO | CASH
  status         TEXT NOT NULL,   -- PENDING | AUTHORIZED | PAID | REFUNDED | CANCELLED
  purpose        TEXT NOT NULL,   -- DEPOSIT | BALANCE
  paid_at        TIMESTAMP,
  external_ref   TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_payments_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);
