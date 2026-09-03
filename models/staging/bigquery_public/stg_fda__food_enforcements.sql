with

source as (
    select * from {{ source('fda_food','food_enforcement') }}
)

,renamed as (
    select
     {{ dbt_utils.generate_surrogate_key(
        ['event_id', 'classification','recall_number','report_date','product_description','product_quantity'] 
     ) }} as recall_sk
    ,cast(classification as string) as class
    ,cast(postal_code as string) as postal_code
    ,cast(recall_number as string) as recall_number
    ,cast(city as string) as geo_city 
    ,cast(event_id as string) as event_id
    ,cast(distribution_pattern as string) as distribution_pattern
    ,cast(recalling_firm as string) as recalling_firm
    ,cast(voluntary_mandated as string) as voluntary_mandated
    ,cast(state as string) as geo_state 
    ,cast(reason_for_recall as string) as reason
    ,cast(initial_firm_notification as string) as initial_notification
    ,cast(status as string) as status
    ,cast(product_type as string) as product_type   
    ,cast(country as string) as geo_country
    ,{{ dbt_utils.generate_surrogate_key(
        ['recalling_firm','product_description'] 
     ) }} as product_sk
    ,cast(product_description as string) as product_description
    ,cast(code_info as string) as product_code_info
    ,cast(address_1 as string) as address_line_1
    ,cast(address_2 as string) as address_line_2
    ,cast(product_quantity as string) as affected_product_quantity
    ,trim(regexp_extract(product_quantity, r'[\d,]+\s*(.*)$')) as affected_amount_unit_type
    ,cast(more_code_info as string) as product_more_code_info

    -- timestamps
    ,{{ dbt.date_trunc('day', 'center_classification_date') }} as classification_date
    ,{{ dbt.date_trunc('day', 'report_date') }} as report_date 
    ,{{ dbt.date_trunc('day', 'termination_date') }} as termination_date 
    ,{{ dbt.date_trunc('day', 'recall_initiation_date') }} as recall_initiation_date   

    -- numbers
    ,safe_cast(
        replace(
            regexp_extract(product_quantity, r'([\d,]+)'), 
            ',', ''
        ) as int64
    ) as affected_amount
    
    -- Extract text following the digits
  

    from source
)

select * from renamed