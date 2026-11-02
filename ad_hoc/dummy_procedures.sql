/* procedures on 12/1/2010 enriched with: mrn, provider, and relative dates & procedure sequences */

with

/* Import Layer: land source tables and add surrogate keys when needed for eventual runtime optimization */

 person as (
  select * from bigquery-public-data.cms_synthetic_patient_data_omop.person
 )

 , pat_expiry as (
  select * from bigquery-public-data.cms_synthetic_patient_data_omop.death
 )

, provider as (
  select * from bigquery-public-data.cms_synthetic_patient_data_omop.provider
)

, proc_event as (
  -- procedures with lifetime patient sequence and days-since deltas
  select 
   *
   , cast(format_date('%Y%m%d', procedure_dat) as int64) as date_sk 
   , row_number() over (
            partition by person_id 
            order by procedure_dat ASC, procedure_occurrence_id ASC
        ) AS procedure_seq_num
  , lag(procedure_concept_id, 1) over (
            partition by person_id 
            order by procedure_dat asc
        ) as prev_procedure_concept_id 
  , lag(procedure_dat, 1) over (
            partition by person_id 
            order by procedure_dat asc
        ) as prev_procedure_date
  , date_diff(
      procedure_dat, 
      lag(procedure_dat, 1) over (partition by person_id order by procedure_dat asc), 
      day
  ) as days_since_last_procedure
   from bigquery-public-data.cms_synthetic_patient_data_omop.procedure_occurrence
)

, location as (
  select * from bigquery-public-data.cms_synthetic_patient_data_omop.location
)

, care_site as (
  select * from bigquery-public-data.cms_synthetic_patient_data_omop.care_site
)

, concept as (
  select * from bigquery-public-data.cms_synthetic_patient_data_omop.concept
)

, condition_occurrence as (
  select
    *
  from bigquery-public-data.cms_synthetic_patient_data_omop.condition_occurrence
)

, dim_date as (
    -- Synthetic dim_date table: creates date range array between 1/1/2010 and "year from today", and unnests/pivots into rows
    select 
        date_day
    from unnest(
        generate_date_array(
            date('2010-01-01'), 
            date_add(current_date('UTC'), interval 1 year), 
            interval 1 day
        )
    ) as date_day

)

/* Intermediate Layer: enrich/cleanup landed sources */

, person_enriched as (
  -- patient demographics
  select
   person.person_id
  , person.person_source_value as pat_name
  , person.location_id
  , person.gender_source_value as pat_gender
  , person.race_source_value as pat_race
  , person.ethnicity_source_value as pat_ethnicity
  , date(person.year_of_birth, person.month_of_birth, person.day_of_birth) as pat_dob
  , date_diff(
      --resolves age as of now or at time of death
      coalesce(pat_expiry.death_date, current_date()),
      date(person.year_of_birth, person.month_of_birth, person.day_of_birth), 
      year
    ) AS pat_age
  , case when pat_expiry.death_date is not null then 1 else 0 end as pat_expired
  , death_type.concept_name as death_type
  , pat_expiry.death_date
  -- , cause_of_death.concept_name as cause_of_death_desc
  from person
  left join pat_expiry
    on pat_expiry.person_id = person.person_id
  left join concept death_type
    on death_type.concept_id = pat_expiry.death_type_concept_id
  -- left join concept cause_of_death
  --   on cause_of_death.concept_id = pat_expiry.cause_concept_id --no data
)

