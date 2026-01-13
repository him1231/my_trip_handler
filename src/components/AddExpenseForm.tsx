import { useState } from 'react';
import type { TripExpense } from '../types/trip';
import { CATEGORY_ICONS } from './ExpenseCard';

interface AddExpenseFormProps {
  tripStartDate: string;
  tripEndDate: string;
  defaultCurrency: string;
  onAdd: (expense: TripExpense) => void;
  onCancel: () => void;
}

const EXPENSE_CATEGORIES: TripExpense['category'][] = [
  'food',
  'transport',
  'accommodation',
  'activity',
  'shopping',
  'other',
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar' },
  { code: 'KRW', symbol: '₩', name: 'Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

export const AddExpenseForm = ({
  tripStartDate,
  tripEndDate,
  defaultCurrency,
  onAdd,
  onCancel,
}: AddExpenseFormProps) => {
  const [category, setCategory] = useState<TripExpense['category']>('food');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [date, setDate] = useState(tripStartDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim() || !amount) {
      alert('Please fill in all required fields');
      return;
    }

    const expense: TripExpense = {
      id: crypto.randomUUID(),
      category,
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      date,
    };

    onAdd(expense);
  };

  return (
    <form className="add-expense-form" onSubmit={handleSubmit}>
      <h3>Add Expense</h3>

      {/* Category Selection */}
      <div className="form-row">
        <label>Category</label>
        <div className="category-grid">
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-btn ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
              <span className="category-label">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="form-row">
        <label>Description *</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Lunch at local restaurant"
          required
        />
      </div>

      {/* Amount and Currency */}
      <div className="form-row two-col">
        <div>
          <label>Amount *</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div>
          <label>Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date */}
      <div className="form-row">
        <label>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={tripStartDate}
          max={tripEndDate}
        />
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Add Expense
        </button>
      </div>
    </form>
  );
};
