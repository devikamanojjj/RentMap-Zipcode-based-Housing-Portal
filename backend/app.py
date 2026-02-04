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
    agg_roi, pred_df, ranked_zipcodes = process_real_estate_data(df)
    return jsonify({
        'agg_roi': agg_roi.to_dict(orient='records'),
        'pred_df': pred_df.to_dict(orient='records'),
        'ranked_zipcodes': ranked_zipcodes.to_dict(orient='records')
    })

if __name__ == '__main__':
    app.run(debug=True)
