/* Synthetic Data for Measuring Scheduled Slot Usage */

with 

   business_days as (
    /* Synthetic Clinic Business Days */
    select 
       cast('2026-06-01' as date) as business_date
    , 'Monday' as day_of_week 
    
    union all
    
    select 
       cast('2026-06-03' as date) as business_date
    , 'Wednesday' as day_of_week
)

, slot_time_spine as (
    /* Creates slot buckets for before, during, and after business hours */

    /* 1. Generates 30 minute slots between 8 AM - 5 PM (480 to 1020 minutes) for each business day */
    select 
      b.business_date
    , b.day_of_week
    , slot_start_min as slot_start_min
    , slot_start_min + 30 as slot_end_min
    , row_number() over (partition by b.business_date order by slot_start_min) as slot_id
    , 'Standard' as time_of_day_category
    from business_days b
    cross join unnest (generate_array(480, 990, 30)) AS slot_start_min

    union all

    /* 2. Catch-all slot for procedure mins logged before business day begins (i.e. captures anything before 8:00 AM / minute 480) */
    select 
      business_date
    , day_of_week
    , 0 as slot_start_min
    , 480 as slot_end_min
    , 0 as slot_id
    , 'Pre-Open' as time_of_day_category
    from business_days

    union all

    /* 3. Catch-all slot for procedure mins logged after business day ends (i.e. captures anything after 5:00 PM / minute 1020) */
    select 
      business_date
    , day_of_week
    , 1020 as slot_start_min
    , 1440 as slot_end_min -- Midnight
    , 999 as slot_id
    , 'After-Hours' as time_of_day_category
    from business_days

)

, scheduled_slots AS (
    /* Flag scheduled slot times based on day of week */
    select 
      business_date
    , day_of_week
    , slot_id
    , slot_start_min
    , slot_end_min
    , case
        /* Pre-Open and After-Hours - Unscheduled Slots */
        when time_of_day_category <> 'Standard' then 0

        /* Wednesday Schedule: 11:00 AM (660) to 3:00 PM (900) */
        when day_of_week = 'Wednesday' 
            and slot_start_min >= 660 
            and slot_end_min <= 900 
            then 1
            
        /* Standard Schedule: 8am-12pm (480-720) AND 2pm-5pm (840-1020) */
        when day_of_week <> 'Wednesday' 
            and (
                (slot_start_min >= 480 and slot_end_min <= 720) 
                or (slot_start_min >= 840 and slot_end_min <= 1020)
            ) then 1
        else 0
      end as scheduled_flag
    , time_of_day_category
    from slot_time_spine
)

, completed_visits AS (
    /* Synthetic completed patient visits (stored as minutes from midnight) */
    select 
      /* Monday 8:00 - 11:00 (Utilized) */
      1234567 as visit_no
    , cast('2026-06-01' as date) as service_date
    , 480 as proc_start_min
    , 673 as proc_end_min 
    
    union all
    
    select 
      /* Monday 2:34 - 3:20 (Utilized) */
      2345678 as visit_no
    , cast('2026-06-01' as date)
    , 874
    , 920
    
    union all

    select 
        /* Wednesday 11:00 - 1:00 (Utilized part of Wed slot) */
      3456789 as visit_no  
    , cast('2026-06-03' as date)
    , 360
    , 780      
)

, final as (
    /* Measure slot vs. business day usage */
    select 
      s.business_date
    , s.day_of_week
    , format_time('%H:%M', time(timestamp_add(timestamp(business_date), interval slot_start_min minute))) as time_slot
    , s.scheduled_flag
    , case 
        /* flags whether slot had logged procedure time */
        when v.proc_start_min < s.slot_end_min 
            and v.proc_end_min > s.slot_start_min then 1
            else 0
        end as utilized_flag
    , v.visit_no
    , min(timestamp(datetime_add(cast(s.business_date as datetime), interval s.slot_start_min minute), 'America/Denver')) 
      over (partition by s.business_date) as clinic_start_datetime
    , max(timestamp(datetime_add(cast(s.business_date as datetime), interval s.slot_end_min minute), 'America/Denver')) 
      over (partition by s.business_date) as clinic_end_datetime
    , timestamp(datetime_add(cast(s.business_date as datetime), interval v.proc_start_min minute), 'America/Denver') as proc_start_datetime
    , timestamp(datetime_add(cast(s.business_date as datetime), interval v.proc_end_min minute), 'America/Denver') as proc_end_datetime
    , v.proc_end_min - v.proc_start_min as proc_elap_mins
    , greatest(
        0
      , least(s.slot_end_min, v.proc_end_min) - greatest(s.slot_start_min, v.proc_start_min)
      ) as slot_elap_mins
    , case 
        /* on-time category (within 0-5 mins of slot start)*/
        when v.visit_no is null then null
        when v.proc_start_min - min(s.slot_start_min) over (partition by v.visit_no) between 0 and 5 then 'on-time'
        when v.proc_start_min - min(s.slot_start_min) over (partition by v.visit_no) < 0 then 'early'
        else 'late-start'
        end as on_time_category 
    , case 
        when v.visit_no is null then null 
        else s.time_of_day_category 
        end as time_of_day_category
    from scheduled_slots s
    left join completed_visits v
        on s.business_date = v.service_date
        and v.proc_start_min < s.slot_end_min
        and v.proc_end_min > s.slot_start_min
)

select 
* 
, case 
    when scheduled_flag = 1
     and utilized_flag = 0
     then 30
     end as unused_sched_slot_mins
, case 
    /* Assertion - Elapsed Mins Harmony: Proc elap = sum total slot elap mins */
    when visit_no is null then null
    when sum(slot_elap_mins) over (partition by visit_no) <> proc_elap_mins then 1
    else 0 
    end as mismatched_elap_time_flag
, case 
    /* Assertion - Sequential Timestamps: no negative procedure or slot elapsed times */
    when visit_no is null then null
    when proc_elap_mins < 0 then 1
    when slot_elap_mins < 0 then 1
    else 0
    end as negative_elap_mins_flag
from final
where scheduled_flag = 1 
or slot_elap_mins is not null
order by 
    business_date
  , time_slot
;
