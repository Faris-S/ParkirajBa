import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Text,
  Image,
  Button,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

const SPOT_TYPE_LABELS = {
  regular: 'Regular',
  ev: 'Electric Vehicle',
  disabled: 'Accessible',
  rideshare: 'Rideshare',
  motorcycle: 'Motorcycle',
  delivery: 'Delivery Zone',
  reserved: 'Reserved (In Use)'
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState({
    latitude: 43.8563,
    longitude: 18.4131,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [parkings, setParkings] = useState([]);
  const [selectedParking, setSelectedParking] = useState(null);
  const [selectedType, setSelectedType] = useState('regular');
  const [reservationTime, setReservationTime] = useState(new Date(Date.now() + 10 * 60000));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeReservation, setActiveReservation] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is needed.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  useEffect(() => {
    const fetchParkings = async () => {
      let q = collection(db, 'parkings');
      if (selectedCategory !== 'all') {
        q = query(q, where('type', '==', selectedCategory));
      }
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setParkings(data);
    };
    fetchParkings();
  }, [selectedCategory]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'reservations'), where('userId', '==', auth.currentUser.uid), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const active = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))[0];
      setActiveReservation(active || null);
      if (active && active.time) {
        const interval = setInterval(() => {
          const now = Date.now();
          const expiry = new Date(active.time.toDate()).getTime();
          const diff = expiry - now;

          if (diff <= 0) {
            clearInterval(interval);
            Alert.alert('Reservation Ended', 'Your reserved spot has been released. Thank you for booking with us.');
            cancelReservation(active.id);
          }
        }, 1000);
        return () => clearInterval(interval);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let timer;
    if (activeReservation && activeReservation.time) {
      timer = setInterval(() => {
        const diff = new Date(activeReservation.time.toDate()).getTime() - Date.now();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setCountdown(`${minutes}m ${seconds}s`);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeReservation]);

  const handleReserve = async () => {
    if (!auth.currentUser) return Alert.alert('Error', 'User not logged in.');

    const parkingRef = doc(db, 'parkings', selectedParking.id);

    try {
      await runTransaction(db, async (transaction) => {
        const parkingDoc = await transaction.get(parkingRef);
        if (!parkingDoc.exists()) {
          throw new Error('Parking spot does not exist');
        }

        const currentAvailable = parkingDoc.data().available;
        if (currentAvailable <= 0) {
          throw new Error('No available spots left');
        }

        transaction.update(parkingRef, {
          available: currentAvailable - 1,
        });

        transaction.set(doc(collection(db, 'reservations')), {
          userId: auth.currentUser.uid,
          parkingId: selectedParking.id,
          spotType: selectedType,
          time: reservationTime,
          status: 'active',
          createdAt: new Date(),
        });
      });

      Alert.alert('Success', 'Reservation confirmed.');
      setSelectedParking(null);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Could not complete reservation.');
    }
  };

  const cancelReservation = async (id) => {
    try {
      const reservationRef = doc(db, 'reservations', id);
      const reservationDoc = await getDoc(reservationRef);

      if (reservationDoc.exists()) {
        const { parkingId } = reservationDoc.data();
        const parkingRef = doc(db, 'parkings', parkingId);

        await runTransaction(db, async (transaction) => {
          const parkingDoc = await transaction.get(parkingRef);
          if (parkingDoc.exists()) {
            const available = parkingDoc.data().available || 0;
            transaction.update(parkingRef, { available: available + 1 });
          }
          transaction.delete(reservationRef);
        });
      }

      setActiveReservation(null);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to cancel reservation.');
    }
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <MapView style={styles.map} region={region} showsUserLocation showsMyLocationButton>
        {parkings.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={p.name}
            onPress={() => {
              if (!activeReservation) {
                setReservationTime(new Date(Date.now() + 10 * 60000));
                setSelectedType('regular');
                setSelectedParking(p);
              }
            }}
          />
        ))}
      </MapView>

      <TouchableOpacity style={styles.hamburger} onPress={() => navigation.toggleDrawer()}>
        <Ionicons name="menu" size={28} color="#000" />
      </TouchableOpacity>

      {activeReservation && (
        <View style={styles.activeReservationBar}>
          <Text style={styles.activeText}>Reserved: {parkings.find(p => p.id === activeReservation.parkingId)?.name || 'Parking'}</Text>
          <Text style={styles.activeText}>Time left: {countdown}</Text>
          <Button title="Cancel" onPress={() => cancelReservation(activeReservation.id)} color="red" />
        </View>
      )}

      <Modal isVisible={!!selectedParking} onBackdropPress={() => setSelectedParking(null)} style={styles.modal}>
        {selectedParking && !activeReservation && (
          <View style={styles.modalContent}>
            {selectedParking.photoUrl && (
              <Image source={{ uri: selectedParking.photoUrl }} style={styles.image} resizeMode="cover" />
            )}
            <Text style={styles.title}>{selectedParking.name}</Text>
            <Text style={styles.subtext}>{selectedParking.address || 'Address not available'}</Text>
            <Text style={styles.stat}>Available: {selectedParking.available} / {selectedParking.capacity}</Text>

            <Text style={styles.categoryTitle}>Categories:</Text>
            <ScrollView>
              {Object.entries(selectedParking.categoryCounts || {}).map(([category, count]) => (
                <Text key={category} style={styles.categoryItem}>
                  • {(SPOT_TYPE_LABELS[category] || category)}: {count}
                </Text>
              ))}
            </ScrollView>

            {selectedParking.available > 0 && (
              <>
                <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 12 }}>Reservation Details</Text>
                <Text style={{ fontWeight: 'bold', marginTop: 8 }}>Spot Type:</Text>
                <View style={{ borderWidth: 1, borderRadius: 6, marginVertical: 6 }}>
                  <Picker selectedValue={selectedType} onValueChange={(itemValue) => setSelectedType(itemValue)}>
                    {Object.keys(selectedParking.categoryCounts || {})
                      .filter(type => type !== 'reserved')
                      .map((type) => (
                        <Picker.Item key={type} label={SPOT_TYPE_LABELS[type] || type} value={type} />
                      ))}
                  </Picker>
                </View>

                <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Reservation Time:</Text>
                <TouchableOpacity
                  style={{ padding: 10, backgroundColor: '#eee', borderRadius: 5, marginTop: 4 }}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text>{reservationTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={reservationTime}
                    mode="time"
                    display="default"
                    is24Hour={true}
                    onChange={(event, date) => {
                      setShowTimePicker(false);
                      if (date) setReservationTime(date);
                    }}
                  />
                )}

                <View style={{ marginTop: 20 }}>
                  <Button title="Confirm Reservation" onPress={handleReserve} />
                </View>
              </>
            )}
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hamburger: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 50,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 10,
  },
  categoryPicker: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    width: 180,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 11,
  },
  modal: { justifyContent: 'flex-end', margin: 0 },
  modalContent: {
    height: '55%',
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  image: { width: '100%', height: 140, borderRadius: 10, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtext: { color: '#666', marginBottom: 6 },
  stat: { fontWeight: 'bold', marginTop: 4 },
  categoryTitle: { marginTop: 10, fontWeight: 'bold' },
  categoryItem: { fontSize: 14, marginLeft: 10, marginTop: 2 },
  activeReservationBar: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 10,
  },
  activeText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
});
