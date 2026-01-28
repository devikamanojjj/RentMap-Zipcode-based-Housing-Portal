# RentMap: Zipcode-based Housing Portal

RentMap is a React-based web application that visualizes housing data (sales and rent) on an interactive map. Users can explore housing trends by zipcode, view detailed information for each location, and make informed decisions about renting or buying properties.

## Features

- Interactive map with markers for each zipcode
- Popup details for sales and rent data
- Data loaded from CSV files
- Responsive and modern UI

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/devikamanojjj/RentMap-Zipcode-based-Housing-Portal.git
   cd RentMap-Zipcode-based-Housing-Portal
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Running the App

1. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```
2. Open your browser and go to `http://localhost:3000`

## Project Structure

```
public/
  index.html
  latlong.csv
  sales_rent_result 1.csv
src/
  App.js
  App.css
  index.js
  components/
    MapContainer.js
    MapContainer.css
    MarkerPopup.js
    MarkerPopup.css
latlong.csv
sales_rent_result 1.csv
package.json
```

## Data Files

- `latlong.csv`: Contains latitude and longitude for each zipcode.
- `sales_rent_result 1.csv`: Contains sales and rent data by zipcode.

## Map Integration

- Uses Mapbox for map rendering.
- Requires a Mapbox access token. Set your token in a `.env` file or as an environment variable:
  ```env
  REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
  ```

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License.
