//Import Components
import { StyleSheet, SafeAreaView, TouchableOpacity, View, Text, Image, TextInput, Platform, ScrollView, Modal, Switch, Alert } from 'react-native';
import { FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SHARED, COLORS } from '../styles/global.jsx';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Feather } from '@expo/vector-icons';
import { fetchPlaceSuggestions } from '../utils/locationService.js';

//Driver can host a ride by entering the details of the ride and shows the ride
export default function HostList() {
  const [from, setFrom] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [fromcoordinates, setFromcoordinates] = useState(null);
  const [to, setTo] = useState('');
  const [toSuggestions, setToSuggestions] = useState([]);
  const [tocoordinates, setTocoordinates] = useState(null);
  const [cost, setCost] = useState('');
  const [seats, setSeats] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [driverId, setDriverId] = useState(null);
  const router = useRouter();
  const [user, setUser] = useState(null);
  const oneHourMs = 60 * 60 * 1000;
  const [isDateValid, setIsDateValid] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe(); // Clean up on unmount
  }, []);

  useEffect(() => {
  const fetchDriverId = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `http://localhost:5000/api/drivers/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,                
            'Content-Type': 'application/json',
          }
        }
      );
      const data = await res.json();
      if (res.ok) {
        setDriverId(data.driverId); 
      } else {
        console.error(data.message);
      }
    } catch (err) {
      console.error("Failed to fetch driver ID", err);
    }
  };
  fetchDriverId();
}, [user]);

useEffect(() => {
  const delayDebounceFn = setTimeout(() => {
    fetchPlaceSuggestions(from).then(setFromSuggestions);
  }, 300); // debounce input
  return () => clearTimeout(delayDebounceFn);
}, [from]);

useEffect(() => {
  const delayDebounceFn = setTimeout(() => {
    fetchPlaceSuggestions(to).then(setToSuggestions);
  }, 300); // debounce input
  return () => clearTimeout(delayDebounceFn);
}, [to]);

  useEffect(() => {
   const now = new Date();
   const diff = date - now;
   setIsDateValid(diff >= oneHourMs);
  }, [date]);

const handleFromSelect = (item) => {
  setFrom(item.name);
  setFromcoordinates(item.coordinates); // [lng, lat]
  setFromSuggestions([]);
};

const handleToSelect = (item) => {
  setTo(item.name);
  setTocoordinates(item.coordinates);
  setToSuggestions([]);
};

  const handleSubmit = async () => {
    if (!isDateValid) {
     Alert.alert(
       'Invalid Time', 'Rides must be scheduled at least one hour in advance and not in the past.');
     return;
   }
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not logged in", "Please log in to host a ride.");
        return;
      }

      const token = await user.getIdToken();

      const rideData = {
        from,
        to,
        seats: parseInt(seats),
        cost: parseFloat(cost),
        dateTime: date.toISOString(),
        fromCoordinates: [fromcoordinates[0],fromcoordinates[1]], // [lng, lat]
        toCoordinates: [tocoordinates[0],tocoordinates[1]],
      };

      const res = await fetch('http://localhost:5000/api/rides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, 
        },
        body: JSON.stringify(rideData),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("Ride creation failed:", result);
        Alert.alert('Failed', result.message || 'Something went wrong');
        return;
      }

      console.log("Ride Created:", result);
      console.log('to Location:', to);
    console.log('to Coordinates:', tocoordinates);
    console.log('from Location:', from);
    console.log('from Coordinates:', fromcoordinates);
    
      Alert.alert("Success", "Your ride was hosted successfully!");
      setConfirmVisible(false);
      router.push(`/rides/${result._id}`); 

    } catch (err) {
      console.error("Ride creation error:", err);
      Alert.alert('Error', err.message || 'Something went wrong');
    } 
  };

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const current = new Date(date);
      current.setFullYear(selectedDate.getFullYear());
      current.setMonth(selectedDate.getMonth());
      current.setDate(selectedDate.getDate());
      setDate(current);
    }
  };

  const onChangeTime = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const current = new Date(date);
      current.setHours(selectedTime.getHours());
      current.setMinutes(selectedTime.getMinutes());
      setDate(current);
    }
  };

  return (
    <SafeAreaView style={SHARED.container}>
      <LinearGradient
        colors={['#ffb8b8', '#FFFFFF']}
        style={{ flex: 1 }}
      >
        <TouchableOpacity onPress={() => router.push('/')}> 
          <View style={SHARED.header}>
          <Image source={require('@/assets/images/fareshare/logo.png')} style={SHARED.logoImage} />
          <Text style={SHARED.logoText}>FareShare</Text>

          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {user ? (
              <>
                  <Text style={{ color: '#fff', fontWeight: 'bold', marginRight: 4 }}>
                  {user.email.split('@')[0]}
                  </Text>
                  <TouchableOpacity 
                    onPress={async () => {
                      try {
                        await signOut(auth);
                        router.replace('/login');
                      } catch (e) {
                        console.error('Logout failed', e);
                      }
                    }}
                >
                  <Feather name="log-out" size={22} color="black" />
                </TouchableOpacity>
              </>
              ) : (
              <>
                  <TouchableOpacity onPress={() => router.push('/login')}>
                  <Feather name="log-in" size={22} color="black" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/register')}>
                  <Feather name="user-plus" size={22} color="black" />
                  </TouchableOpacity>
              </>
              )}
          </View>
      </View>
        </TouchableOpacity>

        <View style={styles.content}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.titleSection}>
              <Text style={styles.title}>Ready to Host?</Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="From (Origin)"
                value={from}
                onChangeText={setFrom}
              />
              
             {fromSuggestions.length > 0 && (
              <FlatList
                  data={fromSuggestions}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleFromSelect(item)}>
                      <Text style={styles.suggestion}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
              <TextInput
                style={styles.input}
                placeholder="To (Destination)"
                value={to}
                onChangeText={setTo}
              />
              {toSuggestions.length > 0 && (
              <FlatList
                data={toSuggestions}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => handleToSelect(item)}>
                    <Text style={styles.suggestion}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
              <TextInput
                   style={styles.input}
                   placeholder="No. of seats"
                   keyboardType="numeric"
                   value={seats}
                   onChangeText={text => {
                     const digitsOnly = text.replace(/[^0-9]/g, '');
                     setSeats(digitsOnly);
                   }}
                 />
              <TextInput
                style={styles.input}
                placeholder="Cost per seat"
                keyboardType="numeric"
                value={cost}
                onChangeText={text => {
                  // allow only digits and a single dot
                  let cleaned = text.replace(/[^0-9.]/g, '');
                  const parts = cleaned.split('.');
                  // re-join so only the first dot remains
                  cleaned = parts.shift() + (parts.length ? '.' + parts.join('') : '');
                  setCost(cleaned);
                }}
              />

              <View style={styles.dateTimeContainer}>
                <View style={styles.smallInputGroup}>
                  <Text style={styles.label}>Date:</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={date.toLocaleDateString('en-CA')}
                      onChange={(e) => setDate(new Date(e.target.value))}
                      style={styles.smallInput}
                    />
                  ) : (
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.smallInput}>
                      <Text>{date.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                  )}
                  {showDatePicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display="default"
                      onChange={onChangeDate}
                    />
                  )}
                </View>
                <View style={styles.smallInputGroup}>
                  <Text style={styles.label}>Time:</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="time"
                      value={`${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`}
                      onChange={(e) => {
                        const [h, m] = e.target.value.split(':').map(Number);
                        const d = new Date(date);
                        d.setHours(h);
                        d.setMinutes(m);
                        setDate(d);
                      }}
                      style={styles.smallInput}
                    />
                  ) : (
                    <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.smallInput}>
                      <Text>{date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</Text>
                    </TouchableOpacity>
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={date}
                      mode="time"
                      is24Hour={false}
                      display="default"
                      onChange={onChangeTime}
                    />
                  )}
                </View>
              </View>

            </View>
          </ScrollView>

          <TouchableOpacity 
          disabled={!isDateValid}
             style={[ styles.submitButton, !isDateValid && styles.submitButtonDisabled ]}
             onPress={() => setConfirmVisible(true)}>
            <Text style={styles.submitButtonText}>Create Ride</Text>
          </TouchableOpacity>
        </View>

        {/* Confirmation Modal */}
        <Modal visible={confirmVisible} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirm Ride</Text>
              <Text style={styles.modalMessage}>Are you sure you want to create this ride?</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalButton} onPress={() => setConfirmVisible(false)}>
                  <Text style={{fontSize:20}}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.modalConfirmButton]} onPress={handleSubmit}>
                  <Text style={styles.modalConfirmText}>Yes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    content: { 
        flex: 1, 
        justifyContent: 'space-between' 
    },
    scrollContent: { 
        paddingHorizontal: 16, 
        paddingTop: 20 
    },
    titleSection: { 
        marginBottom: 20, 
        backgroundColor: '#EF476F', 
        padding: 20, 
        borderRadius: 10 
    },
    suggestion: {
      padding: 8,
      backgroundColor: '#f0f0f0',
      borderBottomWidth: 1,
      borderColor: '#ccc',
  },
    absoluteSuggestions: {
      position: 'absolute',
      top: 60, 
      left: 16,
      right: 16,
      backgroundColor: '#fff',
      zIndex: 10,
      elevation: 10,
      borderRadius: 5,
      maxHeight: 150,
    },
    title: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: '#fff', 
    },
    form: {},
    input: { 
        borderWidth: 1, 
        borderColor: '#ccc', 
        borderRadius: 8, 
        padding: 12, 
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    dateTimeContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginBottom: 20 
    },
    smallInputGroup: { 
        flex: 1, 
        marginHorizontal: 5 
    },
    label: { 
        fontWeight: 'bold', 
        marginBottom: 5 
    },
    smallInput: { 
        borderWidth: 1, 
        borderColor: '#ccc', 
        borderRadius: 8, 
        padding: 12, 
        justifyContent: 'center' 
    },
    submitButton: { 
        backgroundColor: '#EF476F', 
        paddingVertical: 14, 
        borderRadius: 8, 
        alignItems: 'center', 
        margin: 16 
    },
    submitButtonText: { 
        color: '#fff', 
        fontWeight: 'bold', 
        fontSize: 16 
    },
    modalContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0,0,0,0.5)' 
    },
    modalContent: { 
        width: '80%', 
        backgroundColor: '#fff', 
        padding: 20, 
        borderRadius: 10 
    },
    modalTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        marginBottom: 10 
    },
    modalMessage: { 
        fontSize: 16 
    },
    modalButtons: { 
        flexDirection: 'row', 
        justifyContent: 'flex-end', 
        marginTop: 20,
    },
    modalButton: { 
        paddingHorizontal: 30,
        paddingVertical: 15,
    },
    modalConfirmButton: { 
        marginLeft: 10, 
        backgroundColor: '#0BC2DE', 
        borderRadius: 5,
    },
    modalConfirmText: { 
        color: '#fff',
        fontSize: 20,
    },
    submitButtonDisabled: {
      backgroundColor: '#ccc',      
  },
});
