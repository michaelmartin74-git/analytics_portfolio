
select
 lpad(cast(zip as string), 5, '0') as zip_code
,cast(countyname as string) as geo_county
,cast(state as string) as geo_state
,cast(stcountyfp as string) as state_county_fips
,cast(classfp as string) as class_fips
from {{ ref('zip_codes') }}