, dim_date_enriched as (
  --calendar parts, business period boundaries, relative deltas, UTC by default for stable anchoring
  select
      -- Primary Keys & Core Dates
      cast(format_date('%Y%m%d', date_day) as int64) as date_sk --surrogate key
      , date_day as date_utc

      -- Standard Date Calendar Parts
      , extract(year from date_day) as year_number
      , extract(quarter from date_day) as quarter_number
      , extract(month from date_day) as month_number
      , format_date('%B', date_day) as month_name
      , extract(day from date_day) as day_of_month
      , extract(dayofweek from date_day) as day_of_week_number -- 1 = Sunday, 7 = Saturday
      , format_date('%A', date_day) as day_of_week_name
      
      -- Start of Period Boundaries
      , date_trunc(date_day, week(sunday)) as week_start_date 
      , date_trunc(date_day, month) as month_start_date
      , date_trunc(date_day, quarter) as quarter_start_date
      , date_trunc(date_day, year) as year_start_date

      -- End of Period Boundaries
      , last_day(date_day, week(sunday)) as week_end_date
      , last_day(date_day, month) as month_end_date
      , last_day(date_day, quarter) as quarter_end_date
      , last_day(date_day, year) as year_end_date

      -- Relative Calculations (evaluated against today's UTC date)
      , date_diff(current_date('UTC'), date_day, day) as days_ago
      , date_diff(date_trunc(current_date('UTC'), week(sunday)), date_trunc(date_day, week(sunday)), week) as weeks_ago
      , date_diff(date_trunc(current_date('UTC'), month), date_trunc(date_day, month), month) as months_ago
      , date_diff(date_trunc(current_date('UTC'), year), date_trunc(date_day, year), year) as years_ago

      -- Flags
      , extract(dayofweek from date_day) in (1, 7) as is_weekend
      , extract(dayofweek from date_day) not in (1, 7) as is_weekday
  from dim_date
)

, prov_volumes_ranked as (
  -- surfaces lifetime procedures and peer ranking by specialty using rank and dense rank (for continuity when tied)
  select
   provider.provider_id
  , provider.specialty_source_value
  , count(distinct proc_event.procedure_occurrence_id) as lifetime_procedures
  , rank() over (partition by provider.specialty_source_value order by count(distinct proc_event.procedure_occurrence_id) desc) as within_specialty_rank
  , dense_rank() over (partition by provider.specialty_source_value order by count(distinct proc_event.procedure_occurrence_id) desc) as within_specialty_dense_rank
  from proc_event
  left join provider
    on provider.provider_id = proc_event.provider_id
  group by all
)

/* Combined into unified dataset */

, final as (
  -- combines procedure, mrn, provider details
  select
    -- patient details
    proc_event.person_id as mrn
  , person_enriched.pat_name
  , pat_loc.zip as pat_loc_zip
  , pat_loc.county as pat_loc_county
  , pat_loc.city as pat_loc_city
  , pat_loc.state as pat_loc_state
  , person_enriched.pat_gender
  , person_enriched.pat_dob 
  , person_enriched.pat_age
  , date_diff(proc_date.date_utc, pat_dob, year) as pat_age_at_adm
  , person_enriched.pat_expired
  , person_enriched.death_date
  , case when person_enriched.death_date between condition_occurrence.condition_start_date and condition_occurrence.condition_end_date then 1 else 0 end as expired_during_stay
  , person_enriched.death_type

  -- procedure details: performing provider dictates care site/proc site
  , proc_event.visit_occurrence_id as visit_no
  , condition_occurrence.condition_start_date as adm_date
  , condition_occurrence.condition_end_date as dsch_date
  , proc_event.procedure_dat as proc_date
  , proc_type.concept_name as proc_type_name
  , proc_type.vocabulary_id as proc_type_vocabulary_id
  , proc_event.procedure_seq_num
  , proc_event.procedure_source_value --? cpt desc
  , proc_event.procedure_source_concept_id --?
  , proc_event.procedure_occurrence_id --?
  , proc_event.procedure_concept_id
  , proc.concept_name as proc_name
  , proc.vocabulary_id as proc_vocabulariy_id
  , care_site.care_site_name
  , care_site.care_site_source_value
  , care_site.place_of_service_source_value

  -- days since last procedure
  , prev_proc.concept_name as prev_proc_name
  , proc_event.prev_procedure_date
  , proc_event.days_since_last_procedure

  -- procedure date details
  , proc_date.year_number as proc_year
  , proc_date.quarter_number as proc_qtr
  , proc_date.month_number as proc_month
  , proc_date.month_name as proc_month_name
  , proc_date.day_of_month as proc_day_of_month
  , proc_date.day_of_week_number as proc_day_of_week
  , proc_date.day_of_week_name as proc_day_of_week_name
  , proc_date.is_weekend as proc_date_is_weekend
  , proc_date.is_weekday as proc_date_is_weekday
  , proc_date.week_start_date as proc_week_start_date
  , proc_date.week_end_date as proc_week_end_date
  , proc_date.days_ago as proc_days_ago
  , proc_date.weeks_ago as proc_weeks_ago
  , proc_date.months_ago as proc_months_ago
  , proc_date.years_ago as proc_years_ago

  -- provider details
  , provider.provider_name
  , provider.npi
  , provider.specialty_source_value as specialty
  , prov_volumes_ranked.lifetime_procedures
  , prov_volumes_ranked.within_specialty_rank
  , prov_volumes_ranked.within_specialty_dense_rank

  from proc_event
  inner join person_enriched
    on person_enriched.person_id = proc_event.person_id
  inner join dim_date_enriched proc_date
    on proc_date.date_sk = proc_event.date_sk
  left join location pat_loc
    on pat_loc.location_id = person_enriched.location_id
  left join provider
    on provider.provider_id = proc_event.provider_id
  left join care_site
    on care_site.care_site_id = provider.care_site_id
  left join concept proc
    on proc.concept_id = proc_event.procedure_concept_id
    and proc.domain_id = 'Procedure'
  left join concept proc_type
    on proc_type.concept_id = proc_event.procedure_type_concept_id
    and proc_type.domain_id = 'Type Concept'
  left join condition_occurrence
    on condition_occurrence.visit_occurrence_id = proc_event.visit_occurrence_id
  left join concept prev_proc
    on prev_proc.concept_id = proc_event.prev_procedure_concept_id
  left join prov_volumes_ranked
    on prov_volumes_ranked.provider_id = proc_event.provider_id
  where 1 = 1
  and proc_date.date_utc = '2010-12-01'
  group by all
)

select 
* 
from final
;

-- original rowcount: 82327, ~5s (just proc_event)
-- final rowcount: 82327, 22s
