export const DIMENSION_FILTERS = [
  { key: 'class', label: 'Class' },
  { key: 'status', label: 'Status' },
  { key: 'reason_category', label: 'Reason Category' },
  { key: 'recalling_firm', label: 'Recalling Firm' },
  { key: 'geo_state', label: 'Geo State' },
  { key: 'geo_city', label: 'Geo City' },
];

export const METRICS_CONFIG = [
  { key: 'recalls', label: 'Total Recalls' },
  { key: 'firms', label: 'Affected Firms' },
  { key: 'avg_init_to_class_days', label: 'Avg Init-to-Class (Days)' },
  { key: 'avg_class_to_term_days', label: 'Avg Class-to-Term (Days)' },
];

export const INITIAL_DIMENSION_STATE = {
  class: 'All',
  status: 'All',
  reason_category: 'All',
  recalling_firm: 'All',
  geo_state: 'All',
  geo_city: 'All',
};