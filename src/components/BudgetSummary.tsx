import type { TripExpense } from '../types/trip';
import { CATEGORY_ICONS, CATEGORY_COLORS } from './ExpenseCard';

interface BudgetSummaryProps {
  expenses: TripExpense[];
  totalBudget?: number;
  currency: string;
}

export const BudgetSummary = ({ expenses, totalBudget, currency }: BudgetSummaryProps) => {
  const formatAmount = (amount: number, curr: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate totals by category
  const categoryTotals = expenses.reduce((acc, expense) => {
    // Simple conversion - in real app would use exchange rates
    const amount = expense.currency === currency 
      ? expense.amount 
      : expense.amount; // Would convert here
    
    acc[expense.category] = (acc[expense.category] || 0) + amount;
    return acc;
  }, {} as Record<TripExpense['category'], number>);

  const totalSpent = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  const remaining = totalBudget ? totalBudget - totalSpent : null;
  const percentUsed = totalBudget ? (totalSpent / totalBudget) * 100 : 0;

  const categories: TripExpense['category'][] = [
    'food', 'transport', 'accommodation', 'activity', 'shopping', 'other'
  ];

  return (
    <div className="budget-summary">
      {/* Total Overview */}
      <div className="budget-overview">
        <div className="budget-total-spent">
          <span className="label">Total Spent</span>
          <span className="amount">{formatAmount(totalSpent, currency)}</span>
        </div>
        
        {totalBudget && totalBudget > 0 && (
          <div className="budget-remaining">
            <span className="label">
              {remaining && remaining >= 0 ? 'Remaining' : 'Over Budget'}
            </span>
            <span className={`amount ${remaining && remaining < 0 ? 'negative' : ''}`}>
              {formatAmount(Math.abs(remaining || 0), currency)}
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
                  {formatAmount(amount, currency)}
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
              ? formatAmount(totalSpent / expenses.length, currency)
              : formatAmount(0, currency)
            }
          </span>
          <span className="stat-label">Avg per item</span>
        </div>
      </div>
    </div>
  );
};
