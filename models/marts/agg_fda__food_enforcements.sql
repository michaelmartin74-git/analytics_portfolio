
select
 report_date_sk
,class
,geo_city
,geo_state
,geo_country
,postal_code
,zip_county
,zip_state
,zip_state_county_fips
,zip_class_fips
,count(distinct recall_sk) as recall_count
,count(distinct event_id) as event_count
,count(distinct product_sk) as affected_skus
,recalling_firm
,voluntary_mandated
,initial_notification
,status
,product_type
,sum(affected_amount) as affected_amount
,sum(init_to_class_days) as init_to_class_days
,sum(class_to_term_days) as class_to_term_days
,sum(init_to_term_days) as init_to_term_days
,avg(init_to_class_days) as avg_init_to_class_days
,avg(class_to_term_days) as avg_class_to_term_days
,avg(init_to_term_days) as avg_init_to_term_days
,reason_category
from {{ ref('int_fda__food_enforcements_enriched') }}
group by all