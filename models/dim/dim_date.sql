{{
    config(
        materialized='table',
        unique_key='date_sk'
    )
}}

with date_spine as (

    -- Adjust start/end dates to fit your historical and future requirements
    select 
        date_day
    from unnest(
        generate_date_array(
            date('2015-01-01'), 
            date_add(current_date('UTC'), interval 1 year), 
            interval 1 day
        )
    ) as date_day

),

date_attributes as (

    select
        -- Primary Keys & Core Dates
        cast(format_date('%Y%m%d', date_day) as int64) as date_sk
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
        , date_trunc(date_day, week(sunday)) as week_start_date -- Change to week(monday) if preferred
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

    from date_spine

)

select
    date_sk
    , date_utc
    
    -- Calendar
    , year_number
    , quarter_number
    , month_number
    , month_name
    , day_of_month
    , day_of_week_number
    , day_of_week_name

    -- Period Starts & Ends
    , week_start_date
    , week_end_date
    , month_start_date
    , month_end_date
    , quarter_start_date
    , quarter_end_date
    , year_start_date
    , year_end_date

    -- Relative Offsets (Positive = Past, Negative = Future, 0 = Current)
    , days_ago
    , weeks_ago
    , months_ago
    , years_ago

    -- Boolean Flags
    , date_utc = current_date('UTC') as is_today
    , days_ago = 1 as is_yesterday
    
    -- Relative Period Flags
    , days_ago >= 0 as is_past
    , date_utc > current_date('UTC') as is_future
    , weeks_ago = 0 as is_current_week
    , weeks_ago = 1 as is_last_week
    , months_ago = 0 as is_current_month
    , months_ago = 1 as is_last_month
    , years_ago = 0 as is_current_year
    , years_ago = 1 as is_last_year

    -- Day Types
    , day_of_week_number in (1, 7) as is_weekend
    , day_of_week_number not in (1, 7) as is_weekday

from date_attributes