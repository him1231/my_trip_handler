import { useState } from 'react';
import type { PackingItem, PackingList as PackingListType } from '../types/trip';

interface PackingListProps {
  packingList: PackingListType | undefined;
  onUpdate: (packingList: PackingListType) => void;
}

const CATEGORY_LABELS: Record<PackingItem['category'], string> = {
  clothing: '👕 Clothing',
  electronics: '📱 Electronics',
  documents: '📄 Documents',
  toiletries: '🧴 Toiletries',
  accessories: '👜 Accessories',
  other: '📦 Other',
};

const DEFAULT_ITEMS: Record<PackingItem['category'], string[]> = {
  clothing: ['T-shirts', 'Pants', 'Underwear', 'Socks', 'Jacket', 'Shoes'],
  electronics: ['Phone', 'Charger', 'Power Bank', 'Camera', 'Laptop'],
  documents: ['Passport', 'ID Card', 'Travel Insurance', 'Flight Tickets', 'Hotel Reservations'],
  toiletries: ['Toothbrush', 'Toothpaste', 'Shampoo', 'Soap', 'Sunscreen'],
  accessories: ['Backpack', 'Sunglasses', 'Hat', 'Water Bottle', 'Travel Adapter'],
  other: ['Medications', 'First Aid Kit', 'Snacks'],
};

export const PackingList = ({ packingList, onUpdate }: PackingListProps) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<PackingItem['category']>('other');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const items = packingList?.items || [];

  const handleTogglePacked = (itemId: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, packed: !item.packed } : item
    );
    onUpdate({ items: updatedItems });
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;

    const newItem: PackingItem = {
      id: crypto.randomUUID(),
      name: newItemName.trim(),
      category: newItemCategory,
      packed: false,
      quantity: 1,
    };

    onUpdate({ items: [...items, newItem] });
    setNewItemName('');
    setShowAddForm(false);
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    onUpdate({ items: updatedItems });
  };

  const handleAddFromDefaults = (category: PackingItem['category']) => {
    const defaultItems = DEFAULT_ITEMS[category];
    const existingNames = new Set(items.map(item => item.name.toLowerCase()));
    
    const newItems = defaultItems
      .filter(name => !existingNames.has(name.toLowerCase()))
      .map(name => ({
        id: crypto.randomUUID(),
        name,
        category,
        packed: false,
        quantity: 1,
      }));

    if (newItems.length > 0) {
      onUpdate({ items: [...items, ...newItems] });
    }
  };

  const handleUpdateItem = (itemId: string, updates: Partial<PackingItem>) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    onUpdate({ items: updatedItems });
    setEditingItem(null);
  };

  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<PackingItem['category'], PackingItem[]>);

  const totalItems = items.length;
  const packedItems = items.filter(item => item.packed).length;
  const progress = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  return (
    <div className="packing-list">
      <div className="packing-list-header">
        <h3>Packing List</h3>
        <div className="packing-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">
            {packedItems} / {totalItems} packed ({progress}%)
          </span>
        </div>
      </div>

      {/* Quick Add Defaults */}
      <div className="packing-quick-add">
        <span className="quick-add-label">Quick add:</span>
        {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
          <button
            key={category}
            type="button"
            className="btn-quick-add"
            onClick={() => handleAddFromDefaults(category as PackingItem['category'])}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="packing-add-form">
          <input
            type="text"
            placeholder="Item name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddItem();
              } else if (e.key === 'Escape') {
                setShowAddForm(false);
                setNewItemName('');
              }
            }}
            autoFocus
            className="packing-item-input"
          />
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value as PackingItem['category'])}
            className="packing-category-select"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary btn-small"
            onClick={handleAddItem}
          >
            Add
          </button>
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={() => {
              setShowAddForm(false);
              setNewItemName('');
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {!showAddForm && (
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          + Add Item
        </button>
      )}

      {/* Items by Category */}
      {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
        const categoryItems = itemsByCategory[category as PackingItem['category']] || [];
        if (categoryItems.length === 0) return null;

        return (
          <div key={category} className="packing-category">
            <h4 className="packing-category-title">{label}</h4>
            <div className="packing-items">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className={`packing-item ${item.packed ? 'packed' : ''}`}
                >
                  <label className="packing-item-checkbox">
                    <input
                      type="checkbox"
                      checked={item.packed}
                      onChange={() => handleTogglePacked(item.id)}
                    />
                    <span className="packing-item-name">
                      {editingItem === item.id ? (
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                          onBlur={() => setEditingItem(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              setEditingItem(null);
                            }
                          }}
                          autoFocus
                          className="packing-item-edit-input"
                        />
                      ) : (
                        <span
                          onClick={() => setEditingItem(item.id)}
                          className="packing-item-name-text"
                        >
                          {item.name}
                        </span>
                      )}
                    </span>
                  </label>
                  {item.quantity && item.quantity > 1 && (
                    <span className="packing-item-quantity">x{item.quantity}</span>
                  )}
                  <div className="packing-item-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => setEditingItem(item.id)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleDeleteItem(item.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="packing-empty">
          <p>No items in your packing list yet.</p>
          <p className="packing-empty-hint">Use "Quick add" to get started or add items manually.</p>
        </div>
      )}
    </div>
  );
};
