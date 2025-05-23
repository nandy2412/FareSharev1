//Import Components
import { StyleSheet, SafeAreaView, TouchableOpacity, View, Text, Image, Alert, ScrollView, Modal, TextInput, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SHARED } from '../styles/global.jsx';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';

//Displays the user profile along with details about the user, driver information
//Also allows the user to create groups, enter emergency contact details and see their past ride history
export default function Profile() {
  const router = useRouter();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null); 
  const [editProfilePhoto, setEditProfilePhoto] = useState(null);
  const [createGroupModalVisible, setCreateGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [addDriverModalVisible, setAddDriverModalVisible] = useState(false);
  const [licenseNo, setLicenseNo] = useState('');
  const [carName, setCarName] = useState('');
  const [seats, setSeats] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [editEmergencyContactModalVisible, setEditEmergencyContactModalVisible] = useState(false);
  const [newEmergencyPhone, setNewEmergencyPhone] = useState(emergencyPhone); 
  const [isUpdating, setIsUpdating] = useState(false);
  const isDriver  = Boolean(userData?.licenseValidated);
  

  const refreshUserData = async () => {
    try {
      const token = await user.getIdToken(true); 
      const res = await fetch('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUserData(data);
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      (async () => {
        try {
          const token = await user.getIdToken();

          const res = await fetch('http://localhost:5000/api/users/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });


          const data = await res.json();
          console.log(data);
          setUserData(data);
          setEditFirstName(data.firstName);
          setEditLastName(data.lastName);
          setEditPhone(data.phone);
          setEmergencyPhone(data.emergencyphone);

          
          if (data.driverInfo) {
            setLicenseNo(data.driverInfo.licenseNo || '');
            setCarName(data.driverInfo.carName || '');
            setSeats(data.driverInfo.seats || '');
          }
          if (data.profilePhoto) setProfilePhoto({ uri: data.profilePhoto });
        } catch (err) {
          console.error('Failed to fetch user data', err);
        }
      })();
    }
  }, [user]);

const updateUserInfo = async () => {
  try {
    const token = await user.getIdToken();
    const payload = {
      firebaseUID: user.uid,
      email:       userData.email,
      licenseValidated: userData.licenseValidated,
      wallet:      userData.wallet,
      reviewScoreUser: userData.reviewScoreUser,
      totalReviews:    userData.totalReviews,
      emergencyphone:  emergencyPhone,

      firstName:   editFirstName,
      lastName:    editLastName,
      phone:       editPhone,
      profilePhoto: editProfilePhoto ?? userData.profilePhoto
    };

    const res = await fetch('http://localhost:5000/api/users', {
      method: 'POST', // syncUser route
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Update failed');
    const updated = await res.json();

    setUserData(updated);
    if (editProfilePhoto) setProfilePhoto({ uri: editProfilePhoto });
    setEditModalVisible(false);
    Alert.alert('Profile updated successfully');
  } catch (err) {
    console.error(err);
    Alert.alert('Could not update profile. Try again.');
  }
};


const updateEmergencyContact = async () => {
  if (!newEmergencyPhone || newEmergencyPhone === emergencyPhone) {
    Alert.alert('Please enter a valid emergency phone number or it is unchanged');
    return;
  }

  try {
    setIsUpdating(true);
    const token = await auth.currentUser.getIdToken(); 

    const res = await fetch('http://localhost:5000/api/users/me/emergencycontact', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ emergencyContact: newEmergencyPhone }),
    });

    const data = await res.json();

    if (res.ok) {
      Alert.alert('Emergency contact updated successfully');
      setEmergencyPhone(newEmergencyPhone); 
      setEditEmergencyContactModalVisible(false); 
    } else {
      Alert.alert(data.message || 'Failed to update emergency contact');
    }
  } catch (err) {
    console.error('Error updating emergency contact:', err);
    Alert.alert('An error occurred. Please try again.');
  } finally {
    setIsUpdating(false);
  }
};


  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setEditProfilePhoto(uri);
    }
  };

  const handleSaveDriver = async () => {
    if (!licenseNo || !carName || !seats) {
      Alert.alert("Please fill in all fields.");
      return;
    }

    try {
      const token = await user.getIdToken();
      const url = 'http://localhost:5000/api/drivers';
      const method = isDriver  ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          licenseNo,
          carName,
          seats: parseInt(seats, 10)
        })
      });

      if (!res.ok) throw new Error('Failed to ' + (isDriver ? 'update' : 'add') + ' driver info');

      Alert.alert(`Driver info ${isDriver ? 'updated' : 'added'}!`);
      setAddDriverModalVisible(false);

      const updatedRes = await fetch('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedData = await updatedRes.json();
      setUserData(updatedData);
    } catch (err) {
      console.error(err);
      Alert.alert('Error submitting driver data');
    }
  };


  const handleCreateGroup = async () => {
  if (!newGroupName) {
    Alert.alert("Please provide a group name");
    return;
  }

  try {
    const token = await user.getIdToken();
    const res = await fetch('http://localhost:5000/api/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        groupName: newGroupName,
        userUid: user.uid  
      }),
    });

    if (res.ok) {
      const newGroup = await res.json(); 
      const newGroupID = newGroup._id ;

      setCreateGroupModalVisible(false);
      setTimeout(() => {
        Alert.alert('Group created successfully');
      }, 100);

      if (newGroupID) {
        router.push(`groups/${newGroupID}`);
      } else {
        console.warn("Group created, but no group ID returned.");
      }
    } else {
      Alert.alert('Failed to create group');
    }
  } catch (err) {
    console.error('Error creating group : ', err);
    Alert.alert('Error creating group');
  }
};

  return (
    <SafeAreaView style={SHARED.container}>
      <LinearGradient colors={['#fcdf97', '#FFFFFF']} style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => router.push('/')}> 
          <View style={SHARED.header}>
            <Image source={require('@/assets/images/fareshare/logo.png')} style={SHARED.logoImage} />
            <Text style={SHARED.logoText}>FareShare</Text>
            <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {user ? (
                <>
                  <Text style={{ color: '#fff', fontWeight: 'bold', marginRight: 4 }}>{user.email.split('@')[0]}</Text>
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
          {userData && (
            <>
              <View style={styles.profileSection}> 
                <Image source={profilePhoto || require('@/assets/images/fareshare/default_icon.png')} style={styles.profileImage} /> 
                <TouchableOpacity style={styles.editIcon} onPress={() => setEditModalVisible(true)}>
                  <Feather name="edit-3" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.nameText}>{userData.firstName} {userData.lastName}</Text>
                <Text style={styles.licenseText}>
                     License Verified: {userData.licenseValidated ? 'Yes' : 'No'}
                   </Text>
                   {userData.licenseValidated && (
                     <Text style={styles.reviewText}>
                         Rating:{' '}
                         {(
                           (userData.driverInfo?.totalReviewsDriver ?? 0) > 0
                             ? (userData.driverInfo.reviewScoreDriver 
                                 / userData.driverInfo.totalReviewsDriver
                               ).toFixed(1)
                             : 0
                         )}{' '}
                         ⭐ ({userData.driverInfo?.totalReviewsDriver ?? 0} reviews)
                       </Text>
                     )}
              </View>

              <View style={styles.section}> 
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <Text style={styles.infoText}>Phone: {userData.phone}</Text>
                <Text style={styles.infoText}>Email: {userData.email}</Text>
                <Text style={styles.infoText}>Wallet: ${userData.wallet}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
                <Text style={styles.infoText}>Phone: {emergencyPhone}</Text>
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={() => setEditEmergencyContactModalVisible(true)}
                >
                  <Text style={styles.buttonText}>Edit Emergency Contact</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}> 
                <Text style={styles.sectionTitle}>Driver Details</Text>
                <Text style={styles.infoText}>License Number: {licenseNo || 'Not Provided'}</Text>
                <Text style={styles.infoText}>Car Name: {carName || 'Not Provided'}</Text>
                <Text style={styles.infoText}>Seats Available: {seats || 'Not Provided'}</Text>
                { !isDriver && (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => setAddDriverModalVisible(true)}
                  >
                    <Text style={styles.buttonText}>Add Driver Info</Text>
                  </TouchableOpacity>
                )}

                { isDriver && (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => setAddDriverModalVisible(true)}
                  >
                    <Text style={styles.buttonText}>Update Driver Info</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.section}> 
                <Text style={styles.sectionTitle}>Groups</Text>
                <TouchableOpacity style={styles.button} onPress={() => setCreateGroupModalVisible(true)}> 
                  <Text style={styles.buttonText}>Create New Group</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}> 
                <Text style={styles.sectionTitle}>Ride History</Text>
                <TouchableOpacity style={styles.button} onPress={() => router.push('/past_ride')}> 
                  <Text style={styles.buttonText}>View Past Rides</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setEditModalVisible(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            {/* First & Last Name */}
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={editFirstName}
              onChangeText={setEditFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={editLastName}
              onChangeText={setEditLastName}
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              value={editPhone}
              onChangeText={text => {
                // strip non-digits
                const digits = text.replace(/[^0-9]/g, '');
                setEditPhone(digits);
              }}
              maxLength={10}      
            />

            {/* Profile Photo Picker */}
            <View style={styles.photoPicker}>
              {editProfilePhoto
                ? <Image source={{ uri: editProfilePhoto }} style={styles.editProfileImage} />
                : <Image source={profilePhoto || require('@/assets/images/fareshare/default_icon.png')} style={styles.editProfileImage} />
              }
              <TouchableOpacity onPress={pickImage}>
                <Text style={styles.pickText}>Change Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Save / Cancel */}
            <TouchableOpacity style={[styles.button, { backgroundColor: '#06D6A0' }]} onPress={updateUserInfo}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { marginTop: 8 }]} onPress={() => setEditModalVisible(false)}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      
      {/* Create Group Modal */}
       <Modal visible={createGroupModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setCreateGroupModalVisible(false)} />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create New Group</Text>

              <TextInput
                placeholder="Group Name"
                style={styles.input}
                value={newGroupName}
                onChangeText={setNewGroupName}
              />
              
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#06D6A0' }]}
                onPress={handleCreateGroup}
              >
                <Text style={styles.buttonText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={editEmergencyContactModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              onPress={() => setEditEmergencyContactModalVisible(false)} 
            />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Emergency Contact</Text>

              <TextInput
                placeholder="Emergency Contact Phone"
                style={styles.input}
                keyboardType="phone-pad"
                value={newEmergencyPhone}
                onChangeText={text => {
                  const digits = text.replace(/[^0-9]/g, '');
                  setNewEmergencyPhone(digits);
                }}
                maxLength={10}       // same limit here
              />

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#007bff' }]}
                onPress={updateEmergencyContact}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
          </View>
        </View>
      </Modal>

        <Modal visible={addDriverModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setAddDriverModalVisible(false)} />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {isDriver ? 'Update Driver Info' : 'Add Driver Info'}
              </Text>

              <TextInput
                placeholder="License Number"
                style={styles.input}
                value={licenseNo}
                onChangeText={setLicenseNo}
              />
              <TextInput
                placeholder="Car Name"
                style={styles.input}
                value={carName}
                onChangeText={setCarName}
              />
              <TextInput
                placeholder="Seats Available"
                style={styles.input}
                keyboardType="numeric"
                value={seats}
                onChangeText={text => {
                  const digitsOnly = text.replace(/[^0-9]/g, '');
                  setSeats(digitsOnly);
                }}
                maxLength={2} 
              />


              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#06D6A0' }]}
                onPress={handleSaveDriver}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 6,
    borderBottomWidth: 6,
    borderWidth: 2,
    borderColor: '#FFD166',
    backgroundColor: '#fff',
  },
  profileSection: {
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#FFD166',
    borderRadius: 10,
    paddingVertical: 30,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  editIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  licenseText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoPicker: {
    alignItems: 'center',
    marginBottom: 12,
  },
  editProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 6,
  },
  pickText: {
    fontSize: 14,
    color: '#007bff',
  },
  modalLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalLabel: {
    fontWeight: 'bold',
    marginVertical: 8,
    textAlign: 'center',
  },
  colorOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  colorBlob: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedBlob: {
    borderColor: '#333',
  },

});
