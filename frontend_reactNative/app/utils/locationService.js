import axios from 'axios';

const MAPBOX_API_KEY = 'pk.eyJ1Ijoia2V0YW4zNTEiLCJhIjoiY21hbHVva2pnMGN6ajJrcHJ4ejdleGUwZCJ9.V1OW8gbg8Pdo1nhJD-a3Fw'; // Replace with your actual key

export const fetchPlaceSuggestions = async (query) => {
  if (!query) return [];
  try {
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
      {
        params: {
          access_token: MAPBOX_API_KEY,
          autocomplete: true,
          country:"NZ",
          limit: 5,
        },
      }
    );
    return response.data.features.map(item => ({
      name: item.place_name,
      coordinates: item.geometry.coordinates, // [lng, lat]
    }));
  } catch (error) {
    console.error("Mapbox fetch error:", error);
    return [];
  }
};

