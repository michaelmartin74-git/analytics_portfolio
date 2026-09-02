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
    r.*
    ,rc.category as reason_category
    ,zm.geo_county as zip_county
    ,zm.geo_state as zip_state
    ,zm.state_county_fips as zip_state_county_fips
    ,zm.class_fips as zip_class_fips
    from recalls r
    left join reason_category rc
        on rc.reason = r.reason
    left join zip_code_mappings zm
        on zm.zip_code = r.postal_code
)

select
*
from final