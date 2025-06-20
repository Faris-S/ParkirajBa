import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Picker } from '@react-native-picker/picker';

export default function DrawerContent(props: any) {
  const handleLogout = async () => {
    await signOut(auth);
  };

  const [selectedCategory, setSelectedCategory] = React.useState('all');

  React.useEffect(() => {
    if (props.setSelectedCategory) {
      props.setSelectedCategory(selectedCategory);
    }
  }, [selectedCategory]);

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.header}>
        <Text style={styles.headerText}>ParkirajBa</Text>
      </View>

      <View style={styles.filterSection}>
        <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Filter by Type:</Text>
        <Picker
          selectedValue={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value)}
        >a
          <Picker.Item label="All" value="all" />
          <Picker.Item label="Garage" value="garage" />
          <Picker.Item label="Parking Lot" value="parking_lot" />
          <Picker.Item label="Street Parking" value="street_parking" />
        </Picker>
      </View>

      <DrawerItemList {...props} />

      <View style={styles.logoutContainer}>
        <Button title="Logout" color="red" onPress={handleLogout} />
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterSection: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  logoutContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
});
