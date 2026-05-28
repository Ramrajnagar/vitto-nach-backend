CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  business_type VARCHAR(255) NOT NULL,
  income NUMERIC(12, 2) NOT NULL CHECK (income > 0),
  phone VARCHAR(20) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_accounts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  loan_amount NUMERIC(12, 2) NOT NULL CHECK (loan_amount > 0),
  tenure_months INT NOT NULL CHECK (tenure_months BETWEEN 1 AND 60),
  monthly_emi NUMERIC(10, 2) NOT NULL CHECK (monthly_emi > 0),
  interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'DEFAULTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repayments (
  id SERIAL PRIMARY KEY,
  loan_account_id INT NOT NULL REFERENCES loan_accounts(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  late_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (late_fee >= 0),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_accounts_user_id ON loan_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_repayments_loan_account_id ON repayments(loan_account_id);
CREATE INDEX IF NOT EXISTS idx_repayments_status ON repayments(status);

INSERT INTO users (name, business_type, income, phone) VALUES
  ('Rajesh Kumar', 'Grocery Store', 50000.00, '9876543210'),
  ('Priya Sharma', 'Tailoring Shop', 35000.00, '9876543211'),
  ('Amit Singh', 'Mobile Repair', 45000.00, '9876543212')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO loan_accounts (user_id, loan_amount, tenure_months, monthly_emi, interest_rate, status)
SELECT id, 100000.00, 12, 8884.88, 12.00, 'ACTIVE' FROM users WHERE phone = '9876543210'
UNION ALL
SELECT id, 50000.00, 6, 8628.33, 12.00, 'ACTIVE' FROM users WHERE phone = '9876543211'
UNION ALL
SELECT id, 75000.00, 9, 8770.00, 12.00, 'ACTIVE' FROM users WHERE phone = '9876543212'
ON CONFLICT DO NOTHING;

INSERT INTO repayments (loan_account_id, due_date, amount, status)
SELECT la.id, (CURRENT_DATE + INTERVAL '1 month')::date, la.monthly_emi, 'PENDING'
FROM loan_accounts la
WHERE NOT EXISTS (
  SELECT 1 FROM repayments r WHERE r.loan_account_id = la.id
);
