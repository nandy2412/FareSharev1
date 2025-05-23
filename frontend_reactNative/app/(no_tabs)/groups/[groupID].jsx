//Import components required
import { StyleSheet, SafeAreaView, TouchableOpacity, View, Text, Image, FlatList, Modal, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SHARED, COLORS } from '../../styles/global.jsx';
import { auth } from '../../firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useLocalSearchParams } from 'expo-router';

//Dynamic Group page for each group based on the logged in user's groups
//Adding user, leaving from a group, editing the group details i.e. name or color
export default function GroupPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [groupData, setGroupData] = useState(null);
  const { groupID } = useLocalSearchParams();
  console.log("Group ID:", groupID);

  //Any changes in Firebase authentication 
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe(); // Clean up on unmount
  }, []);

  const [users, setUsers] = useState([]);
  const [groupColor, setGroupColor] = useState('#000000');
  const [groupName, setGroupName] = useState('GroupName');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const colorOptions = ['#8338EC', '#0BC2DE', '#06D6A0', '#FB8500', '#EF476F'];

  //Fetching group details when the groupID is available
  useEffect(() => {

  if (!groupID) {
    console.log("groupID is not defined");
    setLoading(false);
    return; 
  }

    const fetchGroupData = async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`http://localhost:5000/api/groups/${groupID}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        console.log("Group Data:", data);
        if (data) {
          setGroupData(data);
          setUsers(data.users);
          setGroupColor(data.groupColor || '#000000');
          setGroupName(data.groupName || 'GroupName');
        }
      } catch (error) {
        console.error('Failed to fetch group data', error);
        setError(error.message);
      }finally {
      setLoading(false);}
    };

    fetchGroupData();
  }, [groupID]);


  const renderUser = ({ item }) => (
    <View style={styles.userContainer}>
      <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
    </View>
  );

  //Saving the changes made by the user for the whole group
  const handleSaveChanges = async () => {
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`http://localhost:5000/api/groups/${groupID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        groupName,
        groupColor,
      }),
    });

    if (!res.ok) throw new Error('Failed to update group');

    const updatedGroup = await res.json();
    setGroupData(updatedGroup);
    setUsers(updatedGroup.users);
    setGroupColor(updatedGroup.groupColor);
    setGroupName(updatedGroup.groupName);
    setEditModalVisible(false); 
  } catch (error) {
    alert('Failed to save changes: ' + error.message);
  }
};

  //Adding a new member into the group by email
  const handleAddMember = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupID}/addUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${await auth.currentUser.getIdToken()}`
        },
        body: JSON.stringify({
          email: newMemberEmail,
        }),
      });
      if (!res.ok) throw new Error();
      const updatedGroup = await res.json();
      setUsers(updatedGroup.users);
      setAddModalVisible(false);
      setNewMemberEmail('');
    } catch (error) {
      alert('Could not add that member.');
    }
  };

  //Allowing the current user to leave from the group
  const confirmLeaveGroup = async () => {
    try {
      const userId = auth.currentUser.uid;
      const res = await fetch(`http://localhost:5000/api/groups/${groupID}/removeUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await auth.currentUser.getIdToken()}`
        },
        body: JSON.stringify({
          groupId: groupData?._id,
          userId, 
        }),
      });

      if (!res.ok) throw new Error();
      setLeaveModalVisible(false);
      router.push('/');
    } catch {
      alert("Couldn't leave group");
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

      {loading ? (
      <View style={styles.loadingContainer}>
        <Text>Loading group data...</Text>
      </View>
    ) : error ? (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    ) : ( <>
      <View style={[styles.titleSection, { backgroundColor: groupColor }]}>  
        <Text style={styles.title}>{groupName}</Text>
        <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
          <Feather name="edit-3" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item._id}
        renderItem={renderUser}
        contentContainerStyle={styles.userList}
      />
      
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: "red" }]} onPress={() => setLeaveModalVisible(true)}>
          <Text style={styles.actionText}>Leave Group</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: groupColor }]} onPress={() => setAddModalVisible(true)}>
          <Text style={styles.actionText}>Add Member</Text>
        </TouchableOpacity>
      </View>
    </>
    )}
      {/* Modals */}
      {[
        {
          visible: editModalVisible,
          onClose: () => setEditModalVisible(false),
          content: (
            <>
              <TextInput
                placeholder="Group Name"
                value={groupName}
                onChangeText={setGroupName}
                style={styles.input}
              />
              <View style={styles.colorOptionsContainer}>
                {colorOptions.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorBlob,
                      { backgroundColor: color },
                      groupColor === color && styles.selectedBlob,
                    ]}
                    onPress={() => setGroupColor(color)}
                  />
                ))}
              </View>
              <TouchableOpacity style={[styles.confirmButton, { backgroundColor: '#000' }]} onPress={handleSaveChanges}>
                <Text style={styles.confirmText}>Save</Text>
              </TouchableOpacity>
            </>
          )
        },
        {
          visible: addModalVisible,
          onClose: () => setAddModalVisible(false),
          content: (
            <>
              <Text style={styles.modalTitle}>Add Member</Text>
              <TextInput
                placeholder="Email address"
                keyboardType="email-address"
                value={newMemberEmail}
                onChangeText={setNewMemberEmail}
                style={styles.input}
              />
              <TouchableOpacity style={[styles.confirmButton, { backgroundColor: '#06D6A0' }]} onPress={handleAddMember}>
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </>
          )
        },
        {
          visible: leaveModalVisible,
          onClose: () => setLeaveModalVisible(false),
          content: (
            <>
              <Text style={styles.modalTitle}>Leave Group</Text>
              <Text style={styles.modalMessage}>Confirm exit?</Text>
              <TouchableOpacity style={[styles.confirmButton, { backgroundColor: '#06D6A0' }]} onPress={confirmLeaveGroup}>
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </>
          )
        }
      ].map((m, i) => (
        <Modal key={i} visible={m.visible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={m.onClose} />
            <View style={styles.modalContent}>{m.content}</View>
          </View>
        </Modal>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleSection: { margin: 16, padding: 20, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 32, color: '#fff', paddingTop: 80, fontWeight: 'bold' },
  editButton: { padding: 8, backgroundColor: '#fff', borderRadius: 5, marginTop: -80 },
  userList: { paddingHorizontal: 16 },
  userContainer: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#ddd' },
  userName: { fontSize: 18, color: '#333' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', margin: 16 },
  actionButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  actionText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center',},
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,},
  errorText: { color: 'red', textAlign: 'center',},
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 10 },

  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 16 },
  colorOptionsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  colorBlob: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  selectedBlob: { borderColor: '#333' },

  confirmButton: { padding: 10, borderRadius: 5, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  modalMessage: { fontSize: 16, textAlign: 'center', marginBottom: 12 },
});