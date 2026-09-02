with

recalls as (
    select * from {{ ref('stg_fda__food_enforcement') }}
)

,reason_category as (
    select * from {{ ref('recall_reasons_classified') }}
)

,final as (
    select
    r.*
    ,rc.category as reason_category
    from recalls r
    left join reason_category rc
        on rc.reason = recalls.reason
)

select
*
from final
;