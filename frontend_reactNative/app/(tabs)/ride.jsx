//Import components
import { View, Image, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SHARED, COLORS } from '../styles/global.jsx';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Feather } from '@expo/vector-icons';

//Displays the list of available rides that is pending and allows to filter based on destination and datetime
export default function RideList() {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [seats, setSeats] = useState('');
    const [date, setDate] = useState(new Date());
    const [filteredRides, setFilteredRides] = useState([]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedRide, setSelectedRide] = useState(null);
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [allRides, setAllRides] = useState([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const token = await currentUser.getIdToken();
                try {
                    const res = await fetch('http://localhost:5000/api/rides/unrelated', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await res.json();
                        setAllRides(data);
                        const now = new Date();
                        const upcomingPending = data.filter(ride =>
                        ride.status === 'pending' &&
                        new Date(ride.dateTime) > now
                    );
                    setFilteredRides(upcomingPending);
                } catch (error) {
                    console.error("Error fetching rides:", error);
                }
            }
        });
        return () => unsubscribe(); // Clean up on unmount
    }, []);

    const handleConfirm = async () => {
        if (!user) {
            setModalVisible(false);
            return router.push('/login');
        }
        const token = await user.getIdToken();
        try {
            const res = await fetch(`http://localhost:5000/api/rides/${selectedRide._id}/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ passenger: user.uid })
            });
            if (!res.ok) throw new Error('Booking failed');
        } catch (error) {
            console.error('Error confirming ride:', error);
        } finally {
            setModalVisible(false);
            router.push(`/rides/${selectedRide._id}`);
        }
    };

    const handleSearch = () => {
        const now = new Date();
        const selectedDate = new Date(date);
        const threeDaysLater = new Date(selectedDate);
        threeDaysLater.setDate(selectedDate.getDate() + 3);
        threeDaysLater.setHours(23, 59, 59, 999);

        const newFiltered = allRides.filter(ride => {
            const rideDateTime = new Date(ride.dateTime);

            if (ride.status !== 'pending' || rideDateTime <= now) return false;

            if (rideDateTime < selectedDate || rideDateTime > threeDaysLater) return false;

            const fromMatch = !from || ride.from?.toLowerCase().includes(from.toLowerCase());
            const toMatch   = !to   || ride.to?.toLowerCase().includes(to.toLowerCase());
            const seatMatch = seats ? ride.seats >= parseInt(seats) : true;

            return fromMatch && toMatch && seatMatch;
        });

        setFilteredRides(newFiltered);
    };


    const onChangeDate = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const onChangeTime = (event, selectedTime) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            const newDate = new Date(date);
            newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
            setDate(newDate);
        }
    };

    const showDatepicker = () => {
        setShowDatePicker(true);
    };

    const showTimepicker = () => {
        setShowTimePicker(true);
    };

    return (
        <SafeAreaView style={SHARED.container}>
            <LinearGradient
                colors={['#96f8ff', '#FFFFFF']}
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


                <TouchableOpacity 
                    style={styles.titleSection}
                    onPress={() => setShowSearch(!showSearch)}
                    >
                    <Text style={styles.title}>{showSearch ? "Hide Search Menu" : "▼ Search A Ride?"}</Text>
                </TouchableOpacity>

                {/* Search Box */}
                {showSearch && (
                    <View style={styles.searchBox}>
                        {/* Your existing search fields here */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>From:</Text>
                            <TextInput style={styles.input} placeholder="Any" value={from} onChangeText={setFrom} />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>To:</Text>
                            <TextInput style={styles.input} placeholder="Any" value={to} onChangeText={setTo} />
                        </View>

                        <View style={styles.row}>
                            <View style={styles.smallInputGroup}>
                                <Text style={styles.label}>Seats:</Text>
                                <TextInput
                                    style={styles.smallInput}
                                    placeholder="Any"
                                    keyboardType="numeric"
                                    value={seats}
                                    onChangeText={setSeats}
                                />
                            </View>

                            <View style={styles.smallInputGroup}>
                                <Text style={styles.label}>Date:</Text>
                                {/* Web or mobile date input */}
                                {Platform.OS === 'web' ? (
                                    <input
                                        type="date"
                                        value={date.toLocaleDateString('en-CA')}
                                        onChange={(e) => {
                                            const newDate = new Date(e.target.value);
                                            setDate(newDate);
                                        }}
                                        style={styles.smallInput}
                                    />
                                ) : (
                                    <TouchableOpacity onPress={showDatepicker} style={styles.smallInput}>
                                        <Text>{date.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                )}
                                {showDatePicker && (
                                    <DateTimePicker
                                        testID="datePicker"
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
                                        value={`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`}
                                        onChange={(e) => {
                                            const [hours, minutes] = e.target.value.split(':').map(Number);
                                            const newDate = new Date(date);
                                            newDate.setHours(hours);
                                            newDate.setMinutes(minutes);
                                            setDate(newDate);
                                        }}
                                        style={styles.smallInput}
                                    />
                                ) : (
                                    <TouchableOpacity onPress={showTimepicker} style={styles.smallInput}>
                                        <Text>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </TouchableOpacity>
                                )}
                                {showTimePicker && (
                                    <DateTimePicker
                                        testID="timePicker"
                                        value={date}
                                        mode="time"
                                        is24Hour={false}
                                        display="default"
                                        onChange={onChangeTime}
                                    />
                                )}
                            </View>
                        </View>

                        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                            <Text style={styles.searchButtonText}>Catch a Ride</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* List of Rides */}
                <FlatList
                    data={filteredRides}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card}
                            onPress={() => { setSelectedRide(item); setModalVisible(true); }}>
                            <Image source={require('@/assets/images/fareshare/logo.png')} style={styles.driverImage} />
                            <View style={styles.info}>
                                <Text style={styles.driverName}>
                                {item.driverID?.userID
                                    ? `${item.driverID.userID.firstName} ${item.driverID.userID.lastName}`
                                    : 'Unknown Driver'}
                                </Text>
                                <Text style={styles.routeText}>From: {item.from}</Text>
                                <Text style={styles.routeText}>To: {item.to}</Text>
                                <Text style={styles.carName}>{item.driverID?.carName}</Text>
                                <Text style={styles.time}>
                                Drives on {new Date(item.dateTime).toLocaleString()}
                                </Text>
                            </View>

                            <View style={styles.meta}>
                                <Text style={styles.seats}>Seats Open: {item.seats}</Text>
                                <Text style={styles.price}>NZ$ {item.cost}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    />

                <Modal visible={modalVisible} transparent animationType="slide">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Confirm Ride</Text>
                            <Text style={styles.modalMessage}>
                                Do you want to confirm the ride from {selectedRide?.from} to {selectedRide?.to}?
                            </Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.modalButton} onPress={() => setModalVisible(false)}>
                                    <Text style={{ fontSize: 20 }}>No</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalButton, styles.modalConfirmButton]} onPress={handleConfirm}>
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
    titleSection: {
      marginTop: 20,
      marginHorizontal: 16,
      backgroundColor: '#0BC2DE',
      paddingHorizontal: 15,
      paddingVertical: 20,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    searchBox: {
        backgroundColor: '#e0f0ff',
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 16,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    inputGroup: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    smallInputGroup: {
        flex: 1,
        marginRight: 8,
    },
    smallInput: {
        backgroundColor: '#fff',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#ccc',
        
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
    
        height: 36, 
        paddingLeft: 6,
        paddingRight: 6,
    },    
    searchButton: {
        marginTop: 12,
        backgroundColor: '#0BC2DE',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    list: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    driverImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    driverName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    carName: {
        fontSize: 14,
        color: '#777',
    },
    time: {
        fontSize: 12,
        color: '#aaa',
        marginTop: 2,
    },
    meta: {
        alignItems: 'flex-end',
    },
    routeText: {
        fontSize: 14,
        color: '#555',
        marginTop: 4,
    },
    seats: {
        fontSize: 12,
        color: '#555',
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 4,
        color: '#000',
    },
    toggleButton: {
        padding: 10,
        margin: 10,
        borderRadius: 20,
        alignItems: 'center',
    },
    
    toggleButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
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
});