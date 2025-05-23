import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth } from '../firebaseConfig';
import Constants from 'expo-constants';

const MAPBOX_API_KEY = Constants.expoConfig.extra.MAPBOX_API_KEY;
mapboxgl.accessToken = MAPBOX_API_KEY;

//Displays the map screen for the specific rideID for both the driver and the passenger
//Has an SOS and Home button for the passenger to send an emergency button or navigate back to the main dashboard
//Has a Complete button for the driver to mark the ride as completed
export default function MapViewScreen() {
  const { rideId, from, to,isDriver,driverId } = useLocalSearchParams();
  const fromCoord = JSON.parse(from);
  const toCoord = JSON.parse(to);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [notificationSent, setNotificationSent] = useState(false);
  const [rideStatus, setRideStatus] = useState(null);
  const router = useRouter();


  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude]);
      },
      (err) => console.warn('Error getting user location:', err),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (isDriver === 'true') return;
    let interval = setInterval(async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(
          `http://localhost:5000/api/rides/${rideId}`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setRideStatus(data.status);
        if (data.status === 'completed') {
          setShowRating(true);
          clearInterval(interval);
        }
      } catch (e) {
        console.error('Status poll failed', e);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isDriver]);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: fromCoord,
      zoom: 13,
    });

    mapRef.current = map;

    const originIcon = document.createElement('div');
    originIcon.innerHTML = '<svg height="40" viewBox="0 0 24 24" width="40" fill="red" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/></svg>';
    new mapboxgl.Marker(originIcon).setLngLat(fromCoord).addTo(map);

    const destIcon = document.createElement('div');
    destIcon.innerHTML = '<svg height="40" viewBox="0 0 24 24" width="40" fill="red" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/></svg>';
    new mapboxgl.Marker(destIcon).setLngLat(toCoord).addTo(map);

    if (userLocation) {
      const el = document.createElement('div');
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.backgroundColor = '#007aff';
      el.style.borderRadius = '50%';
      el.style.boxShadow = '0 0 6px rgba(0, 122, 255, 0.6)';

      new mapboxgl.Marker(el)
        .setLngLat(userLocation)
        .setPopup(new mapboxgl.Popup().setText('Your Location'))
        .addTo(map);
    }

    fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${fromCoord.join(',')};${toCoord.join(',')}?geometries=geojson&access_token=${mapboxgl.accessToken}`)
      .then(res => res.json())
      .then(data => {
        const route = data.routes[0].geometry;
        const duration = Math.round(data.routes[0].duration / 60); // ETA in minutes

        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: route,
          },
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b9',
            'line-width': 4,
          },
        });

        const coords = route.coordinates;
        let step = 0;

        const carEl = document.createElement('div');
        carEl.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24" fill="orange" xmlns="http://www.w3.org/2000/svg"><path d="M18.92 6.01C18.72 5.42 18.15 5 17.5 5H6.5C5.85 5 5.28 5.42 5.08 6.01L3 12V19C3 19.55 3.45 20 4 20H5C5.55 20 6 19.55 6 19V18H18V19C18 19.55 18.45 20 19 20H20C20.55 20 21 19.55 21 19V12L18.92 6.01ZM6.5 6.5H17.5L19.16 11H4.84L6.5 6.5ZM6 15C5.45 15 5 14.55 5 14C5 13.45 5.45 13 6 13C6.55 13 7 13.45 7 14C7 14.55 6.55 15 6 15ZM18 15C17.45 15 17 14.55 17 14C17 13.45 17.45 13 18 13C18.55 13 19 13.45 19 14C19 14.55 18.55 15 18 15Z"/></svg>';
        carEl.style.transform = 'translate(-50%, -50%)';

        const carMarker = new mapboxgl.Marker({ element: carEl }).setLngLat(coords[0]).addTo(map);

        function animate() {
          if (step === 0 && !notificationSent) {
            alert(`Ride Started! Estimated arrival in ${duration} mins.`);
            setNotificationSent(true);
          }

                    if (step < coords.length - 1) {
            const [startLng, startLat] = coords[step];
            const [endLng, endLat] = coords[step + 1];
            const deltaLng = (endLng - startLng) / 20;
            const deltaLat = (endLat - startLat) / 20;
            let progress = 0;

            const smoothStep = () => {
              if (progress <= 20) {
                const lng = startLng + deltaLng * progress;
                const lat = startLat + deltaLat * progress;
                const newPos = [lng, lat];
                carMarker.setLngLat(newPos);
                map.flyTo({ center: newPos, speed: 0.5 });
                progress++;
                requestAnimationFrame(smoothStep);
              } else {
                step++;
                animate();
              }
            };

            requestAnimationFrame(smoothStep);
          }
        }

        animate();
      });

    return () => map.remove();
  }, [fromCoord, toCoord, userLocation]);

  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);

 return (

    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <div style={{ position: 'absolute', bottom: '100px', left: '10px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button onClick={() => mapRef.current?.zoomIn()} style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>+</button>
        <button onClick={() => mapRef.current?.zoomOut()} style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>−</button>
      </div>
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />

      <div style={{
        position: 'absolute', bottom: '5%',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '20px',
        zIndex: 1,
      }}>
        {isDriver === 'true' && (
  <button
    onClick={async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        console.log('Completing ride:', rideId, 'URL:', `http://localhost:5000/api/rides/${rideId}/complete`);
        const res = await fetch(
          `http://localhost:5000/api/rides/${rideId}/complete`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Complete failed');
        alert('Ride marked completed');
        router.push(`/rides/${rideId}`);
      } catch (err) {
        console.error(err);
        alert('Error completing ride');
      }
    }}
    style={{
      padding: '18px 48px', backgroundColor: 'green',
      color: 'white', border: 'none', borderRadius: '8px',
      fontWeight: 'bold', cursor: 'pointer'
    }}
  >
    Complete
  </button>
)}

        <button onClick={async () => {
          if (!userLocation) {
            alert('User location not available');
            return;
          }

          try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch('http://localhost:5000/api/users/me', {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });

            const data = await res.json();
            console.log("Fetched user data:", data);
            alert(`Your location details (${userLocation[1]}, ${userLocation[0]}) are sent to your emergency contact (${data.emergencyphone}).`);
          } catch (err) {
            console.error('Failed to fetch emergency contact:', err);
            alert(`Your location details (${userLocation[1]}, ${userLocation[0]}) are sent to your emergency contact.`);
          }
        }} style={{ padding: '12px 20px', backgroundColor: 'red',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          SOS
        </button>

        {/* new Home button */}
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '12px 20px',
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Home
        </button>
      </div>

      {showRating && isDriver !== 'true' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <h2>Rate Your Ride</h2>
            <div style={{ margin: '20px 0' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  style={{
                    fontSize: '2rem',
                    cursor: 'pointer',
                    color: rating >= star ? 'gold' : '#ccc'
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <button
              onClick={async () => {
                if (rating < 1) {
                  alert('Please select a rating before submitting.');
                  return;
                }
                try {
                  const token = await auth.currentUser.getIdToken();
                  const res = await fetch(`http://localhost:5000/api/reviews/${rideId}/reviews`, {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json',
                    'Authorization' : `Bearer ${token}`,},
                    body: JSON.stringify({ rating }), });

                    const data = await res.json();
                    console.log(data);
                  setShowRating(false);
                  console.log(rideId);
                  router.push(`/rides/${rideId}`);
                } catch (err) {
                  console.error('Error submitting review:', err);
                }
              }}
              style={{
                padding: '10px 30px',
                backgroundColor: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}