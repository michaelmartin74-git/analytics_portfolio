export function DbtDocsButton() {
  return (
    <a
      href={`${import.meta.env.BASE_URL}dbt/index.html`}
      target="_blank"
      rel="noopener noreferrer"
      className="dbt-docs-btn"
    >
      View dbt Documentation
    </a>
  );
}