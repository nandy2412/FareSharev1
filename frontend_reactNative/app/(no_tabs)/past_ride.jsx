import { TouchableOpacity, SafeAreaView, View, Text, FlatList, TextInput, Image, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SHARED, COLORS } from '../styles/global.jsx';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';

//Displays all the ride histories for the logged in user (including the driver history if they are a driver)
const RideHistoryScreen = () => {

  const [searchText, setSearchText] = useState('');
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe(); // Clean up on unmount
  }, []);


  useEffect(() => {
  const fetchRideHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const res = await fetch('http://localhost:5000/api/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      console.log('Ride history response:', data);

      const formatted = data.map(entry => ({
        id: entry.rideID._id,
        from: entry.rideID.from,
        to: entry.rideID.to,
        dateTime: entry.rideID.dateTime,
        cost: entry.rideID.cost,
        rideStatus: entry.rideID.status,
        driverName: entry.driverName,
        driverPhoto: require('@/assets/images/fareshare/logo.png'),
      })).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

      setRides(formatted);
    } catch (err) {
      console.error('Failed to fetch ride history:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchRideHistory();
}, [user]);

  const filteredRides = rides.filter(ride =>
    ride.to.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <SafeAreaView style={SHARED.container}>
      <LinearGradient
        colors={['#97fca1', '#FFFFFF']}
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

        <View style={styles.titleSection}>
          <Text style={styles.title}>Ride History</Text>
          <View style={styles.searchWrapper}>
            <Feather name="search" size={20} color="#aaa" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by destination..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        <FlatList
          data={filteredRides}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            let borderColor;
            switch (item.rideStatus.toLowerCase()) {
              case 'pending':
                borderColor = '#FFD166';
                break;
              case 'ongoing':
                borderColor = '#8338EC';
                break;
              case 'completed':
                borderColor = '#06D6A0';
                break;
              case 'cancelled':
                borderColor = '#EF476F';
                break;
              default:
                borderColor = '#ccc';
            }
          
            return (
              <TouchableOpacity
                style={[styles.card, { borderColor }]}
                onPress={() => router.push(`rides/${item.id}`)} 
              >
                <Image source={item.driverPhoto} style={styles.driverImage} />
                <View style={styles.info}>
                  <Text style={styles.driverName}>{item.driverName || 'Driver Name'}</Text>
                  <Text style={styles.carName}>From {item.from} to {item.to}</Text>
                  <Text style={styles.time}>
                    {new Date(item.dateTime).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.meta}>
                  <Text style={styles.seats}>Status: {item.rideStatus}</Text>
                  <Text style={styles.price}>${item.cost.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}        
          ListEmptyComponent={<Text style={styles.emptyText}>No rides found.</Text>}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  titleSection: {
    marginVertical: 20,
    marginHorizontal: 16,
    backgroundColor: '#06D6A0',
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderRadius: 10,
  },
  title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 20,
    marginHorizontal:10,
    backgroundColor: '#fff',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginTop: 20,
    marginHorizontal: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 20,
    marginBottom: 12,
    borderWidth: 1, 
    borderLeftWidth: 6, 
    borderBottomWidth: 6,
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
  seats: {
    fontSize: 12,
    color: '#555',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#000',
  }
});

export default RideHistoryScreen;
