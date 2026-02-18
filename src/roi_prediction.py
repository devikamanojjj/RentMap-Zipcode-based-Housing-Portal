import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression


def _coerce_numeric(df, columns):
    for column in columns:
        if column not in df.columns:
            df[column] = 0
        df[column] = pd.to_numeric(df[column], errors='coerce').fillna(0)
    return df


def calculate_annual_rent(df):
    df = _coerce_numeric(df, ['monthly_rent'])
    df['annual_rent'] = df['monthly_rent'] * 12
    return df

def calculate_base_roi(df):
    df = _coerce_numeric(df, ['sales_price', 'annual_rent'])
    df['roi'] = np.where(
        (df['sales_price'] > 0),
        (df['annual_rent'] / df['sales_price']) * 100,
        np.nan
    )
    return df

def calculate_weighted_roi(df):
    df = _coerce_numeric(df, ['sales_price', 'inventory', 'annual_rent'])
    df['weighted_roi'] = np.where(
        (df['sales_price'] > 0) & (df['inventory'] > 0),
        (df['annual_rent'] * df['inventory']) / (df['sales_price'] * df['inventory']) * 100,
        np.nan
    )
    return df


def aggregate_roi_sumproduct(df):
    df = _coerce_numeric(df, ['monthly_rent', 'inventory', 'sales_price'])
    results = []
    for zipcode, group in df.groupby('zipcode'):
        rent_avg_price = group['monthly_rent']
        rent_inventory = group['inventory']
        sales_price = group['sales_price']
        sumproduct_rent = np.sum(rent_avg_price * 12 * rent_inventory)
        sumproduct_sales = np.sum(sales_price * rent_inventory)
        roi = (sumproduct_rent / sumproduct_sales) * 100 if sumproduct_sales > 0 else np.nan
        results.append({
            'zipcode': zipcode,
            'roi_sumproduct': roi
        })
    return pd.DataFrame(results)

def predict_rent_and_roi(df):
    required_columns = {'zipcode', 'bedroom_type', 'date', 'monthly_rent', 'sales_price'}
    if not required_columns.issubset(df.columns):
        return pd.DataFrame(columns=[
            'zipcode',
            'bedroom_type',
            'predicted_annual_rent',
            'sales_price',
            'predicted_roi'
        ])

    df = df.copy()
    df = _coerce_numeric(df, ['monthly_rent', 'sales_price'])
    df['date'] = pd.to_datetime(df['date'], errors='coerce')

    results = []
    for (zipcode, bedroom_type), group in df.groupby(['zipcode', 'bedroom_type']):
        group = group.sort_values('date', na_position='last')
        X = np.arange(len(group)).reshape(-1, 1)
        y = group['monthly_rent'].values
        if len(group) > 1 and np.any(y):
            model = LinearRegression().fit(X, y)
            future_X = np.arange(len(group), len(group) + 12).reshape(-1, 1)
            predicted_monthly_rent = model.predict(future_X)
            predicted_annual_rent = np.sum(predicted_monthly_rent)
        else:
            predicted_annual_rent = group['monthly_rent'].mean() * 12
        sales_price = group['sales_price'].iloc[-1]
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
    if pred_df.empty:
        return pd.DataFrame(columns=['zipcode', 'predicted_roi'])
    ranked = pred_df.groupby('zipcode')['predicted_roi'].mean().reset_index()
    ranked = ranked.sort_values('predicted_roi', ascending=False)
    return ranked

def process_real_estate_data(df):
    df = df.copy()
    if 'zipcode' not in df.columns:
        raise ValueError("Missing required column: 'zipcode'")

    df['zipcode'] = df['zipcode'].astype(str).str.strip()
    df = _coerce_numeric(df, ['monthly_rent', 'sales_price', 'inventory'])

    df = calculate_annual_rent(df)
    df = calculate_base_roi(df)
    df = calculate_weighted_roi(df)
    agg_roi = aggregate_roi_sumproduct(df)
    pred_df = predict_rent_and_roi(df)
    ranked_zipcodes = rank_zipcodes_by_predicted_roi(pred_df)
    return agg_roi, pred_df, ranked_zipcodes

# Example usage:
# df = pd.read_csv('your_data.csv')
# agg_roi, pred_df, ranked_zipcodes = process_real_estate_data(df)
# print(agg_roi.head())
# print(pred_df.head())
# print(ranked_zipcodes.head())
