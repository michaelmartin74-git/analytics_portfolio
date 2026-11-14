/* Synthetic Data for Measuring Scheduled Slot Usage */

with 

  business_days as (
    /* Synthetic Clinic Business Days with their true operating windows */
    select 
      cast('2026-06-01' as date) as business_date
    , 'Monday' as day_of_week
    , 480 as open_min -- 8am
    , 1020 as close_min --5pm
    
    union all

    select 
      cast('2026-06-03' as date) as business_date
    , 'Wednesday' as day_of_week
    , 660 as open_min --11am
    , 900 as close_min --3pm
)

, slot_time_spine as (
    /* Creates slot buckets for before, during, and after business hours */

    /* 1. Generates 30 minute slots between each business day's open and close mins */
    select 
      b.business_date
    , b.day_of_week
    , slot_start_min as slot_start_min
    , slot_start_min + 30 as slot_end_min
    , row_number() over (partition by b.business_date order by slot_start_min) as slot_id
    , 'Standard' as time_of_day_category
    ,  open_min
    ,  close_min
    from business_days b
    cross join unnest(generate_array(b.open_min, b.close_min - 30, 30)) as slot_start_min

    union all

    /* 2. Catch-all slot for procedure mins logged before business day begins (i.e. captures anything before 8:00 AM / minute 480) */
    select 
      business_date
    , day_of_week
    , 0 as slot_start_min
    , open_min as slot_end_min
    , 0 as slot_id
    , 'Pre-Open' as time_of_day_category
    ,  open_min
    ,  close_min
    from business_days

    union all

    /* 3. Catch-all slot for procedure mins logged after business day ends (i.e. captures anything after 5:00 PM / minute 1020) */
    select 
      business_date
    , day_of_week
    , close_min as slot_start_min
    , 1440 as slot_end_min
    , 999 as slot_id
    , 'After-Hours' as time_of_day_category
    ,  open_min
    ,  close_min
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
            and slot_start_min >= open_min 
            and slot_end_min <= close_min 
            then 1
            
        /* Standard Schedule: 8am-12pm (480-720) AND 2pm-5pm (840-1020) */
        when day_of_week <> 'Wednesday' 
            and (
                (slot_start_min >= open_min and slot_end_min <= 720) 
                or (slot_start_min >= 840 and slot_end_min <= close_min)
            ) then 1
        else 0
      end as scheduled_flag
    , time_of_day_category
    from slot_time_spine
)

, completed_visits AS (
    /* Synthetic completed patient visits (stored as minutes from midnight) */
    select 
      /* Monday 8:00 - 11:13 (Utilized) */
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
        /* Wednesday 6:00 - 4:07 (Utilized part of Wed slot) */
      3456789 as visit_no  
    , cast('2026-06-03' as date)
    , 360
    , 967
)

, ranked_visits as (
  /* Sequences visits per business day for flagging on-time-starts (critical for keeping rest of day on schedule) */
  select
   *
  , dense_rank() over (partition by service_date order by proc_start_min) as visit_seq_per_day
  from completed_visits
)

, scheduled_vs_actual_visits as (
    /* Measure slot vs. business day usage */
    select 
      s.business_date
    , s.day_of_week
    , format_time('%H:%M', time(timestamp_add(timestamp(business_date), interval slot_start_min minute))) as time_slot
    , s.scheduled_flag
    , case when v.visit_no is not null then 1 else 0 end as utilized_flag
    , v.visit_no

    -- Create datetimes for business day, slots, procedures
    , min(
        case 
          when scheduled_flag = 1 
          then datetime_add(cast(s.business_date as datetime), interval s.slot_start_min minute)
        end
      ) over (partition by s.business_date) as clinic_start_datetime
    , max(
        case 
          when scheduled_flag = 1 
          then datetime_add(cast(s.business_date as datetime), interval s.slot_end_min minute)
        end
      ) over (partition by s.business_date) as clinic_end_datetime
    , datetime_add(cast(s.business_date as datetime), interval s.slot_start_min minute) as slot_start_datetime
    , datetime_add(cast(s.business_date as datetime), interval s.slot_end_min minute) as slot_end_datetime
    , datetime_add(cast(s.business_date as datetime), interval v.proc_start_min minute) as proc_start_datetime
    , datetime_add(cast(s.business_date as datetime), interval v.proc_end_min minute) as proc_end_datetime

    -- Log procedure mins per slot (using least and greatest to account for partial slot use)
    , greatest(
        0
      , least(s.slot_end_min, v.proc_end_min) - greatest(s.slot_start_min, v.proc_start_min)
      ) as slot_mins_used

    -- Flags whether slot used before, during, after regular business hours
    , case 
        when v.visit_no is null then null 
        else s.time_of_day_category 
        end as time_of_day_category
    , v.visit_seq_per_day
    from scheduled_slots s
    left join ranked_visits v
        on s.business_date = v.service_date
        and v.proc_start_min < s.slot_end_min
        and v.proc_end_min > s.slot_start_min
)

, final as (
    /* Layers in additional elapsed mins and on-time categories (in Snowflake, this CTE unnecessary as aliases can be called in CASE statement) */
    select 
    * 
    , date_diff(proc_end_datetime, proc_start_datetime, minute) as proc_elap_mins
    , case 
      /* on-time category (within 0-5 mins of slot start)*/
        when visit_seq_per_day = 1
         then (
          case 
            when date_diff(proc_start_datetime, clinic_start_datetime, minute) between 0 and 5 then 'on-time'
            when date_diff(proc_start_datetime, clinic_start_datetime, minute) > 5 then 'late'
            else 'early'
            end
            )
        end as first_start_accuracy_category
    from scheduled_vs_actual_visits
    where scheduled_flag = 1 
    or slot_mins_used is not null
    
)

select 
* 
, case 
    /* Computes unused scheduled slot time (mins) */
    when scheduled_flag = 1 
    then 30 - coalesce(slot_mins_used,0) 
    end as slot_mins_unused_new
, case 
    /* Assertion - Elapsed Mins Harmony: Proc elap = sum total slot elap mins */
    when visit_no is null then null
    when sum(slot_mins_used) over (partition by visit_no) <> proc_elap_mins then 1
    else 0 
    end as mismatched_elap_time_flag
, case 
    /* Assertion - Sequential Timestamps: no negative procedure or slot elapsed times */
    when visit_no is null then null
    when proc_elap_mins < 0 then 1
    when slot_mins_used < 0 then 1
    else 0
    end as negative_elap_mins_flag
from final
order by
  slot_start_datetime
;
