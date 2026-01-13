import type { TripExpense } from '../types/trip';

interface ExpenseCardProps {
  expense: TripExpense;
  onEdit?: (expense: TripExpense) => void;
  onDelete?: (expenseId: string) => void;
}

const CATEGORY_ICONS: Record<TripExpense['category'], string> = {
  transport: '🚗',
  accommodation: '🏨',
  food: '🍽️',
  activity: '🎯',
  shopping: '🛍️',
  other: '📝',
};

const CATEGORY_COLORS: Record<TripExpense['category'], string> = {
  transport: '#4285f4',
  accommodation: '#9c27b0',
  food: '#ff9800',
  activity: '#4caf50',
  shopping: '#e91e63',
  other: '#607d8b',
};

export const ExpenseCard = ({ expense, onEdit, onDelete }: ExpenseCardProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="expense-card">
      <div 
        className="expense-category-icon"
        style={{ backgroundColor: CATEGORY_COLORS[expense.category] }}
      >
        {CATEGORY_ICONS[expense.category]}
      </div>
      
      <div className="expense-details">
        <div className="expense-description">{expense.description}</div>
        <div className="expense-meta">
          <span className="expense-category">{expense.category}</span>
          <span className="expense-date">{formatDate(expense.date)}</span>
        </div>
      </div>
      
      <div className="expense-amount">
        {formatAmount(expense.amount, expense.currency)}
      </div>
      
      <div className="expense-actions">
        {onEdit && (
          <button 
            className="btn-icon" 
            onClick={() => onEdit(expense)}
            title="Edit expense"
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button 
            className="btn-icon delete" 
            onClick={() => onDelete(expense.id)}
            title="Delete expense"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
};

export { CATEGORY_ICONS, CATEGORY_COLORS };
