import { useState } from 'react';
import type { TripTemplate } from '../data/tripTemplates';
import { TRIP_TEMPLATES, getTemplatesByCategory, searchTemplates } from '../data/tripTemplates';

interface TemplateSelectorProps {
  onSelect: (template: TripTemplate) => void;
  onCancel: () => void;
}

const CATEGORY_ICONS: Record<TripTemplate['category'], string> = {
  'city': '🏙️',
  'beach': '🏖️',
  'adventure': '⛰️',
  'cultural': '🏛️',
  'weekend': '📅',
  'road-trip': '🛣️',
};

export const TemplateSelector = ({ onSelect, onCancel }: TemplateSelectorProps) => {
  const [selectedCategory, setSelectedCategory] = useState<TripTemplate['category'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const categories: Array<TripTemplate['category'] | 'all'> = ['all', 'weekend', 'city', 'beach', 'cultural', 'adventure', 'road-trip'];
  
  const filteredTemplates = searchQuery 
    ? searchTemplates(searchQuery)
    : getTemplatesByCategory(selectedCategory === 'all' ? undefined : selectedCategory);

  return (
    <div className="template-selector">
      <div className="template-selector-header">
        <h3>Choose a Template</h3>
        <button className="modal-close" onClick={onCancel}>✕</button>
      </div>

      {/* Search */}
      <div className="template-search">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="template-search-input"
        />
      </div>

      {/* Category Filter */}
      <div className="template-categories">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`category-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory(cat);
              setSearchQuery('');
            }}
          >
            {cat === 'all' ? '📋 All' : `${CATEGORY_ICONS[cat]} ${cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}`}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="template-grid">
        {filteredTemplates.length === 0 ? (
          <div className="template-empty">
            <p>No templates found</p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="template-card"
              onClick={() => onSelect(template)}
            >
              <div className="template-card-header">
                <span className="template-category-icon">
                  {CATEGORY_ICONS[template.category]}
                </span>
                <h4>{template.name}</h4>
              </div>
              <p className="template-description">{template.description}</p>
              <div className="template-meta">
                <span className="template-duration">📅 {template.duration} days</span>
                {template.suggestedBudget && (
                  <span className="template-budget">
                    💰 {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: template.suggestedCurrency,
                      minimumFractionDigits: 0,
                    }).format(template.suggestedBudget)}
                  </span>
                )}
                <span className="template-destinations">
                  📍 {template.suggestedDestinations.length} destinations
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="template-selector-footer">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};
