import { useState, useEffect } from 'react';
import type { TripExpense } from '../types/trip';
import { CATEGORY_ICONS, CATEGORY_COLORS } from './ExpenseCard';
import { convertCurrency, formatCurrency, COMMON_CURRENCIES } from '../services/currencyService';

interface BudgetSummaryProps {
  expenses: TripExpense[];
  totalBudget?: number;
  currency: string;
  onCurrencyChange?: (currency: string) => void;
}

export const BudgetSummary = ({ expenses, totalBudget, currency, onCurrencyChange }: BudgetSummaryProps) => {
  const [displayCurrency, setDisplayCurrency] = useState(currency);
  const [convertedExpenses, setConvertedExpenses] = useState<Array<{ expense: TripExpense; convertedAmount: number }>>([]);
  const [converting, setConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  // Convert expenses when currency changes
  useEffect(() => {
    const convertAllExpenses = async () => {
      if (displayCurrency === currency && expenses.every(e => e.currency === currency)) {
        // No conversion needed
        setConvertedExpenses(expenses.map(e => ({ expense: e, convertedAmount: e.amount })));
        return;
      }

      setConverting(true);
      setConversionError(null);

      try {
        const converted = await Promise.all(
          expenses.map(async (expense) => {
            if (expense.currency.toUpperCase() === displayCurrency.toUpperCase()) {
              return { expense, convertedAmount: expense.amount };
            }
            try {
              const convertedAmount = await convertCurrency(
                expense.amount,
                expense.currency,
                displayCurrency
              );
              return { expense, convertedAmount };
            } catch (err) {
              console.error(`Failed to convert ${expense.currency} to ${displayCurrency}:`, err);
              // Fallback to original amount if conversion fails
              return { expense, convertedAmount: expense.amount };
            }
          })
        );
        setConvertedExpenses(converted);
      } catch (err) {
        setConversionError(err instanceof Error ? err.message : 'Failed to convert currencies');
        // Fallback to original amounts
        setConvertedExpenses(expenses.map(e => ({ expense: e, convertedAmount: e.amount })));
      } finally {
        setConverting(false);
      }
    };

    convertAllExpenses();
  }, [expenses, displayCurrency, currency]);

  // Convert budget if needed
  const [convertedBudget, setConvertedBudget] = useState<number | null>(null);
  useEffect(() => {
    const convertBudget = async () => {
      if (!totalBudget) {
        setConvertedBudget(null);
        return;
      }

      if (currency.toUpperCase() === displayCurrency.toUpperCase()) {
        setConvertedBudget(totalBudget);
        return;
      }

      try {
        const converted = await convertCurrency(totalBudget, currency, displayCurrency);
        setConvertedBudget(converted);
      } catch (err) {
        console.error('Failed to convert budget:', err);
        setConvertedBudget(totalBudget);
      }
    };

    convertBudget();
  }, [totalBudget, currency, displayCurrency]);

  const handleCurrencyChange = (newCurrency: string) => {
    setDisplayCurrency(newCurrency);
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  };

  // Calculate totals by category
  const categoryTotals = convertedExpenses.reduce((acc, { expense, convertedAmount }) => {
    acc[expense.category] = (acc[expense.category] || 0) + convertedAmount;
    return acc;
  }, {} as Record<TripExpense['category'], number>);

  const totalSpent = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  const budgetToUse = convertedBudget ?? totalBudget;
  const remaining = budgetToUse ? budgetToUse - totalSpent : null;
  const percentUsed = budgetToUse ? (totalSpent / budgetToUse) * 100 : 0;

  const categories: TripExpense['category'][] = [
    'food', 'transport', 'accommodation', 'activity', 'shopping', 'other'
  ];

  return (
    <div className="budget-summary">
      {/* Currency Selector */}
      <div className="budget-currency-selector">
        <label htmlFor="currency-select">Display Currency:</label>
        <select
          id="currency-select"
          value={displayCurrency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          className="currency-select"
          disabled={converting}
        >
          {COMMON_CURRENCIES.map((curr) => (
            <option key={curr.code} value={curr.code}>
              {curr.code} - {curr.name}
            </option>
          ))}
        </select>
        {converting && <span className="converting-indicator">Converting...</span>}
        {conversionError && (
          <span className="conversion-error">⚠️ {conversionError}</span>
        )}
        {displayCurrency !== currency && (
          <span className="currency-note">
            Showing amounts converted from {currency}
          </span>
        )}
      </div>

      {/* Total Overview */}
      <div className="budget-overview">
        <div className="budget-total-spent">
          <span className="label">Total Spent</span>
          <span className="amount">{formatCurrency(totalSpent, displayCurrency)}</span>
        </div>
        
        {budgetToUse && budgetToUse > 0 && (
          <div className="budget-remaining">
            <span className="label">
              {remaining && remaining >= 0 ? 'Remaining' : 'Over Budget'}
            </span>
            <span className={`amount ${remaining && remaining < 0 ? 'negative' : ''}`}>
              {formatCurrency(Math.abs(remaining || 0), displayCurrency)}
            </span>
          </div>
        )}
      </div>

      {/* Budget Progress Bar */}
      {totalBudget && totalBudget > 0 && (
        <div className="budget-progress">
          <div className="progress-bar">
            <div 
              className={`progress-fill ${percentUsed > 100 ? 'over' : percentUsed > 80 ? 'warning' : ''}`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <span className="progress-text">
            {percentUsed.toFixed(0)}% of budget used
          </span>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="budget-breakdown">
        <h4>Spending by Category</h4>
        <div className="category-breakdown-list">
          {categories.map((cat) => {
            const amount = categoryTotals[cat] || 0;
            const percent = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
            
            return (
              <div key={cat} className="category-breakdown-item">
                <div className="category-info">
                  <span 
                    className="category-icon"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                  >
                    {CATEGORY_ICONS[cat]}
                  </span>
                  <span className="category-name">{cat}</span>
                </div>
                <div className="category-bar-container">
                  <div 
                    className="category-bar"
                    style={{ 
                      width: `${percent}%`,
                      backgroundColor: CATEGORY_COLORS[cat]
                    }}
                  />
                </div>
                <span className="category-amount">
                  {formatCurrency(amount, displayCurrency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="budget-stats">
        <div className="stat">
          <span className="stat-value">{expenses.length}</span>
          <span className="stat-label">Expenses</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {expenses.length > 0 
              ? formatCurrency(totalSpent / expenses.length, displayCurrency)
              : formatCurrency(0, displayCurrency)
            }
          </span>
          <span className="stat-label">Avg per item</span>
        </div>
      </div>
    </div>
  );
};
