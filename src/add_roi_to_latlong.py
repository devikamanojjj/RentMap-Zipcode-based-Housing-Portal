"""Prepare ROI data and merge into latlong CSV."""
import pandas as pd
from roi_prediction import process_real_estate_data

# Use absolute paths for CSV files
latlong_df = pd.read_csv('public/latlong.csv')
sales_rent_df = pd.read_csv('public/sales_rent_result 1.csv')

# Add a 'date' column for sorting
if 'sales_month_year' in sales_rent_df.columns and 'rent_month_year' in sales_rent_df.columns:
    sales_rent_df['date'] = sales_rent_df['sales_month_year'].fillna(sales_rent_df['rent_month_year'])
elif 'sales_month_year' in sales_rent_df.columns:
    sales_rent_df['date'] = sales_rent_df['sales_month_year']
elif 'rent_month_year' in sales_rent_df.columns:
    sales_rent_df['date'] = sales_rent_df['rent_month_year']
# Ensure 'bedroom_type' column exists for ROI aggregation
if 'bedroom_type' not in sales_rent_df.columns:
    # Prefer sales_bedrooms, else rent_bedrooms
    if 'sales_bedrooms' in sales_rent_df.columns:
        sales_rent_df['bedroom_type'] = sales_rent_df['sales_bedrooms']
    elif 'rent_bedrooms' in sales_rent_df.columns:
        sales_rent_df['bedroom_type'] = sales_rent_df['rent_bedrooms']



# Prepare sales and rent data for ROI calculation
# Use sales_bedrooms for sales records, rent_bedrooms for rent records
sales_rent_df['monthly_rent'] = sales_rent_df['rent_avg_price']
sales_rent_df['sales_price'] = sales_rent_df['sales_price']
sales_rent_df['zipcode'] = sales_rent_df['sales_zipcode']
# Use rent_inventory for inventory
if 'rent_inventory' in sales_rent_df.columns:
    sales_rent_df['inventory'] = sales_rent_df['rent_inventory'].fillna(0)
else:
    sales_rent_df['inventory'] = 0
# For bedroom_type, prefer sales_bedrooms if present, else rent_bedrooms
if 'sales_bedrooms' in sales_rent_df.columns:
    sales_rent_df['bedroom_type'] = sales_rent_df['sales_bedrooms']
elif 'rent_bedrooms' in sales_rent_df.columns:
    sales_rent_df['bedroom_type'] = sales_rent_df['rent_bedrooms']

# Calculate ROI for each zipcode
_, pred_df, ranked_zipcodes = process_real_estate_data(sales_rent_df)

# Merge ROI with latlong
roi_map = dict(zip(ranked_zipcodes['zipcode'], ranked_zipcodes['predicted_roi']))
latlong_df['roi'] = latlong_df['zipcodes'].map(roi_map)

# Save to new CSV
latlong_df.to_csv('public/latlong_with_roi.csv', index=False)
print('latlong_with_roi.csv created with ROI column.')
