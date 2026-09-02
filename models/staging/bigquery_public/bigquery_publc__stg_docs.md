{% docs source_fda_food %}
Public datasets available through BigQuery
{% enddocs %}

{% docs table_food_enforcement %}
One record per recall recorded by the US FDA.
{% enddocs %}

{% docs column_classification %}
Numerical designation (I, II, or III) assigned by FDA indicating health hazard severity:
- **Class I:** High risk (serious injury/death).
- **Class II:** Moderate risk (temporary/slight health threat).
- **Class III:** Low risk (unlikely adverse health reaction, minor violations).
{% enddocs %}

{% docs column_report_date %}
Date the FDA issued the enforcement report for the product recall.
{% enddocs %}

{% docs column_recall_initiation_date %}
Date the firm first began notifying the public or consignees of the recall.
{% enddocs %}

{% docs column_recall_number %}
Numerical designation assigned by FDA to a specific recall event for tracking.
{% enddocs %}

{% docs column_city %}
The city where the recalling firm is located.
{% enddocs %}

{% docs column_event_id %}
Numerical designation assigned by FDA to a specific recall event for tracking.
{% enddocs %}

{% docs column_distribution_pattern %}
General area of initial distribution (e.g., states, countries, or nationwide).
{% enddocs %}

{% docs column_recalling_firm %}
The firm that initiates or holds primary responsibility for the recalled product.
{% enddocs %}

{% docs column_voluntary_mandated %}
Indicates whether the recall was firm-initiated (voluntary) or ordered by the FDA (mandated).
{% enddocs %}

{% docs column_state %}
The U.S. state where the recalling firm is located.
{% enddocs %}

{% docs column_reason_for_recall %}
Description of how the product is defective and violates statutes.
{% enddocs %}

{% docs column_initial_firm_notification %}
Method(s) used by the firm to initially notify consignees or the public.
{% enddocs %}

{% docs column_status %}
Recall status:
- **On-Going:** In progress
- **Completed:** Retrieved/corrected
- **Terminated:** FDA closed
- **Pending:** Classification in progress
{% enddocs %}

{% docs column_country %}
The country where the recalling firm is located.
{% enddocs %}

{% docs column_product_description %}
Brief description of the product being recalled.
{% enddocs %}

{% docs column_code_info %}
Lot/serial numbers, expiration dates, or codes appearing on the product/labeling.
{% enddocs %}

{% docs column_product_quantity %}
The amount of defective product subject to recall.
{% enddocs %}

{% docs column_recall_sk %}
Primary key generated via hash of `event_id`, `classification`, `recall_number`, and `report_date`.
{% enddocs %}

{% docs column_affected_product_quantity %}
Raw, unparsed string text representing quantity and unit of measure.
{% enddocs %}

{% docs column_affected_amount %}
Parsed numeric quantity extracted from `product_affected_quantity` (commas stripped).
{% enddocs %}

{% docs column_affected_amount_unit_type %}
Parsed unit description text following the numeric quantity (e.g., 'boxes', 'cases', 'units').
{% enddocs %}