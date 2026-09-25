# Public Analytics Engineering Portfolio

An end-to-end analytics engineering repository demonstrating production-style dbt models paired with code-based frontend reporting tools.

| Project / Artifact | Tech Stack | Status | Link |
| :--- | :--- | :--- | :--- |
| **Streamlit Dashboard** | Python, Streamlit, BigQuery | `Completed` | [Launch App 🚀](https://analyticsportfolio-tzkv83oktxw3hzmcyqkpck.streamlit.app/) |
| **React Analytics UI** | React, JavaScript, APIs | `In Development` | [Launch App 🚀](https://michaelmartin74-git.github.io/analytics_portfolio/) |
| **dbt Documentation** | dbt Core, Static Docs | `Live` | [View Docs 📖](https://michaelmartin74-git.github.io/analytics_portfolio/dbt/index.html) |

---

## Overview

This repository demonstrates how to bridge backend data transformation with modern frontend serving layers. It compares two methods for serving data-backed interfaces:
1. **Streamlit:** Rapid prototyping and data app development directly in Python.
2. **React:** Custom UI engineering for full control over consumer-facing analytics.

## Data & Modeling Architecture
* **Data Sources:** Public datasets hosted on BigQuery.
* **dbt Patterns:** Staging / Intermediate / Marts layer architecture, custom macros, schema tests, and automated doc generation.

## Quickstart

### 1. Environment Setup
Clone the repository and set up environment variables:
```bash
cp .env.example .env
```
Update .env with your specific project ID, target database, and credentials.

### 2. Configure Credentials
Ensure your ~/.dbt/profiles.yml targets the environment variables defined in your .env file.

### 3. Build & Test Pipeline
Run the full dbt build (seeds, models, snapshot, and tests):

```bash
dbt build
```