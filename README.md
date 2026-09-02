# Public Analytics Engineering Portfolio: dbt Projects

This repository contains public dbt projects built against public datasets. It is designed to demonstrate practical data modeling, transformation patterns, and dbt best practices in a portfolio setting.

## What's Included
* **Data Sources:** Public datasets hosted on [BigQuery / Snowflake / etc.]
* **Core Patterns:** [e.g., Staging/Intermediate/Marts layer architecture, custom macros, data tests, documentation]

## Quickstart

### 1. Prerequisites & Environment Setup
Clone the repository and set up your local environment variables:
```bash
cp .env.example .env
```
Update .env with your specific database target, project ID, and dataset credential

### 2. Configure Credentials
Ensure your ~/.dbt/profiles.yml targets the environment variables defined in your .env file.

### 3. Build the Project
Run the full build pipeline (seeds, models, tests):
```bash
dbt build
```
> Note: If you are new to dbt, refer to the official dbt Documentation or dbt Learn.