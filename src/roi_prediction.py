import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

def calculate_annual_rent(df):
    df['annual_rent'] = df['monthly_rent'].fillna(0) * 12
    return df

def calculate_base_roi(df):
    df['roi'] = np.where(
        (df['sales_price'].fillna(0) > 0),
        (df['annual_rent'] / df['sales_price']) * 100,
        np.nan
    )
    return df

def calculate_weighted_roi(df):
    df['weighted_roi'] = np.where(
        (df['sales_price'].fillna(0) > 0) & (df['inventory'].fillna(0) > 0),
        (df['annual_rent'] * df['inventory']) / (df['sales_price'] * df['inventory']) * 100,
        np.nan
    )
    return df

def aggregate_roi(df):
    grouped = df.groupby(['zipcode', 'bedroom_type'])['roi']
    agg = grouped.agg(['mean', 'median', 'std']).reset_index()
    agg.columns = ['zipcode', 'bedroom_type', 'roi_mean', 'roi_median', 'roi_std']
    return agg

def predict_rent_and_roi(df):
    results = []
    for (zipcode, bedroom_type), group in df.groupby(['zipcode', 'bedroom_type']):
        group = group.sort_values('date')
        X = np.arange(len(group)).reshape(-1, 1)
        y = group['monthly_rent'].fillna(0).values
        if len(group) > 1 and np.any(y):
            model = LinearRegression().fit(X, y)
            future_X = np.arange(len(group), len(group) + 12).reshape(-1, 1)
            predicted_monthly_rent = model.predict(future_X)
            predicted_annual_rent = np.sum(predicted_monthly_rent)
        else:
            predicted_annual_rent = group['monthly_rent'].fillna(0).mean() * 12
        sales_price = group['sales_price'].fillna(0).iloc[-1]
        predicted_roi = (predicted_annual_rent / sales_price) * 100 if sales_price > 0 else np.nan
        results.append({
            'zipcode': zipcode,
            'bedroom_type': bedroom_type,
            'predicted_annual_rent': predicted_annual_rent,
            'sales_price': sales_price,
            'predicted_roi': predicted_roi
        })
    return pd.DataFrame(results)

def rank_zipcodes_by_predicted_roi(pred_df):
    ranked = pred_df.groupby('zipcode')['predicted_roi'].mean().reset_index()
    ranked = ranked.sort_values('predicted_roi', ascending=False)
    return ranked

def process_real_estate_data(df):
    df = calculate_annual_rent(df)
    df = calculate_base_roi(df)
    df = calculate_weighted_roi(df)
    agg_roi = aggregate_roi(df)
    pred_df = predict_rent_and_roi(df)
    ranked_zipcodes = rank_zipcodes_by_predicted_roi(pred_df)
    return agg_roi, pred_df, ranked_zipcodes

# Example usage:
# df = pd.read_csv('your_data.csv')
# agg_roi, pred_df, ranked_zipcodes = process_real_estate_data(df)
# print(agg_roi.head())
# print(pred_df.head())
# print(ranked_zipcodes.head())
