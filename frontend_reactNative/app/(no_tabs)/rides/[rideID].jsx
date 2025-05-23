//Import Components
import { StyleSheet, SafeAreaView, TouchableOpacity, View, Text, Image, FlatList, Modal, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SHARED, COLORS } from '../../styles/global.jsx';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../../firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Feather } from '@expo/vector-icons';

//Dynamic ride IDs 
//Getting ride details, start ride details, validating OTPs for each passenger, and cancelling ride by both user (cancels their own ride) and driver (cancels the entire ride)
export default function RideStatus() {
  const router = useRouter();
  const { rideID } = useLocalSearchParams();

  const [user, setUser] = useState(null);
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [giveUpModalVisible, setGiveUpModalVisible] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  
  const [passengerOtps, setPassengerOtps] = useState([]);
  const [userOtp, setUserOtp] = useState('');
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [passengerList, setPassengerList] = useState([]);
  const [otpInputs, setOtpInputs] = useState({});
  const [errorOtps, setErrorOtps] = useState({});
  const [validatedOtps, setValidatedOtps] = useState({});

  const allPassengersVerified =
    passengerList.length > 0 &&
    passengerList.every(p => validatedOtps[p.userID._id]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (current) => setUser(current));
    return unsubscribe;
  }, []);

  useEffect(() => {
  console.log('User OTP changed:', userOtp);  
}, [userOtp]);  

 useEffect(() => {
  if (!user || !rideID) {
    setLoading(false);
    return;
  }
  (async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const rideRes = await fetch(`http://localhost:5000/api/rides/${rideID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!rideRes.ok) throw new Error('Failed to fetch ride');
      const rideData = await rideRes.json();
      setRide(rideData);

      const driverRes = await fetch(`http://localhost:5000/api/users/isdriver?rideID=${rideID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { isDriver } = await driverRes.json();
      setIsDriver(isDriver);

      if (!isDriver && rideData.status === 'pending') {
        console.log(rideID);
        const otpRes = await fetch(`http://localhost:5000/api/rides/${rideID}/myotp`, {
          method : "GET",
          headers: { Authorization: `Bearer ${token}` }
        })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch OTP');
          }
          return response.json();
        })
        .then((data) => {
          if (data && data.otp) {
            console.log('OTP received:', data.otp);
            setUserOtp(data.otp);  
          } else {
            console.log('OTP is not found in the response');
          }
        });
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  })();
}, [user, rideID]);


  const handleStartRide = async () => {
    try {
      const token = await user.getIdToken();
      const prepRes = await fetch(`http://localhost:5000/api/rides/${rideID}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!prepRes.ok) throw new Error('Cannot prepare start');

      const { passengers } = await prepRes.json();
      setPassengerList(passengers.map(p => ({ userID: p.userID, otp: p.otp })));
      setOtpInputs({}); setErrorOtps({}); setValidatedOtps({});
      setOtpModalVisible(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to start ride');
    }
  };



  const validateOneOtp = async (userId) => {
    const entered = otpInputs[userId];
    try {
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:5000/api/rides/${rideID}/validate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID: userId, otp: entered })
      });
      const data = await res.json();
      if (res.ok) {
        setValidatedOtps(prev => ({ ...prev, [userId]: true }));
        setErrorOtps(prev => ({ ...prev, [userId]: false }));
      } else {
        setErrorOtps(prev => ({ ...prev, [userId]: true }));
        Alert.alert('Invalid OTP', data.message || 'Incorrect OTP');
      }
    } catch {
      Alert.alert('Error', 'Failed to validate OTP.');
    }
  };
  
const finalizeStartRide = async () => {
  try {
    const token = await user.getIdToken();
    const res = await fetch(`http://localhost:5000/api/rides/${rideID}/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userID: passengerList[0].userID._id,
        otp: otpInputs[ passengerList[0].userID._id ],
        allValidated: true
      })
    });
    if (!res.ok) throw new Error('Failed to finalize ride start');
    setRide(r => ({ ...r, status: 'ongoing' }));
    setOtpModalVisible(false);
    router.push({ pathname: '/mapview', params: { rideId: rideID, from: JSON.stringify(ride.fromCoordinates), to: JSON.stringify(ride.toCoordinates), driverId: ride.driverID?._id, isDriver: true } });
  } catch (err) {
    Alert.alert('Error', err.message);
  }
};

  const handleCancelRide = async () => {
    try {
      const token = await user.getIdToken();
      await fetch(`http://localhost:5000/api/rides/${rideID}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      router.push(`/rides/${rideID}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to cancel ride');
    }
  };

  const handleGiveUpSeat = async () => {
    setGiveUpModalVisible(false);
    try {
      const token = await user.getIdToken();
      await fetch(`http://localhost:5000/api/rides/${rideID}/unbook`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      router.replace('/');
    } catch (err) {
      Alert.alert('Error', 'Failed to give up seat');
    }
  };

  const OtpItem = ({ item, otp, setOtp, onValidate }) => (
  <View style={{ marginVertical: 10 }}>
    <Text style={{ fontWeight: 'bold' }}>{item.name || 'Passenger'}:</Text>
    <TextInput
      placeholder="Enter OTP"
      value={otp}
      onChangeText={setOtp}
      keyboardType="numeric"
      style={{ backgroundColor: '#eee', padding: 8, borderRadius: 5, marginVertical: 6 }}
    />
    <TouchableOpacity onPress={onValidate} style={{ backgroundColor: '#8338EC', padding: 10, borderRadius: 6 }}>
      <Text style={{ color: '#fff', textAlign: 'center' }}>Validate</Text>
    </TouchableOpacity>
  </View>
);


  if (loading) return <ActivityIndicator size="large" color={COLORS.primary} />;
  if (error || !ride) return <Text style={styles.errorText}>{error || 'Ride not found'}</Text>;

  let statusColor = 'rgba(255,209,102,0.77)';
  switch (ride.status.toLowerCase()) {
    case 'ongoing': statusColor = 'rgba(131,56,236,0.3)'; break;
    case 'completed': statusColor = 'rgba(6,214,160,0.3)'; break;
    case 'cancelled': statusColor = 'rgba(239,71,111,0.3)'; break;
  }

  return (
    <SafeAreaView style={SHARED.container}>
      <LinearGradient colors={['#af96ff', '#FFFFFF']} style={{ flex: 1 }}>
    {/* Header */}
    <TouchableOpacity onPress={() => router.push('/')}>
      <View style={SHARED.header}>
        {/* Logo and Title */}
        <Image source={require('@/assets/images/fareshare/logo.png')} style={SHARED.logoImage} />
        <Text style={SHARED.logoText}>FareShare</Text>

        {/* User Info */}
        <View style={styles.headerRight}>
          {user ? (
            <>
              <Text style={styles.userEmail}>{user.email.split('@')[0]}</Text>
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

    {/* Ride Details */}
    <FlatList
      ListHeaderComponent={() => (
        <>
          {/* Ride info */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Ride Details</Text>
          </View>

          <View style={styles.hostDetails}>
            <Image source={require('@/assets/images/fareshare/default_icon.png')} style={styles.driverImage} />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>
                {ride.driverID?.userID
                  ? `${ride.driverID.userID.firstName} ${ride.driverID.userID.lastName}`
                  : 'Unknown Driver'}
              </Text>
              <Text style={styles.meta}>Car: {ride.driverID?.carName ?? '–'}</Text>
                  <Text style={styles.meta}>
                    Rating:{' '}
                    {ride.driverID?.totalReviews > 0
                      ? (ride.driverID.reviewScoreDriver / ride.driverID.totalReviews).toFixed(1)
                      : '–'
                    }{' '}
                    ⭐ ({ride.driverID?.totalReviews ?? 0})
                  </Text>
            </View>
          </View>

          {!isDriver && userOtp && (
            <View style={styles.otpContainer}>
              <Text style={styles.otpLabel}>Give Driver your OTP:</Text>
              <Text style={styles.otpValue}>{userOtp}</Text>
            </View>
          )}
          
          <View style={[styles.rideDetailsSection, { backgroundColor: statusColor }]}>
            <Text style={styles.status}>Status: {ride.status}</Text>
            <View style={styles.detailsRow}>
              <View style={styles.detailsLeft}>
                <Text style={styles.route}>From: {ride.from} ➔ To: {ride.to}</Text>
                <Text style={styles.meta}>Date & Time:</Text>
                <Text style={styles.metaSecondary}>{new Date(ride.dateTime).toLocaleString()}</Text>
              </View>
              <View style={styles.detailsRight}>
                <View style={styles.highlightRow}>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightLabel}>NZ$</Text>
                    <Text style={styles.highlightValue}>{ride.cost}</Text>
                  </View>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightLabel}>Seats</Text>
                    <Text style={styles.highlightValue}>{ride.seats}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.passengerTitle}>Passenger Details</Text>
        </>
      )}
      data={ride.passengers}
      keyExtractor={(item) => item.userID._id.toString()}
      renderItem={({ item }) => (
        <View style={styles.passengerCard}>
          <Image source={require('@/assets/images/fareshare/logo.png')} style={styles.passengerImage} />
          <Text style={styles.passengerName}>{item.userID.firstName} {item.userID.lastName}</Text>
        </View>
      )}
      contentContainerStyle={{ paddingBottom: 100 }}
    />

    {/* Driver buttons when ride is pending */}
    {isDriver && ride.status === 'pending' && (
          <View style={styles.driverButtonsContainer}>
            {ride.passengers.length > 0 && (
              <TouchableOpacity style={[styles.driverActionButton, { backgroundColor: '#06D6A0' }]} onPress={handleStartRide}>
                <Text style={styles.driverActionButtonText}>Start Ride</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.driverActionButton, { backgroundColor: '#EF476F' }]} onPress={handleCancelRide}>
              <Text style={styles.driverActionButtonText}>Cancel Ride</Text>
            </TouchableOpacity>
          </View>
        )}

    {/* Driver buttons when ride is ongoing */}
{isDriver && ride.status === 'ongoing' && (
  <View style={styles.driverButtonsContainer}>
    {/* Check Map */}
    <TouchableOpacity
      style={[styles.driverActionButton, { backgroundColor: '#2196F3' }]}
      onPress={() => router.push({
        pathname: '/mapview',
        params: {
          rideId: rideID,
          from: JSON.stringify(ride.fromCoordinates),
          to:   JSON.stringify(ride.toCoordinates),
          driverId: ride.driverID?._id,
          isDriver: true
        }
      })}
    >
      <Text style={styles.driverActionButtonText}>Check Map</Text>
    </TouchableOpacity>
  </View>
)}

    {/* Rider/User buttons */}
    {/* Give up Seat button only when the ride is pending for User */}
      {!isDriver && ride.status === 'pending' && (
        <View style={styles.driverButtonsContainer}>
          <TouchableOpacity
            style={[styles.driverActionButton, { backgroundColor: '#EF476F' }]}
            onPress={() => setGiveUpModalVisible(true)}
          >
            <Text style={styles.driverActionButtonText}>Give Up Seat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Check Map button only when the ride is ongoing for User */}
      {!isDriver && ride.status === 'ongoing' && (
        <View style={styles.driverButtonsContainer}>
          <TouchableOpacity
            style={[styles.driverActionButton, { backgroundColor: '#06D6A0' }]}
            onPress={() => {
              router.push({
                pathname: '/mapview',
                params: {
                  rideId: rideID,
                  from: JSON.stringify(ride.fromCoordinates),
                  to: JSON.stringify(ride.toCoordinates),
                  isDriver: false
                }
              });
            }}
          >
            <Text style={styles.driverActionButtonText}>Check Map</Text>
          </TouchableOpacity>
        </View>
      )}


    {/* Completed ride back / Cancelled ride button */}
    {ride && (ride.status === 'completed' || ride.status === 'cancelled')  && (
      <TouchableOpacity style={[styles.cancelButton, { backgroundColor: '#06D6A0' }]} onPress={() => router.push('/')}>
        <Text style={styles.cancelText}>Back to Home</Text>
      </TouchableOpacity>
    )}

  {/* OTP Validate Modal for Driver */}
  {isDriver && (
          <Modal visible={otpModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Validate Passengers</Text>
                  <TouchableOpacity onPress={() => setOtpModalVisible(false)}>
                    <Feather name="x" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={passengerList}
                  keyExtractor={p => p.userID._id}
                  renderItem={({ item }) => {
                    const id = item.userID._id;
                    const hasErr = errorOtps[id];
                    const isValid = validatedOtps[id];
                    return (
                      <View style={styles.otpValidationContainer}>
                        <Text style={styles.otpName}>{item.userID.firstName} {item.userID.lastName}</Text>
                        <TextInput
                          placeholder="Enter OTP"
                          value={otpInputs[id] || ''}
                          onChangeText={txt => {
                            setOtpInputs(prev => ({ ...prev, [id]: txt }));
                            setErrorOtps(prev => ({ ...prev, [id]: false }));
                          }}
                          keyboardType="numeric"
                          editable={!isValid}
                          style={[styles.otpInput, hasErr && { borderColor: 'red', borderWidth: 2 }]} />
                        <TouchableOpacity
                          onPress={() => validateOneOtp(id)}
                          disabled={isValid}
                          style={[
                            styles.validateButton,
                            isValid ? styles.validateButtonVerified : styles.validateButtonDefault
                          ]}>
                          <Text style={styles.validateButtonText}>{isValid ? 'Verified' : 'Validate'}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }} />

                <TouchableOpacity
                  disabled={!allPassengersVerified}
                  onPress={finalizeStartRide}
                  style={[
                    styles.startRideButton,
                    allPassengersVerified ? styles.startRideEnabled : styles.startRideDisabled
                  ]}>
                  <Text style={styles.startRideText}>Start Ride</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}


    {/* Give up confirmation modal */}
    <Modal visible={giveUpModalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setGiveUpModalVisible(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Give Up Seat</Text>
          <Text style={styles.modalMessage}>Are you sure you want to give up your seat?</Text>
          <TouchableOpacity style={styles.confirmButton} onPress={handleGiveUpSeat}>
            <Text style={styles.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
        </View>
      </Modal>
    </LinearGradient>
  </SafeAreaView>
    );}

const styles = StyleSheet.create({
  headerRight: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 12
  },
  userEmail: {
    color: '#fff', fontWeight: 'bold', marginRight: 4
  },
  errorText: {
    textAlign: 'center', marginTop: 50, color: COLORS.danger, fontSize: 16
  },
  titleSection: {
    marginTop: 1, padding: 16, backgroundColor: '#8338EC'
  },
  title: {
    fontSize: 24, fontWeight: 'bold', color: '#fff'
  },
  hostDetails: {
    flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: '#ccc', backgroundColor: '#f3f3f3', alignItems: 'center'
  },
  driverImage: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff'
  },
  driverInfo: {
    marginLeft: 12
  },
  driverName: {
    fontSize: 20, fontWeight: 'bold', marginBottom: 4
  },
  meta: {
    fontSize: 14, color: '#555', marginBottom: 2
  },
  rideDetailsSection: {
    margin: 16, padding: 20, borderRadius: 12, backgroundColor: '#fff', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4
  },
  status: {
    fontSize: 20, fontWeight: '700', textAlign: 'center', color: '#333', marginBottom: 16, textTransform: 'capitalize'
  },
  detailsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'
  },
  detailsLeft: {
    flex: 2
  },
  detailsRight: {
    flex: 1, alignItems: 'flex-end', justifyContent: 'space-between'
  },
  route: {
    fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 8
  },
  metaSecondary: {
    fontSize: 15, color: '#333', fontWeight: '500'
  },
  highlightRow: {
    flexDirection: 'row', gap: 20
  },
  highlightBox: {
    marginBottom: 12, alignItems: 'center'
  },
  highlightLabel: {
    fontSize: 13, color: '#333'
  },
  highlightValue: {
    fontSize: 26, fontWeight: 'bold', color: '#000'
  },
  passengerTitle: {
    fontSize: 20, fontWeight: 'bold', marginBottom: 8, marginHorizontal: 16
  },
  passengerCard: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginHorizontal: 16, backgroundColor: '#f8f8f8', padding: 10, borderRadius: 10
  },
  passengerImage: {
    width: 40, height: 40, borderRadius: 20, marginRight: 10
  },
  passengerName: {
    fontSize: 16
  },
  cancelButton: {
    position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: '#8338EC', paddingVertical: 14, borderRadius: 10, alignItems: 'center'
  },
  cancelText: {
    color: '#fff', fontSize: 16, fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center'
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 10
  },
  modalTitle: {
    fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center'
  },
  modalMessage: {
    fontSize: 16, textAlign: 'center', marginBottom: 12
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12
  },
  
  startRideButton: { marginTop: 16, paddingVertical: 14, borderRadius: 6, alignItems: 'center' },
  startRideEnabled: { backgroundColor: '#06D6A0' },
  startRideDisabled: { backgroundColor: '#ccc' },
  startRideText: { color: '#fff', fontSize: 16, fontWeight: '600' 
  },

  confirmButton: {
    padding: 10, borderRadius: 5, alignItems: 'center', backgroundColor: '#EF476F'
  },
  confirmText: {
    color: '#fff', fontWeight: 'bold', fontSize: 16
  },
  driverButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16, 
  },
  driverActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 8, 
  },
  driverActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  otpContainer: {
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  otpValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
   validateButtonDefault: {
    backgroundColor: '#8338EC',
  },
  validateButtonVerified: {
    backgroundColor: '#06D6A0',
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  otpValidationContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  otpName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#333',
  },
  otpInput: {
    height: 48,
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 12,
    borderRadius: 6,
    fontSize: 16,
    marginBottom: 12,
  },
  validateButton: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  validateButtonDefault: {
    backgroundColor: '#8338EC',
  },
  validateButtonVerified: {
    backgroundColor: '#06D6A0',
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },


});

