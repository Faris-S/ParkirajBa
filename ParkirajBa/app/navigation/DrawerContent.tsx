import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

export default function DrawerContent(props: any) {
  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.header}>
        <Text style={styles.headerText}>ParkirajBa</Text>
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
  logoutContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
});
