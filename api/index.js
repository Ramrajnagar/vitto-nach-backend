import 'dotenv/config';
import express from 'express';
import { query } from '../db/pool.js';
import { parseMessage } from '../utils/parser.js';

const app = express();
app.use(express.json());

app.post('/api/whatsapp-webhook', async (req, res) => {
  try {
    const { message, phone } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message field is required' });
    }

    const parsed = parseMessage(message);

    if (!parsed.name || !parsed.business || !parsed.income) {
      const missing = [];
      if (!parsed.name) missing.push('aapka naam');
      if (!parsed.business) missing.push('business type');
      if (!parsed.income) missing.push('monthly income');
      return res.json({
        status: 'incomplete',
        message: `Samajh gaya! But thodi aur detail chahiye. Batao: ${missing.join(', ')}.`,
        parsed,
      });
    }

    const incomeNum = parseInt(parsed.income, 10);
    if (isNaN(incomeNum) || incomeNum <= 0) {
      return res.status(400).json({ error: 'Invalid income value' });
    }

    const existingUser = phone
      ? await query('SELECT id, name FROM users WHERE phone = $1', [phone])
      : null;

    let user;
    if (existingUser && existingUser.rows.length > 0) {
      user = existingUser.rows[0];
    } else {
      const insertResult = await query(
        `INSERT INTO users (name, business_type, income, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, business_type, income`,
        [parsed.name, parsed.business, incomeNum, phone || null]
      );
      user = insertResult.rows[0];
    }

    const maxLoan = Math.round(incomeNum * 3);
    const suggestedEmi = Math.round(incomeNum * 0.4);

    const reply =
      `Namaste ${parsed.name}! 🙌\n` +
      `Aapka registration ho gaya hai.\n` +
      `Business: ${parsed.business}\n` +
      `Monthly Income: ₹${incomeNum.toLocaleString('en-IN')}\n\n` +
      `Approved loan range: up to ₹${maxLoan.toLocaleString('en-IN')}\n` +
      `Suggested EMI: ₹${suggestedEmi.toLocaleString('en-IN')}/month\n\n` +
      `Our team will call you within 24 hours to discuss further. Koi aur sawaal?`;

    res.json({ status: 'registered', user, reply });
  } catch (err) {
    console.error('[WHATSAPP]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/repayment-webhook', async (req, res) => {
  try {
    const { repayment_id, status } = req.body;

    if (!repayment_id || !status || !['SUCCESS', 'FAILED'].includes(status)) {
      return res.status(400).json({
        error: 'repayment_id and status (SUCCESS|FAILED) are required',
      });
    }

    const existing = await query('SELECT * FROM repayments WHERE id = $1', [repayment_id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Repayment not found' });
    }

    const repayment = existing.rows[0];

    if (repayment.status === 'SUCCESS') {
      return res.json({ status: 'already_settled', repayment });
    }

    if (status === 'FAILED') {
      const lateFee = 250.00;
      const newRetryCount = repayment.retry_count + 1;

      await query(
        `UPDATE repayments
         SET status = 'FAILED',
             retry_count = $1,
             late_fee = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newRetryCount, lateFee, repayment_id]
      );

      console.log('[AUDIT] Repayment %d failed. Retry #%d. Late fee: ₹%s', repayment_id, newRetryCount, lateFee);

      return res.json({
        status: 'failed',
        retry_count: newRetryCount,
        late_fee: lateFee,
        message: `Payment failed. Auto-retry #${newRetryCount} scheduled. Late fee of ₹${lateFee} applied.`,
      });
    }

    await query(
      `UPDATE repayments
       SET status = 'SUCCESS',
           paid_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [repayment_id]
    );

    console.log('[AUDIT] Repayment %d settled successfully.', repayment_id);

    res.json({ status: 'settled', repayment_id });
  } catch (err) {
    console.error('[REPAYMENT]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const result = await query(
      `SELECT
         u.id,
         u.name,
         u.business_type,
         u.income,
         COALESCE(
           json_agg(
             json_build_object(
               'loan_id', la.id,
               'loan_amount', la.loan_amount,
               'status', la.status,
               'repayments', (SELECT json_agg(json_build_object(
                 'id', r.id,
                 'due_date', r.due_date,
                 'amount', r.amount,
                 'status', r.status,
                 'retry_count', r.retry_count,
                 'late_fee', r.late_fee,
                 'paid_at', r.paid_at
               ) ORDER BY r.due_date)
               FROM repayments r WHERE r.loan_account_id = la.id)
             )
           ) FILTER (WHERE la.id IS NOT NULL),
           '[]'
         ) AS loan_accounts
       FROM users u
       LEFT JOIN loan_accounts la ON la.user_id = u.id
       GROUP BY u.id
       ORDER BY u.id`
    );

    res.json({ users: result.rows });
  } catch (err) {
    console.error('[DASHBOARD]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Server running on port', port);
});

export default app;
