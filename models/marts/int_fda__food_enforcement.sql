with

recalls as (
    select * from {{ ref('stg_fda__food_enforcement') }}
)

,reason_category as (
    select * from {{ ref('recall_reasons_classified') }}
)

,zip_code_mappings as (
    select * from {{ ref('stg__zip_code_mappings') }}
)

,final as (
    select
     r.recall_sk
    ,r.class
    ,r.postal_code
    ,r.recall_number
    ,r.geo_city
    ,r.event_id
    ,r.distribution_pattern
    ,r.recalling_firm
    ,r.voluntary_mandated
    ,r.geo_state
    ,r.reason
    ,r.initial_notification
    ,r.status
    ,r.product_type
    ,r.geo_country
    ,r.product_description
    ,r.product_code_info
    ,r.address_line_1
    ,r.address_line_2
    ,r.affected_product_quantity
    ,r.affected_amount_unit_type
    ,r.product_more_code_info
    ,cast(format_date('%Y%m%d', r.classification_date) as int64) as certification_date_sk
    ,cast(format_date('%Y%m%d', r.report_date) as int64) as report_date_sk
    ,cast(format_date('%Y%m%d', r.termination_date) as int64) as termination_date_sk
    ,cast(format_date('%Y%m%d', r.recall_initiation_date) as int64) as recall_initiation_date_sk
    ,r.affected_amount
    ,rc.category as reason_category
    ,zm.geo_county as zip_county
    ,zm.geo_state as zip_state
    ,zm.state_county_fips as zip_state_county_fips
    ,zm.class_fips as zip_class_fips
    from recalls r
    left join reason_category rc
        on rc.reason = r.reason
    left join zip_code_mappings zm
        on zm.zip_code = substr(r.postal_code,1,5)
)

select
*
from final