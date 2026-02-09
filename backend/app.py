from flask import Flask, request, jsonify
import pandas as pd
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))
from roi_prediction import process_real_estate_data

app = Flask(__name__)

@app.route('/api/roi', methods=['POST'])
def roi():
    data = request.get_json()
    df = pd.DataFrame(data)
    # Rename rent_avg_price to monthly_rent if present
    if 'monthly_rent' not in df.columns and 'rent_avg_price' in df.columns:
        df = df.rename(columns={'rent_avg_price': 'monthly_rent'})
    # Check for required column
    if 'monthly_rent' not in df.columns:
        return jsonify({'error': "Missing required column: 'monthly_rent'"}), 400
    try:
        agg_roi, pred_df, ranked_zipcodes = process_real_estate_data(df)
        return jsonify({
            'agg_roi': agg_roi.to_dict(orient='records'),
            'pred_df': pred_df.to_dict(orient='records'),
            'ranked_zipcodes': ranked_zipcodes.to_dict(orient='records')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
