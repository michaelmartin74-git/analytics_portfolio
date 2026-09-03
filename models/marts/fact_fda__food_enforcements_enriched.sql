select
 recall_sk
,class
,postal_code
,recall_number
,geo_city
,event_id
,distribution_pattern
,recalling_firm
,voluntary_mandated
,geo_state
,reason
,initial_notification
,status
,product_type
,geo_country
,product_sk as affected_sku
,product_description
,address_line_1
,address_line_2
,affected_product_quantity
,affected_amount_unit_type
,certification_date_sk
,report_date_sk
,termination_date_sk
,recall_initiation_date_sk
,greatest(init_to_class_days,0) as init_to_class_days
,greatest(class_to_term_days,0) as class_to_term_days
,greatest(init_to_term_days,0) as init_to_term_days
,affected_amount
,reason_category
,zip_county
,zip_state
,zip_state_county_fips
,zip_class_fips
from {{ ref('int_fda__food_enforcements_enriched') }}