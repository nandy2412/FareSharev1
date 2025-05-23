//Import Components
import { View, Image, Text, ImageBackground, ScrollView, FlatList, TouchableOpacity, StyleSheet, Pressable} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import bg_image from '../../assets/images/fareshare/home_bg.png';
import { SHARED, COLORS } from '../styles/global.jsx';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

//Dashboard for the logged in user displaying their groups and upcoming rides, along with ride and host button
//Host button is only enabled if ther user is a driver
export default function HomeScreen() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const [recentRides, setRecentRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(true);

  const [isDriver, setIsDriver] = useState(false);
  const [profileId, setProfileId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsDriver(false);

      if (currentUser) {
        const uid   = currentUser.uid;
        fetchDriverStatus(uid);
        fetchGroupsForUser(uid);
        fetchRecentRidesForUser(uid);
      }
    });

    return () => unsubscribe();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchDriverStatus(user.uid);
        fetchGroupsForUser(user.uid);
        fetchRecentRidesForUser(user.uid);
      } else {
        setIsDriver(false);
      }
    }, [user])
  );

  const users = auth.currentUser;
  if (user) {
    const uid = user.uid;
    console.log("UID:", uid);
  }

  const fetchDriverStatus = async (firebaseUid) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('http://localhost:5000/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const profile = await res.json();
        setIsDriver(!!profile.licenseValidated);
        setProfileId(profile._id);
      } else {
        setIsDriver(false);
      }
    } catch (err) {
      console.error('Error checking driver status:', err);
      setIsDriver(false);
    }
  };

    const fetchGroupsForUser = async (firebaseUid) => {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`http://localhost:5000/api/groups?userId=${firebaseUid}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) setGroups(data);
      else setGroups([]);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchRecentRidesForUser = async (firebaseUid) => {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`http://localhost:5000/api/rides?userId=${firebaseUid}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) setRecentRides(data);
      else setRecentRides([]);
    } catch (err) {
      console.error('Error fetching rides:', err);
      setRecentRides([]);
    } finally {
      setLoadingRides(false);
    }
  };


  return (
    <SafeAreaView style={SHARED.container}>
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

      <ScrollView>
        {/* Main title section */}
        <View style={styles.titleWrapper}>
          <ImageBackground
            source={bg_image}
            resizeMode="cover"
            style={styles.background}
          > 
            <View style={styles.overlay} />
            <View style={styles.titleSection}>
              <Text style={styles.mainTitle}>Where you wanna go?</Text>
              <Text style={styles.subtitle}>
                Invite others, Share the Journey, Share the price!
              </Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={() => router.push('/ride')}>
                  <Text style={styles.buttonText}>Ride</Text>
                </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      !isDriver && styles.disabledButton
                    ]}
                    onPress={() => isDriver && router.push('/host')}
                    disabled={!isDriver}
                  >
                    <Text style={styles.buttonText}>Host</Text>
                  </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.groupsSection}>
          <Text style={styles.sectionTitle}>Groups:</Text>
          {loadingGroups ? (
            <Text style={{ color: COLORS.gray }}>Loading groups...</Text>
          ) : groups.length === 0 ? (
            <Text style={{ color: COLORS.gray }}>You are not in any groups yet.</Text>
          ) : (
            <View style={styles.grid}>
              {groups.map(g => (
                <View key={g._id} style={[styles.gridItem, { backgroundColor: g.groupColor }]}>
                  {g.hasNewRide && (
                  <Text style={styles.alertIcon}>⬤</Text>
                  )}
                  <TouchableOpacity
                    style={styles.gridButton}
                    
                    onPress={() => router.push(`groups/${g._id}`)} // Optional: dynamic routing later
                  >
                    <Text style={styles.groupText}>{g.groupName}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recent Rides */}
        <View style={styles.ridesSection}>
          <Text style={styles.sectionTitle}>Upcoming rides:</Text>
          {loadingRides ? (
            <Text style={{ color: COLORS.gray }}>Loading rides...</Text>
          ) : recentRides.length === 0 ? (
            <Text style={{ color: COLORS.gray }}>No recent rides found.</Text>
          ) : (
            <FlatList
              horizontal
              data={recentRides.filter(item =>
                item.status === 'pending' || item.status === 'ongoing'
              )}
              keyExtractor={item => item._id.toString()}
              renderItem={({ item }) => {
                let borderColor = (item.driverID?.userID._id === profileId)
               ? '#06D6A0'
               : (item.status === 'pending'
                   ? '#FFD166'
                   : item.status === 'ongoing'
                     ? '#8338EC'
                     : '#ddd'
                 );
                const driverName = item.driverID?.userID
                  ? `${item.driverID.userID.firstName} ${item.driverID.userID.lastName}`
                  : 'Unknown';
                const carName = item.driverID?.carName ?? 'Unknown';
                return (
                  <TouchableOpacity
                    style={[styles.rideCard, { borderColor }]}
                    onPress={() => router.push(`rides/${item._id}`)}
                  >
                    <Text>From: {item.from}</Text>
                    <Text>To: {item.to}</Text>
                    <View style={styles.driverInfo}>
                      <Image
                        source={require('@/assets/images/fareshare/default_icon.png')}
                        style={styles.driverImage}
                      />
                      <Text style={styles.driverName}>{driverName}</Text>
                    </View>
                    <Text style={styles.carDetails}>Car: {carName}</Text>
                  </TouchableOpacity>
                )
              }}
              showsHorizontalScrollIndicator={false}
            />
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleWrapper: {
    paddingHorizontal: 16,
  },
  background: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 10,
  },
  imageStyle: {
    borderRadius: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(180, 231, 255, 0.56)',
    zIndex: 1,
  },
  titleSection: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: '12%',
    zIndex: 2, 
  },  
  mainTitle: {
    color: 'white',
    fontSize: 34,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 20,
    justifyContent: 'center',
    marginTop: 10,
    width: 200,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 17,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },  
  disabledButton: {
    backgroundColor: "#ccc",
    borderColor: COLORS.white,
    borderWidth: 2,
  },
  groupsSection: {
    paddingHorizontal: 16,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  gridItem: {
    width: '22%',
    aspectRatio: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridButton: {
    flex: 1,
    width: '95%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  groupText: {
  flexShrink: 1,
  flexWrap: 'wrap',
  textAlign: 'center',
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold',
  },
  alertIcon: {
    position: 'absolute',
    top: 4,
    right: 10,
    color: '#fff',
    fontSize: 40,
    zIndex: 10,
  },
  ridesSection: {
    paddingHorizontal: 16,
    marginVertical: 40,
  },
  rideCard: {
    width: 300,
    height: 180,
    borderRadius: 8,
    padding: 15,
    marginRight: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderLeftWidth: 6,
    borderBottomWidth: 6,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8, 
  },
  driverImage: {
    width: 35, 
    height: 35, 
    borderRadius: 17.5, 
    marginRight: 10,
  },
  driverName: {
    fontWeight: 'bold',
    fontSize: 18, 
  },
  carDetails: {
    fontSize: 14, 
    color: 'gray',
    marginTop: 5,
  },
});

