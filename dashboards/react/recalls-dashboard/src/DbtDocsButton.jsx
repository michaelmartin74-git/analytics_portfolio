import React from 'react';

export default function DbtDocsButton() {
  return (
    <a
      href={`${import.meta.env.BASE_URL}dbt/index.html`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 999,
        padding: '6px 12px',
        backgroundColor: '#F1F5F9',
        color: '#64748B',
        border: '1px solid #CBD5E1',
        borderRadius: '6px',
        textDecoration: 'none',
        fontSize: '0.75rem',
        fontWeight: 500,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#E2E8F0';
        e.currentTarget.style.color = '#0F172A';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#F1F5F9';
        e.currentTarget.style.color = '#64748B';
      }}
    >
      dbt Docs ↗
    </a>
  );
}