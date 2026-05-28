const patterns = [
  { key: 'name', regex: /(?:my name is|i'm|i am|myself|call me)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i },
  { key: 'name', regex: /name\s+(?:is\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)/i },
  { key: 'business', regex: /(?:run|own|have|operate|manage)\s+(?:a|an|the)?\s*([A-Za-z]+(?:\s+[A-Za-z]+)?\s+(?:store|shop|business|venture|enterprise|firm|outlet))/i },
  { key: 'business', regex: /([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:store|shop|business|venture|dukaan|shopify)/i },
  { key: 'income', regex: /(?:make|earn|income|salary|monthly|earning|take home)\s+(?:is|of|around|about|approximately|roughly)?\s*(?:rs\.?|inr|rupees)?\s*(\d{3,7})/i },
  { key: 'income', regex: /(\d{3,7})\s*(?:rs\.?|inr|rupees)?\s*(?:per|every|a|each)?\s*(?:month|monthly|mohine)/i },
  { key: 'loan', regex: /(?:need|want|require|looking for|demand)\s+(?:a|an|the)?\s*(?:loan|amount|money|fund|paisa|capital)\s+(?:of\s+)?(?:rs\.?|inr|rupees)?\s*(\d{3,7})/i },
  { key: 'phone', regex: /(\d{10})/ },
];

function matchField(text, key) {
  for (const p of patterns) {
    if (p.key !== key) continue;
    const m = text.match(p.regex);
    if (m) return m[1].trim();
  }
  return null;
}

export function parseMessage(text) {
  const name = matchField(text, 'name') || null;
  const business = matchField(text, 'business') || null;
  const income = matchField(text, 'income') || null;
  const phone = matchField(text, 'phone') || null;
  const loanAmount = matchField(text, 'loan') || null;

  const result = { name, business, income, phone, loanAmount };

  const foundFields = Object.values(result).filter(Boolean).length;
  result.confidence = foundFields >= 3 ? 'high' : foundFields >= 2 ? 'medium' : 'low';

  return result;
}
